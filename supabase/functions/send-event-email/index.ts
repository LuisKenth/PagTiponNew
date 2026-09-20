import { createClient } from "@supabase/supabase-js";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (
  body: unknown,
  status = 200,
) => {
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
};

const escapeHtml = (
  value: string | null | undefined,
) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const normalizeValue = (
  value: string | null | undefined,
) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const formatDateTime = (
  value: string | null | undefined,
) => {
  if (!value) {
    return "TBA";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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
};

Deno.serve(async (req: Request) => {
  /*
   * =========================================================
   * CORS
   * =========================================================
   */

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
     * =========================================================
     * ENVIRONMENT VARIABLES
     * =========================================================
     */

    const BREVO_API_KEY =
      Deno.env.get(
        "BREVO_API_KEY",
      );

    const BREVO_SENDER_EMAIL =
      Deno.env.get(
        "BREVO_SENDER_EMAIL",
      );

    const BREVO_SENDER_NAME =
      Deno.env.get(
        "BREVO_SENDER_NAME",
      );

    const APP_URL =
      Deno.env.get(
        "APP_URL",
      ) ?? "";

    const SUPABASE_URL =
      Deno.env.get(
        "SUPABASE_URL",
      );

    const SUPABASE_ANON_KEY =
      Deno.env.get(
        "SUPABASE_ANON_KEY",
      );

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
     * =========================================================
     * VERIFY AUTHORIZATION HEADER
     * =========================================================
     */

    const authHeader =
      req.headers.get(
        "Authorization",
      );

    if (!authHeader) {
      return jsonResponse(
        {
          error:
            "Missing authorization header.",
        },
        401,
      );
    }

    /*
     * Logged-in user client.
     */
    const userClient =
      createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization:
                authHeader,
            },
          },
        },
      );

    /*
     * Server-only admin client.
     */
    const adminClient =
      createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
      );

    /*
     * =========================================================
     * VERIFY LOGGED-IN USER
     * =========================================================
     */

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await userClient.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonResponse(
        {
          error:
            "Unauthorized user.",
        },
        401,
      );
    }

    /*
     * =========================================================
     * REQUEST BODY
     * =========================================================
     */

    const body =
      await req.json();

    const eventId =
      String(
        body?.eventId ?? "",
      ).trim();

    const notificationType =
      String(
        body?.notificationType ??
          "event_published",
      ).trim();

    if (!eventId) {
      return jsonResponse(
        {
          error:
            "eventId is required.",
        },
        400,
      );
    }

    const isCancellation =
      notificationType ===
      "event_cancelled";

    if (
      notificationType !==
        "event_published" &&
      !isCancellation
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
     * =========================================================
     * VERIFY CALLER PROFILE
     * =========================================================
     */

    const {
      data:
        callerProfile,

      error:
        callerProfileError,
    } =
      await adminClient
        .from(
          "profiles",
        )
        .select(
          `
            id,
            role,
            verification_status
          `,
        )
        .eq(
          "id",
          user.id,
        )
        .maybeSingle();

    if (
      callerProfileError ||
      !callerProfile
    ) {
      return jsonResponse(
        {
          error:
            "Caller profile not found.",
        },
        403,
      );
    }

    const callerRole =
      normalizeValue(
        callerProfile.role,
      );

    const callerVerificationStatus =
      normalizeValue(
        callerProfile
          .verification_status,
      );

    if (
      callerRole !==
        "provincial_admin" ||
      callerVerificationStatus !==
        "approved"
    ) {
      return jsonResponse(
        {
          error:
            "Only approved provincial administrators can send event emails.",
        },
        403,
      );
    }

    /*
     * =========================================================
     * LOAD EVENT
     * =========================================================
     */

    const {
      data:
        event,

      error:
        eventError,
    } =
      await adminClient
        .from(
          "events",
        )
        .select(
          `
            id,
            title,
            description,
            start_at,
            end_at,
            status,
            memo_url,
            memo_filename
          `,
        )
        .eq(
          "id",
          eventId,
        )
        .maybeSingle();

    if (
      eventError ||
      !event
    ) {
      return jsonResponse(
        {
          error:
            "Event not found.",
        },
        404,
      );
    }

    const eventStatus =
      normalizeValue(
        event.status,
      );

    const validEventStatus =
      isCancellation
        ? eventStatus ===
          "cancelled"
        : eventStatus ===
            "published" ||
          eventStatus ===
            "upcoming";

    if (!validEventStatus) {
      return jsonResponse(
        {
          error:
            `${
              isCancellation
                ? "Event cancellation"
                : "Event publication"
            } email cannot be sent while event status is "${eventStatus}".`,
        },
        409,
      );
    }

    /*
     * =========================================================
     * LOAD MUNICIPALITY ASSIGNMENTS
     * =========================================================
     */

    const {
      data:
        assignmentRows,

      error:
        assignmentsError,
    } =
      await adminClient
        .from(
          "event_municipalities",
        )
        .select(
          `
            id,
            municipality
          `,
        )
        .eq(
          "event_id",
          eventId,
        );

    if (
      assignmentsError
    ) {
      return jsonResponse(
        {
          error:
            assignmentsError.message,
        },
        500,
      );
    }

    const municipalities =
      Array.from(
        new Set(
          (
            assignmentRows ??
            []
          )
            .map(
              (
                assignment: {
                  municipality:
                    | string
                    | null;
                },
              ) =>
                String(
                  assignment
                    .municipality ??
                    "",
                ).trim(),
            )
            .filter(Boolean),
        ),
      );

    /*
     * No municipality assignments.
     */
    if (
      municipalities.length ===
      0
    ) {
      return jsonResponse({
        message:
          "No municipality assignments were found for this event.",

        provider:
          "brevo",

        background:
          false,

        tracking:
          false,

        eventId:
          event.id,

        eventTitle:
          event.title,

        municipalities,

        totalRecipients:
          0,

        queued:
          0,

        sent:
          0,

        failed:
          [],
      });
    }

    /*
     * =========================================================
     * LOAD APPROVED MUNICIPAL ADMINS
     * =========================================================
     */

    const {
      data:
        municipalAdmins,

      error:
        municipalAdminsError,
    } =
      await adminClient
        .from(
          "profiles",
        )
        .select(
          `
            id,
            full_name,
            email,
            municipality,
            role,
            verification_status
          `,
        )
        .eq(
          "role",
          "municipal_admin",
        )
        .eq(
          "verification_status",
          "approved",
        )
        .in(
          "municipality",
          municipalities,
        )
        .not(
          "email",
          "is",
          null,
        );

    if (
      municipalAdminsError
    ) {
      return jsonResponse(
        {
          error:
            municipalAdminsError.message,
        },
        500,
      );
    }

    /*
     * =========================================================
     * REMOVE DUPLICATE RECIPIENT EMAILS
     * =========================================================
     */

    const recipientMap =
      new Map<
        string,
        {
          full_name:
            | string
            | null;

          email:
            string;

          municipality:
            | string
            | null;
        }
      >();

    for (
      const profile of
        municipalAdmins ??
        []
    ) {
      const email =
        String(
          profile.email ??
            "",
        )
          .trim()
          .toLowerCase();

      if (!email) {
        continue;
      }

      if (
        !recipientMap.has(
          email,
        )
      ) {
        recipientMap.set(
          email,
          {
            full_name:
              profile.full_name ??
              null,

            email,

            municipality:
              profile.municipality ??
              null,
          },
        );
      }
    }

    const recipients =
      Array.from(
        recipientMap.values(),
      );

    /*
     * No approved Municipal Admin recipients.
     */
    if (
      recipients.length ===
      0
    ) {
      return jsonResponse({
        message:
          "No approved municipal administrators with email addresses were found for the assigned municipalities.",

        provider:
          "brevo",

        background:
          false,

        tracking:
          false,

        eventId:
          event.id,

        eventTitle:
          event.title,

        municipalities,

        totalRecipients:
          0,

        queued:
          0,

        sent:
          0,

        failed:
          [],
      });
    }

    /*
     * =========================================================
     * EMAIL SUBJECT
     * =========================================================
     */

    const subject =
      isCancellation
        ? `Cancelled Provincial Event: ${event.title}`
        : `New Provincial Event: ${event.title}`;

    /*
     * =========================================================
     * CREATE / RESET EMAIL DELIVERY TRACKING
     * =========================================================
     *
     * Tracking failure must NOT stop actual
     * email sending.
     */

    const trackingPayload = {
      event_id:
        event.id,

      notification_type:
        notificationType,

      status:
        "queued",

      total_recipients:
        recipients.length,

      sent_count:
        0,

      failed_count:
        0,

      failed_messages:
        [],

      updated_at:
        new Date()
          .toISOString(),

      completed_at:
        null,
    };

    /*
     * Cancellation uses INSERT so the existing unique key on
     * (event_id, notification_type) prevents duplicate batches.
     * Keep the existing publication UPSERT behavior unchanged.
     */
    const {
      error:
        emailTrackingError,
    } = isCancellation
      ? await adminClient
          .from(
            "event_email_deliveries",
          )
          .insert(
            trackingPayload,
          )
      : await adminClient
          .from(
            "event_email_deliveries",
          )
          .upsert(
            trackingPayload,
            {
              onConflict:
                "event_id,notification_type",
            },
          );

    if (
      isCancellation &&
      emailTrackingError?.code ===
        "23505"
    ) {
      return jsonResponse({
        message:
          "Event cancellation email notifications were already queued or processed.",

        provider:
          "brevo",

        background:
          false,

        tracking:
          true,

        duplicatePrevented:
          true,

        eventId:
          event.id,

        eventTitle:
          event.title,

        municipalities,

        totalRecipients:
          recipients.length,

        queued:
          0,
      });
    }

    const emailTrackingAvailable =
      !emailTrackingError;

    if (
      emailTrackingError
    ) {
      console.warn(
        "Could not create email delivery tracking row:",
        emailTrackingError.message,
      );
    }

    /*
     * =========================================================
     * BACKGROUND BREVO EMAIL TASK
     * =========================================================
     */

    const emailTask =
      (async () => {
        try {
          /*
           * Send all recipients in parallel.
           */
          const results =
            await Promise.allSettled(
              recipients.map(
                async (
                  recipient,
                ) => {
                  const recipientName =
                    recipient
                      .full_name
                      ?.trim() ||
                    "Municipal Administrator";

                  const recipientMunicipality =
                    recipient
                      .municipality
                      ?.trim() ||
                    "your municipality";

                  const eventUrl =
                    APP_URL
                      ? `${APP_URL.replace(
                          /\/$/,
                          "",
                        )}${
                          isCancellation
                            ? "/dashboard/municipal/events"
                            : "/dashboard/municipal/preparations"
                        }`
                      : "";

                  const emailHeading =
                    isCancellation
                      ? "Provincial Event Cancelled"
                      : "New Provincial Event";

                  /*
                   * =================================================
                   * EMAIL HTML
                   * =================================================
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
                          background: #0f172a;
                          color: #ffffff;
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
                            opacity: 0.8;
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
                          ${escapeHtml(
                            emailHeading,
                          )}
                        </h1>
                      </div>

                      <div
                        style="
                          border: 1px solid #e2e8f0;
                          border-top: none;
                          padding: 24px;
                          border-radius: 0 0 14px 14px;
                          background: #ffffff;
                        "
                      >
                        <p
                          style="
                            margin-top: 0;
                            font-size: 15px;
                            line-height: 1.7;
                          "
                        >
                          Hello ${escapeHtml(
                            recipientName,
                          )},
                        </p>

                        <p
                          style="
                            font-size: 15px;
                            line-height: 1.7;
                          "
                        >
                          ${
                            isCancellation
                              ? `The provincial event assigned to <strong>${escapeHtml(
                                  recipientMunicipality,
                                )}</strong> has been cancelled. Please inform the appropriate municipal personnel and participants.`
                              : `A new provincial event has been assigned to <strong>${escapeHtml(
                                  recipientMunicipality,
                                )}</strong>. Please review the event and begin the required municipal preparation.`
                          }
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
                              margin: 0 0 16px;
                              font-size: 20px;
                            "
                          >
                            ${escapeHtml(
                              event.title,
                            )}
                          </h2>

                          <p
                            style="
                              margin: 8px 0;
                            "
                          >
                            <strong>
                              Municipality:
                            </strong>

                            ${escapeHtml(
                              recipientMunicipality,
                            )}
                          </p>

                          <p
                            style="
                              margin: 8px 0;
                            "
                          >
                            <strong>
                              Starts:
                            </strong>

                            ${escapeHtml(
                              formatDateTime(
                                event.start_at,
                              ),
                            )}
                          </p>

                          <p
                            style="
                              margin: 8px 0;
                            "
                          >
                            <strong>
                              Ends:
                            </strong>

                            ${escapeHtml(
                              formatDateTime(
                                event.end_at,
                              ),
                            )}
                          </p>

                          ${
                            event.description
                              ? `
                                <div
                                  style="
                                    margin-top: 18px;
                                  "
                                >
                                  <strong>
                                    Description:
                                  </strong>

                                  <p
                                    style="
                                      margin: 8px 0 0;
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

                        <p
                          style="
                            font-size: 15px;
                            line-height: 1.7;
                          "
                        >
                          ${
                            isCancellation
                              ? "Open PagTipon to review the cancelled event and its details. No further municipal preparation or registration should be made for this event."
                              : "Open PagTipon to review the official memo, assign a local venue, add local instructions, and update your municipality&apos;s preparation status."
                          }
                        </p>

                        ${
                          eventUrl
                            ? `
                              <div
                                style="
                                  margin-top: 24px;
                                "
                              >
                                <a
                                  href="${escapeHtml(
                                    eventUrl,
                                  )}"
                                  style="
                                    display: inline-block;
                                    background: #0f172a;
                                    color: #ffffff;
                                    text-decoration: none;
                                    font-weight: 700;
                                    padding: 12px 18px;
                                    border-radius: 10px;
                                  "
                                >
                                  ${
                                    isCancellation
                                      ? "View Cancelled Event"
                                      : "Open Event Preparation"
                                  }
                                </a>
                              </div>
                            `
                            : ""
                        }

                        <p
                          style="
                            margin-top: 32px;
                            font-size: 12px;
                            line-height: 1.6;
                            color: #64748b;
                          "
                        >
                          You received this email because you are an
                          approved Municipal Administrator for
                          ${escapeHtml(
                            recipientMunicipality,
                          )}
                          in PagTipon.
                        </p>
                      </div>
                    </div>
                  `;

                  /*
                   * =================================================
                   * BREVO TRANSACTIONAL EMAIL API
                   * =================================================
                   */

                  const response =
                    await fetch(
                      "https://api.brevo.com/v3/smtp/email",
                      {
                        method:
                          "POST",

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
                                  recipient.email,

                                name:
                                  recipientName,
                              },
                            ],

                            subject,

                            htmlContent:
                              html,
                          }),
                      },
                    );

                  const result =
                    await response
                      .json()
                      .catch(
                        () =>
                          null,
                      );

                  if (
                    !response.ok
                  ) {
                    const errorMessage =
                      result?.message ||
                      result?.code ||
                      "Brevo email failed";

                    throw new Error(
                      `${recipient.email}: ${errorMessage}`,
                    );
                  }

                  return {
                    email:
                      recipient.email,

                    messageId:
                      result?.messageId ??
                      null,
                  };
                },
              ),
            );

          /*
           * =================================================
           * CALCULATE RESULT
           * =================================================
           */

          const sent =
            results.filter(
              (
                result,
              ) =>
                result.status ===
                "fulfilled",
            ).length;

          const failed =
            results
              .filter(
                (
                  result,
                ): result is PromiseRejectedResult =>
                  result.status ===
                  "rejected",
              )
              .map(
                (
                  result,
                ) =>
                  result.reason instanceof
                    Error
                    ? result.reason.message
                    : String(
                        result.reason ??
                          "Unknown email error",
                      ),
              );

          const deliveryStatus =
            failed.length ===
            0
              ? "completed"
              : sent > 0
                ? "partial"
                : "failed";

          const now =
            new Date()
              .toISOString();

          /*
           * =================================================
           * UPDATE DELIVERY TRACKING
           * =================================================
           */

          if (
            emailTrackingAvailable
          ) {
            const {
              error:
                trackingUpdateError,
            } =
              await adminClient
                .from(
                  "event_email_deliveries",
                )
                .update({
                  status:
                    deliveryStatus,

                  total_recipients:
                    recipients.length,

                  sent_count:
                    sent,

                  failed_count:
                    failed.length,

                  failed_messages:
                    failed,

                  updated_at:
                    now,

                  completed_at:
                    now,
                })
                .eq(
                  "event_id",
                  event.id,
                )
                .eq(
                  "notification_type",
                  notificationType,
                );

            if (
              trackingUpdateError
            ) {
              console.error(
                "Could not update email delivery tracking:",
                trackingUpdateError.message,
              );
            }
          }

          /*
           * Successful Brevo IDs for debugging.
           */
          const successfulEmails =
            results
              .filter(
                (
                  result,
                ): result is PromiseFulfilledResult<{
                  email:
                    string;

                  messageId:
                    | string
                    | null;
                }> =>
                  result.status ===
                  "fulfilled",
              )
              .map(
                (
                  result,
                ) => ({
                  email:
                    result.value.email,

                  messageId:
                    result.value.messageId,
                }),
              );

          /*
           * =================================================
           * BACKGROUND SUCCESS LOG
           * =================================================
           */

          console.log(
            "Background event email process completed.",
            {
              provider:
                "brevo",

              eventId:
                event.id,

              eventTitle:
                event.title,

              municipalities,

              totalRecipients:
                recipients.length,

              sent,

              failed,

              successfulEmails,
            },
          );
        } catch (
          error
        ) {
          /*
           * =================================================
           * UNEXPECTED BACKGROUND FAILURE
           * =================================================
           */

          const message =
            error instanceof
              Error
              ? error.message
              : "Unexpected background email error.";

          const now =
            new Date()
              .toISOString();

          /*
           * Tracking problems must never affect
           * the published event itself.
           */
          if (
            emailTrackingAvailable
          ) {
            const {
              error:
                trackingFailureError,
            } =
              await adminClient
                .from(
                  "event_email_deliveries",
                )
                .update({
                  status:
                    "failed",

                  total_recipients:
                    recipients.length,

                  sent_count:
                    0,

                  failed_count:
                    recipients.length,

                  failed_messages: [
                    message,
                  ],

                  updated_at:
                    now,

                  completed_at:
                    now,
                })
                .eq(
                  "event_id",
                  event.id,
                )
                .eq(
                  "notification_type",
                  notificationType,
                );

            if (
              trackingFailureError
            ) {
              console.error(
                "Could not mark email delivery tracking as failed:",
                trackingFailureError.message,
              );
            }
          }

          console.error(
            "Background event email process failed:",
            error,
          );
        }
      })();

    /*
     * =========================================================
     * REGISTER BACKGROUND TASK
     * =========================================================
     */

    EdgeRuntime.waitUntil(
      emailTask,
    );

    /*
     * =========================================================
     * RETURN IMMEDIATELY
     * =========================================================
     *
     * Actual Brevo sending continues in
     * the background.
     */

    return jsonResponse(
      {
        message:
          `${
            isCancellation
              ? "Event cancellation"
              : "Event publication"
          } email notifications accepted for background delivery.`,

        provider:
          "brevo",

        background:
          true,

        tracking:
          emailTrackingAvailable,

        eventId:
          event.id,

        eventTitle:
          event.title,

        municipalities,

        totalRecipients:
          recipients.length,

        queued:
          recipients.length,
      },
      202,
    );
  } catch (
    error
  ) {
    console.error(
      "send-event-email error:",
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof
            Error
            ? error.message
            : "Unexpected server error.",
      },
      500,
    );
  }
});
