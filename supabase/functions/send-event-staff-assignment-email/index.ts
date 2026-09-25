import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

function normalizeValue(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function escapeHtml(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "TBA";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    },
  ).format(date);
}

Deno.serve(
  async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(
        "ok",
        {
          headers: corsHeaders,
        },
      );
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
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        );

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
       * AUTHENTICATE CALLER
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

      const userClient =
        createClient(
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

      const adminClient =
        createClient(
          SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY,
        );

      const {
        data: { user },
        error: userError,
      } =
        await userClient.auth.getUser();

      if (
        userError ||
        !user
      ) {
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
      const body =
        await req
          .json()
          .catch(() => null);

      const assignmentId =
        String(
          body?.assignmentId ?? "",
        ).trim();

      if (!assignmentId) {
        return jsonResponse(
          {
            error:
              "assignmentId is required.",
          },
          400,
        );
      }

      /*
       * VERIFY MUNICIPAL ADMIN
       */
      const {
        data: caller,
        error: callerError,
      } =
        await adminClient
          .from("profiles")
          .select(
            `
              id,
              role,
              municipality,
              verification_status
            `,
          )
          .eq("id", user.id)
          .maybeSingle();

      if (
        callerError ||
        !caller
      ) {
        return jsonResponse(
          {
            error:
              "Caller profile not found.",
          },
          403,
        );
      }

      if (
        normalizeValue(caller.role) !==
          "municipal_admin" ||
        normalizeValue(
          caller.verification_status,
        ) !== "approved"
      ) {
        return jsonResponse(
          {
            error:
              "Only approved Municipal Administrators can send Event Staff assignment emails.",
          },
          403,
        );
      }

      /*
       * LOAD STAFF ASSIGNMENT
       */
      const {
        data: assignment,
        error: assignmentError,
      } =
        await adminClient
          .from(
            "event_staff_assignments",
          )
          .select(
            `
              id,
              event_municipality_id,
              staff_id,
              status,
              assigned_at
            `,
          )
          .eq("id", assignmentId)
          .maybeSingle();

      if (
        assignmentError ||
        !assignment
      ) {
        return jsonResponse(
          {
            error:
              "Event Staff assignment not found.",
          },
          404,
        );
      }

      if (
        normalizeValue(
          assignment.status,
        ) !== "active"
      ) {
        return jsonResponse(
          {
            error:
              "Only an active Event Staff assignment can be emailed.",
          },
          409,
        );
      }

      /*
       * LOAD MUNICIPAL EVENT AND STAFF
       */
      const [
        municipalEventResult,
        staffResult,
      ] =
        await Promise.all([
          adminClient
            .from(
              "event_municipalities",
            )
            .select(
              `
                id,
                event_id,
                municipality,
                municipal_status,
                local_venue_id,
                local_instructions
              `,
            )
            .eq(
              "id",
              assignment.event_municipality_id,
            )
            .maybeSingle(),

          adminClient
            .from("profiles")
            .select(
              `
                id,
                full_name,
                email,
                role,
                verification_status,
                municipality
              `,
            )
            .eq(
              "id",
              assignment.staff_id,
            )
            .maybeSingle(),
        ]);

      const municipalEvent =
        municipalEventResult.data;

      const staff =
        staffResult.data;

      if (
        municipalEventResult.error ||
        !municipalEvent
      ) {
        return jsonResponse(
          {
            error:
              "Municipal event not found.",
          },
          404,
        );
      }

      if (
        staffResult.error ||
        !staff
      ) {
        return jsonResponse(
          {
            error:
              "Event Staff profile not found.",
          },
          404,
        );
      }

      /*
       * VERIFY SAME MUNICIPALITY
       */
      const callerMunicipality =
        normalizeValue(
          caller.municipality,
        );

      const eventMunicipality =
        normalizeValue(
          municipalEvent.municipality,
        );

      const staffMunicipality =
        normalizeValue(
          staff.municipality,
        );

      if (
        !callerMunicipality ||
        callerMunicipality !==
          eventMunicipality ||
        staffMunicipality !==
          eventMunicipality
      ) {
        return jsonResponse(
          {
            error:
              "The administrator, event, and Event Staff must belong to the same municipality.",
          },
          403,
        );
      }

      if (
        normalizeValue(staff.role) !==
          "event_staff" ||
        normalizeValue(
          staff.verification_status,
        ) !== "approved"
      ) {
        return jsonResponse(
          {
            error:
              "The assigned Event Staff account is not approved.",
          },
          409,
        );
      }

      const recipientEmail =
        String(
          staff.email ?? "",
        ).trim();

      if (!recipientEmail) {
        return jsonResponse(
          {
            error:
              "The assigned Event Staff account has no email address.",
          },
          409,
        );
      }

      if (
        normalizeValue(
          municipalEvent.municipal_status,
        ) !== "prepared"
      ) {
        return jsonResponse(
          {
            error:
              "The municipal event must be Prepared before emailing Event Staff.",
          },
          409,
        );
      }

      /*
       * LOAD EVENT DETAILS
       */
      const {
        data: event,
        error: eventError,
      } =
        await adminClient
          .from("events")
          .select(
            `
              id,
              title,
              description,
              start_at,
              end_at,
              status
            `,
          )
          .eq(
            "id",
            municipalEvent.event_id,
          )
          .maybeSingle();

      if (
        eventError ||
        !event
      ) {
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
              `Event Staff email cannot be sent while event status is "${eventStatus}".`,
          },
          409,
        );
      }

      /*
       * LOAD LOCAL VENUE
       */
      let venueName =
        "To be announced";

      if (
        municipalEvent.local_venue_id
      ) {
        const {
          data: venue,
        } =
          await adminClient
            .from("venues")
            .select("venue_name")
            .eq(
              "id",
              municipalEvent.local_venue_id,
            )
            .maybeSingle();

        if (venue?.venue_name) {
          venueName =
            venue.venue_name;
        }
      }

      /*
       * DELIVERY TRACKING KEY
       *
       * The assignment timestamp makes each
       * assignment cycle unique.
       */
      const notificationType =
        "event_staff_assigned";

      const notificationKey =
        `assigned:${assignment.assigned_at}`;

      const {
        data: existingDelivery,
        error:
          existingDeliveryError,
      } =
        await adminClient
          .from(
            "staff_email_deliveries",
          )
          .select("id, status")
          .eq(
            "event_staff_assignment_id",
            assignment.id,
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
        throw existingDeliveryError;
      }

      /*
       * DO NOT SEND DUPLICATE EMAIL
       */
      if (
        existingDelivery?.status ===
          "sent"
      ) {
        return jsonResponse({
          message:
            "Event Staff was already notified for this assignment.",

          provider: "brevo",

          sent: 0,

          failed: 0,

          skippedAlreadySent: 1,

          recipientEmail,
        });
      }

      if (
        existingDelivery?.status ===
          "pending"
      ) {
        return jsonResponse({
          message:
            "Event Staff email delivery is already in progress.",

          provider: "brevo",

          sent: 0,

          failed: 0,

          skippedInProgress: 1,

          recipientEmail,
        });
      }

      let deliveryId:
        string | null =
          existingDelivery?.id ??
          null;

      const now =
        new Date().toISOString();

      /*
       * RETRY PREVIOUSLY FAILED DELIVERY
       */
      if (
        deliveryId &&
        existingDelivery?.status ===
          "failed"
      ) {
        const {
          error: resetError,
        } =
          await adminClient
            .from(
              "staff_email_deliveries",
            )
            .update({
              recipient_email:
                recipientEmail,

              provider: "brevo",

              status: "pending",

              provider_message_id:
                null,

              last_error: null,

              sent_at: null,

              updated_at: now,
            })
            .eq("id", deliveryId);

        if (resetError) {
          throw resetError;
        }
      }

      /*
       * RESERVE FIRST DELIVERY
       */
      if (!deliveryId) {
        const {
          data: insertedDelivery,
          error: insertError,
        } =
          await adminClient
            .from(
              "staff_email_deliveries",
            )
            .insert({
              event_staff_assignment_id:
                assignment.id,

              event_municipality_id:
                municipalEvent.id,

              staff_id:
                staff.id,

              notification_type:
                notificationType,

              notification_key:
                notificationKey,

              recipient_email:
                recipientEmail,

              provider: "brevo",

              status: "pending",

              updated_at: now,
            })
            .select("id")
            .single();

        if (insertError) {
          if (
            insertError.code ===
            "23505"
          ) {
            return jsonResponse({
              message:
                "Event Staff email delivery is already reserved.",

              provider: "brevo",

              sent: 0,

              failed: 0,

              skippedInProgress: 1,

              recipientEmail,
            });
          }

          throw insertError;
        }

        deliveryId =
          insertedDelivery.id;
      }

      /*
       * EMAIL CONTENT
       */
      const staffName =
        String(
          staff.full_name ?? "",
        ).trim() ||
        "Event Staff";

      const localInstructions =
        String(
          municipalEvent
            .local_instructions ??
            "",
        ).trim() ||
        "Please coordinate with your Municipal Administrator for additional instructions.";

      const staffDashboardUrl =
        APP_URL
          ? `${APP_URL.replace(
              /\/$/,
              "",
            )}/dashboard/staff`
          : "";

      const subject =
        `Event Staff Assignment: ${event.title}`;

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
              background: #0f766e;
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
              You Have Been Assigned as Event Staff
            </h1>
          </div>

          <div
            style="
              border: 1px solid #ccfbf1;
              border-top: none;
              padding: 24px;
              border-radius: 0 0 14px 14px;
            "
          >
            <p>
              Hello ${escapeHtml(
                staffName,
              )},
            </p>

            <p
              style="
                line-height: 1.7;
              "
            >
              Your Municipal Administrator has assigned you as
              Event Staff for the following event.
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
              <h2
                style="
                  margin-top: 0;
                "
              >
                ${escapeHtml(
                  event.title,
                )}
              </h2>

              <p>
                <strong>
                  Municipality:
                </strong>

                ${escapeHtml(
                  municipalEvent.municipality,
                )}
              </p>

              <p>
                <strong>
                  Local Venue:
                </strong>

                ${escapeHtml(
                  venueName,
                )}
              </p>

              <p>
                <strong>
                  Starts:
                </strong>

                ${escapeHtml(
                  formatDateTime(
                    event.start_at,
                  ),
                )}
              </p>

              <p>
                <strong>
                  Ends:
                </strong>

                ${escapeHtml(
                  formatDateTime(
                    event.end_at,
                  ),
                )}
              </p>

              <div
                style="
                  margin-top: 18px;
                "
              >
                <strong>
                  Local Instructions:
                </strong>

                <p
                  style="
                    line-height: 1.7;
                    white-space: pre-wrap;
                  "
                >
                  ${escapeHtml(
                    localInstructions,
                  )}
                </p>
              </div>

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

            <div
              style="
                margin: 20px 0;
                padding: 16px;
                border-radius: 10px;
                background: #ecfeff;
              "
            >
              <strong>
                What to do next:
              </strong>

              <p
                style="
                  margin-bottom: 0;
                  line-height: 1.7;
                "
              >
                Open your Event Staff dashboard, select this assigned
                event, and review the attendance check-in controls
                before the event starts.
              </p>
            </div>

            ${
              staffDashboardUrl
                ? `
                  <a
                    href="${escapeHtml(
                      staffDashboardUrl,
                    )}"
                    style="
                      display: inline-block;
                      background: #0f766e;
                      color: white;
                      text-decoration: none;
                      font-weight: 700;
                      padding: 12px 18px;
                      border-radius: 10px;
                    "
                  >
                    Open Event Staff Dashboard
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
              This notification was sent by PagTipon.
            </p>
          </div>
        </div>
      `;

      /*
       * SEND EMAIL THROUGH BREVO
       */
      const brevoResponse =
        await fetch(
          "https://api.brevo.com/v3/smtp/email",
          {
            method: "POST",

            headers: {
              "api-key":
                BREVO_API_KEY,

              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                sender: {
                  email:
                    BREVO_SENDER_EMAIL,

                  name:
                    BREVO_SENDER_NAME,
                },

                to: [
                  {
                    email:
                      recipientEmail,

                    name:
                      staffName,
                  },
                ],

                subject,

                htmlContent:
                  html,
              }),
          },
        );

      const brevoResult =
        await brevoResponse
          .json()
          .catch(() => null);

      /*
       * FAILED DELIVERY
       */
      if (!brevoResponse.ok) {
        const errorMessage =
          brevoResult?.message ||
          brevoResult?.code ||
          "Email delivery failed.";

        await adminClient
          .from(
            "staff_email_deliveries",
          )
          .update({
            status: "failed",

            provider: "brevo",

            provider_message_id:
              null,

            last_error:
              errorMessage,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq("id", deliveryId);

        return jsonResponse(
          {
            message:
              "Event Staff was assigned, but the email could not be sent.",

            provider: "brevo",

            sent: 0,

            failed: 1,

            recipientEmail,

            error:
              errorMessage,
          },
          502,
        );
      }

      /*
       * SUCCESSFUL DELIVERY
       */
      const completedAt =
        new Date().toISOString();

      const {
        error:
          deliveryUpdateError,
      } =
        await adminClient
          .from(
            "staff_email_deliveries",
          )
          .update({
            status: "sent",

            provider: "brevo",

            provider_message_id:
              brevoResult
                ?.messageId ??
              null,

            last_error: null,

            sent_at:
              completedAt,

            updated_at:
              completedAt,
          })
          .eq("id", deliveryId);

      if (deliveryUpdateError) {
        console.error(
          "Staff delivery tracking update error:",
          deliveryUpdateError,
        );

        return jsonResponse(
          {
            message:
              "Email was accepted by Brevo, but delivery tracking could not be updated.",

            provider: "brevo",

            sent: 1,

            failed: 0,

            trackingFailed: true,

            recipientEmail,

            providerMessageId:
              brevoResult
                ?.messageId ??
              null,
          },
          500,
        );
      }

      return jsonResponse({
        message:
          "Event Staff assignment email was sent.",

        notificationType,

        notificationKey,

        provider: "brevo",

        sent: 1,

        failed: 0,

        skippedAlreadySent: 0,

        recipientEmail,

        providerMessageId:
          brevoResult
            ?.messageId ??
          null,

        assignmentId:
          assignment.id,

        eventMunicipalityId:
          municipalEvent.id,

        eventTitle:
          event.title,
      });
    } catch (error) {
      console.error(
        "send-event-staff-assignment-email error:",
        error,
      );

      return jsonResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected Event Staff email error.",
        },
        500,
      );
    }
  },
);