import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type NotificationType =
  | "registration_open"
  | "local_instructions_updated"
  | "venue_updated";

type Recipient = {
  id: string;
  full_name: string | null;
  email: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeValue(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeInstructions(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "TBA";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes,
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed.",
      },
      405,
    );
  }

  try {
    /*
     * ENVIRONMENT VARIABLES
     */
    const BREVO_API_KEY =
      Deno.env.get("BREVO_API_KEY");

    const BREVO_SENDER_EMAIL =
      Deno.env.get("BREVO_SENDER_EMAIL");

    const BREVO_SENDER_NAME =
      Deno.env.get("BREVO_SENDER_NAME");

    const APP_URL =
      Deno.env.get("APP_URL") ?? "";

    const SUPABASE_URL =
      Deno.env.get("SUPABASE_URL");

    const SUPABASE_ANON_KEY =
      Deno.env.get("SUPABASE_ANON_KEY");

    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (
      !BREVO_API_KEY ||
      !BREVO_SENDER_EMAIL ||
      !BREVO_SENDER_NAME ||
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return jsonResponse(
        {
          error:
            "Missing required environment variables.",
        },
        500,
      );
    }

    /*
     * AUTHORIZATION
     */
    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          error:
            "Missing authorization header.",
        },
        401,
      );
    }

    const userClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const adminClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          error: "Unauthorized user.",
        },
        401,
      );
    }

    /*
     * REQUEST BODY
     */
    const body = await req.json();

    const eventMunicipalityId = String(
      body?.eventMunicipalityId ?? "",
    ).trim();

    const notificationType = String(
      body?.notificationType ??
        "registration_open",
    ).trim() as NotificationType;

    if (!eventMunicipalityId) {
      return jsonResponse(
        {
          error:
            "eventMunicipalityId is required.",
        },
        400,
      );
    }

    if (
      notificationType !== "registration_open" &&
      notificationType !==
        "local_instructions_updated" &&
      notificationType !== "venue_updated"
    ) {
      return jsonResponse(
        {
          error:
            "Unsupported notification type.",
        },
        400,
      );
    }

    /*
     * VERIFY MUNICIPAL ADMIN
     */
    const {
      data: callerProfile,
      error: callerProfileError,
    } = await adminClient
      .from("profiles")
      .select(`
        id,
        role,
        municipality,
        verification_status
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (callerProfileError || !callerProfile) {
      return jsonResponse(
        {
          error:
            "Caller profile not found.",
        },
        403,
      );
    }

    if (
      normalizeValue(callerProfile.role) !==
        "municipal_admin" ||
      normalizeValue(
        callerProfile.verification_status,
      ) !== "approved"
    ) {
      return jsonResponse(
        {
          error:
            "Only approved Municipal Administrators can send participant event emails.",
        },
        403,
      );
    }

    /*
     * LOAD MUNICIPAL ASSIGNMENT
     */
    const {
      data: assignment,
      error: assignmentError,
    } = await adminClient
      .from("event_municipalities")
      .select(`
        id,
        event_id,
        municipality,
        municipal_status,
        preparation_status,
        registration_open,
        local_venue_id,
        local_instructions
      `)
      .eq("id", eventMunicipalityId)
      .maybeSingle();

    if (assignmentError || !assignment) {
      return jsonResponse(
        {
          error:
            "Municipal event assignment not found.",
        },
        404,
      );
    }

    /*
     * Municipal Admin may only send email
     * for their own municipality.
     */
    if (
      normalizeValue(
        callerProfile.municipality,
      ) !==
      normalizeValue(assignment.municipality)
    ) {
      return jsonResponse(
        {
          error:
            "You cannot send participant emails for another municipality.",
        },
        403,
      );
    }

    if (
      normalizeValue(
        assignment.municipal_status,
      ) !== "prepared"
    ) {
      return jsonResponse(
        {
          error:
            "The event must be Prepared before participant email notifications can be sent.",
        },
        409,
      );
    }

    /*
     * Registration notification requires
     * registration to be open.
     */
    if (
      notificationType ===
        "registration_open" &&
      assignment.registration_open !== true
    ) {
      return jsonResponse(
        {
          error:
            "Registration is not currently open.",
        },
        409,
      );
    }

    const currentInstructions =
      normalizeInstructions(
        assignment.local_instructions,
      );

    if (
      notificationType ===
        "local_instructions_updated" &&
      !currentInstructions
    ) {
      return jsonResponse(
        {
          error:
            "Local instructions are empty.",
        },
        409,
      );
    }

    if (
      notificationType === "venue_updated" &&
      !assignment.local_venue_id
    ) {
      return jsonResponse(
        {
          error:
            "A local venue must be assigned before a venue-update email can be sent.",
        },
        409,
      );
    }

    /*
     * LOAD EVENT
     */
    const {
      data: event,
      error: eventError,
    } = await adminClient
      .from("events")
      .select(`
        id,
        title,
        description,
        start_at,
        end_at,
        status
      `)
      .eq("id", assignment.event_id)
      .maybeSingle();

    if (eventError || !event) {
      return jsonResponse(
        {
          error:
            "Provincial event not found.",
        },
        404,
      );
    }

    const eventStatus =
      normalizeValue(event.status);

    if (
      eventStatus !== "published" &&
      eventStatus !== "upcoming"
    ) {
      return jsonResponse(
        {
          error:
            `Participant email cannot be sent while event status is "${eventStatus}".`,
        },
        409,
      );
    }

    /*
     * LOAD VENUE
     */
    let venueName = "To be announced";

    if (assignment.local_venue_id) {
      const { data: venue } = await adminClient
        .from("venues")
        .select("venue_name")
        .eq(
          "id",
          assignment.local_venue_id,
        )
        .maybeSingle();

      if (venue?.venue_name) {
        venueName = venue.venue_name;
      }
    }

    /*
     * BUILD RECIPIENT LIST
     */
    let recipients: Recipient[] = [];

    /*
     * REGISTRATION OPEN:
     * All approved participants from the
     * same municipality.
     */
    if (
      notificationType ===
      "registration_open"
    ) {
      const {
        data: participantRows,
        error: participantsError,
      } = await adminClient
        .from("profiles")
        .select(`
          id,
          full_name,
          email
        `)
        .eq("role", "participant")
        .eq(
          "verification_status",
          "approved",
        )
        .eq(
          "municipality",
          assignment.municipality,
        )
        .not("email", "is", null);

      if (participantsError) {
        return jsonResponse(
          {
            error:
              participantsError.message,
          },
          500,
        );
      }

      recipients = (
        participantRows ?? []
      ).flatMap((participant) => {
        const id = String(
          participant.id ?? "",
        ).trim();

        const email = String(
          participant.email ?? "",
        )
          .trim()
          .toLowerCase();

        if (!id || !email) {
          return [];
        }

        return [
          {
            id,
            full_name:
              participant.full_name ?? null,
            email,
          },
        ];
      });
    }

    /*
     * INSTRUCTIONS OR VENUE UPDATE:
     * Registered participants only.
     */
    if (
      notificationType ===
        "local_instructions_updated" ||
      notificationType === "venue_updated"
    ) {
      const {
        data: rsvpRows,
        error: rsvpError,
      } = await adminClient
        .from("rsvps")
        .select("user_id")
        .eq(
          "event_municipality_id",
          assignment.id,
        )
        .eq("status", "registered");

      if (rsvpError) {
        return jsonResponse(
          {
            error: rsvpError.message,
          },
          500,
        );
      }

      const participantIds = Array.from(
        new Set(
          (rsvpRows ?? [])
            .map((row) =>
              String(
                row.user_id ?? "",
              ).trim(),
            )
            .filter(Boolean),
        ),
      );

      if (participantIds.length > 0) {
        const {
          data: participantRows,
          error: participantsError,
        } = await adminClient
          .from("profiles")
          .select(`
            id,
            full_name,
            email
          `)
          .in("id", participantIds)
          .eq("role", "participant")
          .eq(
            "verification_status",
            "approved",
          )
          .eq(
            "municipality",
            assignment.municipality,
          )
          .not("email", "is", null);

        if (participantsError) {
          return jsonResponse(
            {
              error:
                participantsError.message,
            },
            500,
          );
        }

        recipients = (
          participantRows ?? []
        ).flatMap((participant) => {
          const id = String(
            participant.id ?? "",
          ).trim();

          const email = String(
            participant.email ?? "",
          )
            .trim()
            .toLowerCase();

          if (!id || !email) {
            return [];
          }

          return [
            {
              id,
              full_name:
                participant.full_name ??
                null,
              email,
            },
          ];
        });
      }
    }

    /*
     * DEDUPLICATE RECIPIENTS
     */
    const recipientMap = new Map<
      string,
      Recipient
    >();

    for (const recipient of recipients) {
      if (
        !recipientMap.has(recipient.id)
      ) {
        recipientMap.set(
          recipient.id,
          recipient,
        );
      }
    }

    recipients = Array.from(
      recipientMap.values(),
    );

    /*
     * BUILD NOTIFICATION KEY
     */
    let notificationKey =
      "registration_open";

    if (
      notificationType ===
      "local_instructions_updated"
    ) {
      const instructionsHash =
        await sha256Hex(
          currentInstructions,
        );

      notificationKey =
        `local_instructions:${instructionsHash}`;
    }

    if (
      notificationType ===
      "venue_updated"
    ) {
      notificationKey =
        `venue:${assignment.local_venue_id}`;
    }

    if (recipients.length === 0) {
      return jsonResponse({
        message:
          notificationType ===
          "registration_open"
            ? "No approved participants with email addresses were found."
            : "No registered participants with email addresses were found for this event.",

        notificationType,
        notificationKey,
        provider: "brevo",
        municipality:
          assignment.municipality,
        totalRecipients: 0,
        attempted: 0,
        sent: 0,
        skippedAlreadySent: 0,
        skippedInProgress: 0,
        failed: [],
      });
    }

    const participantEventsUrl = APP_URL
      ? `${APP_URL.replace(
          /\/$/,
          "",
        )}/dashboard/participant/events`
      : "";

    let sent = 0;
    let attempted = 0;
    let skippedAlreadySent = 0;
    let skippedInProgress = 0;

    const failed: string[] = [];

    /*
     * PROCESS EACH PARTICIPANT
     */
    for (const recipient of recipients) {
      /*
       * CHECK EXISTING DELIVERY
       */
      const {
        data: existingDelivery,
        error: existingDeliveryError,
      } = await adminClient
        .from(
          "email_notification_deliveries",
        )
        .select(`
          id,
          status
        `)
        .eq(
          "event_municipality_id",
          assignment.id,
        )
        .eq(
          "participant_id",
          recipient.id,
        )
        .eq(
          "notification_type",
          notificationType,
        )
        .eq(
          "notification_key",
          notificationKey,
        )
        .maybeSingle();

      if (existingDeliveryError) {
        failed.push(
          `${recipient.email}: ${existingDeliveryError.message}`,
        );

        continue;
      }

      /*
       * Already successfully sent.
       */
      if (
        existingDelivery?.status === "sent"
      ) {
        skippedAlreadySent += 1;
        continue;
      }

      /*
       * Another request may already be
       * processing this delivery.
       */
      if (
        existingDelivery?.status ===
        "pending"
      ) {
        skippedInProgress += 1;
        continue;
      }

      let deliveryId: string | null =
        existingDelivery?.id ?? null;

      /*
       * RETRY FAILED DELIVERY
       */
      if (
        deliveryId &&
        existingDelivery?.status ===
          "failed"
      ) {
        const { error: resetError } =
          await adminClient
            .from(
              "email_notification_deliveries",
            )
            .update({
              status: "pending",
              provider: "brevo",
              provider_message_id: null,
              recipient_email:
                recipient.email,
              last_error: null,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", deliveryId);

        if (resetError) {
          failed.push(
            `${recipient.email}: ${resetError.message}`,
          );

          continue;
        }
      }

      /*
       * FIRST DELIVERY ATTEMPT
       */
      if (!deliveryId) {
        const {
          data: insertedDelivery,
          error: insertError,
        } = await adminClient
          .from(
            "email_notification_deliveries",
          )
          .insert({
            event_municipality_id:
              assignment.id,
            participant_id:
              recipient.id,
            notification_type:
              notificationType,
            notification_key:
              notificationKey,
            recipient_email:
              recipient.email,
            status: "pending",
            provider: "brevo",
            updated_at:
              new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError) {
          /*
           * Another request already reserved
           * this notification.
           */
          if (
            insertError.code === "23505"
          ) {
            skippedInProgress += 1;
            continue;
          }

          failed.push(
            `${recipient.email}: ${insertError.message}`,
          );

          continue;
        }

        deliveryId =
          insertedDelivery.id;
      }

      attempted += 1;

      const participantName =
        recipient.full_name?.trim() ||
        "Participant";

      let subject = "";
      let heading = "";
      let intro = "";

      if (
        notificationType ===
        "registration_open"
      ) {
        subject =
          `Registration Open: ${event.title}`;

        heading =
          "Event Registration Is Now Open";

        intro =
          `Registration is now open for a PagTipon event assigned to ${assignment.municipality}.`;
      } else if (
        notificationType ===
        "local_instructions_updated"
      ) {
        subject =
          `Event Instructions Updated: ${event.title}`;

        heading =
          "Local Instructions Updated";

        intro =
          "The local instructions for an event you registered for have been updated.";
      } else {
        subject =
          `Event Venue Updated: ${event.title}`;

        heading =
          "Event Venue Updated";

        intro =
          "The local venue for an event you registered for has been updated.";
      }

      /*
       * EMAIL TEMPLATE
       */
      const html = `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 640px;
            margin: 0 auto;
            color: #0f172a;
          "
        >
          <div
            style="
              background: #047857;
              color: white;
              padding: 22px 24px;
              border-radius: 14px 14px 0 0;
            "
          >
            <div
              style="
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                opacity: 0.85;
              "
            >
              PagTipon
            </div>

            <h1
              style="
                margin: 8px 0 0;
                font-size: 22px;
              "
            >
              ${escapeHtml(heading)}
            </h1>
          </div>

          <div
            style="
              border: 1px solid #d1fae5;
              border-top: none;
              padding: 24px;
              border-radius: 0 0 14px 14px;
            "
          >
            <p>
              Hello ${escapeHtml(
                participantName,
              )},
            </p>

            <p style="line-height: 1.7;">
              ${escapeHtml(intro)}
            </p>

            <div
              style="
                margin: 24px 0;
                padding: 20px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                background: #f8fafc;
              "
            >
              <h2>
                ${escapeHtml(event.title)}
              </h2>

              <p>
                <strong>
                  Municipality:
                </strong>

                ${escapeHtml(
                  assignment.municipality,
                )}
              </p>

              <p>
                <strong>
                  ${
                    notificationType ===
                    "venue_updated"
                      ? "Updated Local Venue:"
                      : "Local Venue:"
                  }
                </strong>

                ${escapeHtml(venueName)}
              </p>

              <p>
                <strong>Starts:</strong>

                ${escapeHtml(
                  formatDateTime(
                    event.start_at,
                  ),
                )}
              </p>

              <p>
                <strong>Ends:</strong>

                ${escapeHtml(
                  formatDateTime(
                    event.end_at,
                  ),
                )}
              </p>

              ${
                currentInstructions
                  ? `
                    <div
                      style="
                        margin-top: 18px;
                      "
                    >
                      <strong>
                        ${
                          notificationType ===
                          "local_instructions_updated"
                            ? "Updated Local Instructions:"
                            : "Local Instructions:"
                        }
                      </strong>

                      <p
                        style="
                          line-height: 1.7;
                          white-space: pre-wrap;
                        "
                      >
                        ${escapeHtml(
                          currentInstructions,
                        )}
                      </p>
                    </div>
                  `
                  : ""
              }

              ${
                event.description
                  ? `
                    <div
                      style="
                        margin-top: 18px;
                      "
                    >
                      <strong>
                        Event Description:
                      </strong>

                      <p
                        style="
                          line-height: 1.7;
                          white-space: pre-wrap;
                        "
                      >
                        ${escapeHtml(
                          event.description,
                        )}
                      </p>
                    </div>
                  `
                  : ""
              }
            </div>

            ${
              participantEventsUrl
                ? `
                  <a
                    href="${escapeHtml(
                      participantEventsUrl,
                    )}"
                    style="
                      display: inline-block;
                      background: #047857;
                      color: white;
                      text-decoration: none;
                      font-weight: 700;
                      padding: 12px 18px;
                      border-radius: 10px;
                    "
                  >
                    ${
                      notificationType ===
                      "registration_open"
                        ? "Register for Event"
                        : "View Event"
                    }
                  </a>
                `
                : ""
            }

            <p
              style="
                margin-top: 30px;
                color: #64748b;
                font-size: 12px;
                line-height: 1.6;
              "
            >
              This notification was sent by
              PagTipon.
            </p>
          </div>
        </div>
      `;

      /*
       * SEND THROUGH BREVO
       */
      const response = await fetch(
        "https://api.brevo.com/v3/smtp/email",
        {
          method: "POST",
          headers: {
            "api-key": BREVO_API_KEY,
            Accept: "application/json",
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            sender: {
              email:
                BREVO_SENDER_EMAIL,
              name:
                BREVO_SENDER_NAME,
            },
            to: [
              {
                email: recipient.email,
                name: participantName,
              },
            ],
            subject,
            htmlContent: html,
          }),
        },
      );

      const brevoResult =
        await response
          .json()
          .catch(() => null);

      /*
       * FAILED DELIVERY
       */
      if (!response.ok) {
        const errorMessage =
          brevoResult?.message ||
          brevoResult?.code ||
          "Email delivery failed.";

        failed.push(
          `${recipient.email}: ${errorMessage}`,
        );

        await adminClient
          .from(
            "email_notification_deliveries",
          )
          .update({
            status: "failed",
            provider: "brevo",
            provider_message_id: null,
            last_error: errorMessage,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", deliveryId);

        continue;
      }

      /*
       * SUCCESSFUL DELIVERY
       */
      await adminClient
        .from(
          "email_notification_deliveries",
        )
        .update({
          status: "sent",
          provider: "brevo",
          provider_message_id:
            brevoResult?.messageId ??
            null,
          last_error: null,
          sent_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", deliveryId);

      sent += 1;
    }

    return jsonResponse({
      message:
        "Participant email notification process completed.",

      notificationType,
      notificationKey,

      eventMunicipalityId:
        assignment.id,

      eventId: event.id,
      eventTitle: event.title,
      provider: "brevo",

      municipality:
        assignment.municipality,

      totalRecipients:
        recipients.length,

      attempted,
      sent,
      skippedAlreadySent,
      skippedInProgress,
      failed,
    });
  } catch (error) {
    console.error(
      "send-participant-event-email error:",
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500,
    );
  }
});