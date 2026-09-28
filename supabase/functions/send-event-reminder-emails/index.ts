import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type Participant = {
  id: string;
  full_name: string | null;
  email: string;
};

type RsvpRow = {
  user_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  municipality: string | null;
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

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "TBA";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function constantTimeEquals(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }

  return difference === 0;
}

function normalizeValue(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const cronSecret = Deno.env.get("EVENT_REMINDER_CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret") ?? "";

    if (
      !cronSecret ||
      !providedSecret ||
      !constantTimeEquals(providedSecret, cronSecret)
    ) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME");
    const appUrl = Deno.env.get("APP_URL");

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !brevoApiKey ||
      !senderEmail ||
      !senderName ||
      !appUrl
    ) {
      return jsonResponse(
        { error: "Missing required Edge Function environment variables." },
        500,
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const reminderWindowStart = new Date(now.getTime() + 55 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 65 * 60 * 1000);

    const { data: events, error: eventsError } = await adminClient
      .from("events")
      .select("id, title, start_at, end_at, status")
      .in("status", ["published", "upcoming"])
      .gt("start_at", reminderWindowStart.toISOString())
      .lte("start_at", reminderWindowEnd.toISOString());

    if (eventsError) {
      console.error("Could not load upcoming events:", eventsError);
      return jsonResponse({ error: "Could not load upcoming events." }, 500);
    }

    let attempted = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    const participantEventsUrl = `${appUrl.replace(/\/$/, "")}/dashboard/participant/events`;

    for (const event of events ?? []) {
      const { data: assignments, error: assignmentsError } = await adminClient
        .from("event_municipalities")
        .select("id, municipality, local_venue_id, local_instructions")
        .eq("event_id", event.id);

      if (assignmentsError) {
        console.error(
          "Could not load event assignments:",
          event.id,
          assignmentsError,
        );
        failed += 1;
        continue;
      }

      for (const assignment of assignments ?? []) {
        const { data: rsvpRows, error: rsvpError } = await adminClient
          .from("rsvps")
          .select("user_id")
          .eq("event_municipality_id", assignment.id)
          .eq("status", "registered");

        if (rsvpError) {
          console.error(
            "Could not load registered participants:",
            assignment.id,
            rsvpError,
          );
          failed += 1;
          continue;
        }

        const participantIds = Array.from(
          new Set(
            (rsvpRows ?? [])
              .map((row: RsvpRow) => String(row.user_id ?? "").trim())
              .filter(Boolean),
          ),
        );

        if (participantIds.length === 0) continue;

        const { data: profiles, error: profilesError } = await adminClient
          .from("profiles")
          .select("id, full_name, email, municipality")
          .in("id", participantIds)
          .eq("role", "participant")
          .eq("verification_status", "approved")
          .not("email", "is", null);

        if (profilesError) {
          console.error(
            "Could not load participant profiles:",
            assignment.id,
            profilesError,
          );
          failed += 1;
          continue;
        }

        const participants: Participant[] = (profiles ?? []).flatMap(
          (profile: ProfileRow) => {
            if (
              normalizeValue(profile.municipality) !==
              normalizeValue(assignment.municipality)
            ) {
              return [];
            }

            const id = String(profile.id ?? "").trim();
            const email = String(profile.email ?? "")
              .trim()
              .toLowerCase();

            if (!id || !email) return [];

            return [
              {
                id,
                full_name: profile.full_name ?? null,
                email,
              },
            ];
          },
        );

        let venueName = "To be announced";

        if (assignment.local_venue_id) {
          const { data: venue } = await adminClient
            .from("venues")
            .select("venue_name")
            .eq("id", assignment.local_venue_id)
            .maybeSingle();

          if (venue?.venue_name) {
            venueName = venue.venue_name;
          }
        }

        for (const participant of participants) {
          const notificationKey = "event_start_1h_v1";

          const { data: existing, error: existingError } = await adminClient
            .from("email_notification_deliveries")
            .select("id, status, updated_at")
            .eq("event_municipality_id", assignment.id)
            .eq("participant_id", participant.id)
            .eq("notification_type", "event_reminder")
            .eq("notification_key", notificationKey)
            .maybeSingle();

          if (existingError) {
            console.error("Delivery lookup failed:", existingError);
            failed += 1;
            continue;
          }

          if (existing?.status === "sent") {
            skipped += 1;
            continue;
          }

          let deliveryId: string | null = existing?.id ?? null;

          if (existing?.status === "pending") {
            const updatedAt = new Date(existing.updated_at).getTime();
            const stalePending = updatedAt < Date.now() - 30 * 60 * 1000;

            if (!stalePending) {
              skipped += 1;
              continue;
            }

            const { data: recovered, error: recoveryError } = await adminClient
              .from("email_notification_deliveries")
              .update({
                status: "pending",
                last_error: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id)
              .eq("status", "pending")
              .lt(
                "updated_at",
                new Date(Date.now() - 30 * 60 * 1000).toISOString(),
              )
              .select("id")
              .maybeSingle();

            if (recoveryError || !recovered) {
              skipped += 1;
              continue;
            }
          }

          if (deliveryId && existing?.status !== "pending") {
            const { data: reset, error: resetError } = await adminClient
              .from("email_notification_deliveries")
              .update({
                status: "pending",
                provider: "brevo",
                provider_message_id: null,
                recipient_email: participant.email,
                last_error: null,
                sent_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", deliveryId)
              .eq("status", "failed")
              .select("id")
              .maybeSingle();

            if (resetError || !reset) {
              skipped += 1;
              continue;
            }
          }

          if (!deliveryId) {
            const { data: inserted, error: insertError } = await adminClient
              .from("email_notification_deliveries")
              .insert({
                event_municipality_id: assignment.id,
                participant_id: participant.id,
                notification_type: "event_reminder",
                notification_key: notificationKey,
                recipient_email: participant.email,
                status: "pending",
                provider: "brevo",
                updated_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (insertError) {
              if (insertError.code === "23505") {
                skipped += 1;
                continue;
              }

              console.error(
                "Could not reserve reminder delivery:",
                insertError,
              );
              failed += 1;
              continue;
            }

            deliveryId = inserted.id;
          }

          attempted += 1;

          const greeting = participant.full_name?.trim() || "Participant";

          const instructions = String(
            assignment.local_instructions ?? "",
          ).trim();

          const html = `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
              <div style="background:#047857;color:#fff;padding:22px 24px;border-radius:14px 14px 0 0">
                <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">
                  PagTipon
                </div>
                <h1 style="margin:8px 0 0;font-size:22px">Event Reminder</h1>
              </div>

              <div style="border:1px solid #d1fae5;border-top:none;padding:24px;border-radius:0 0 14px 14px">
                <p>Hello ${escapeHtml(greeting)},</p>
                <p style="line-height:1.7">
                  This is a reminder about an event you registered for. It is scheduled to begin in about one hour.
                </p>

                <div style="margin:24px 0;padding:20px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc">
                  <h2>${escapeHtml(event.title)}</h2>
                  <p><strong>Municipality:</strong> ${escapeHtml(assignment.municipality)}</p>
                  <p><strong>Date and time:</strong> ${escapeHtml(formatDateTime(event.start_at))}</p>
                  <p><strong>Venue:</strong> ${escapeHtml(venueName)}</p>
                  ${
                    instructions
                      ? `<div style="margin-top:18px">
                           <strong>Local instructions:</strong>
                           <p style="line-height:1.7;white-space:pre-wrap">${escapeHtml(instructions)}</p>
                         </div>`
                      : ""
                  }
                </div>

                <a href="${escapeHtml(participantEventsUrl)}"
                   style="display:inline-block;background:#047857;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">
                  Open Participant Dashboard
                </a>

                <p style="margin-top:30px;color:#64748b;font-size:12px">
                  This reminder was sent by PagTipon.
                </p>
              </div>
            </div>
          `;

          try {
            const response = await fetch(
              "https://api.brevo.com/v3/smtp/email",
              {
                method: "POST",
                headers: {
                  "api-key": brevoApiKey,
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  sender: {
                    email: senderEmail,
                    name: senderName,
                  },
                  to: [
                    {
                      email: participant.email,
                      name: greeting,
                    },
                  ],
                  subject: `Event Reminder: ${event.title}`,
                  htmlContent: html,
                }),
              },
            );

            const brevoResult = await response.json().catch(() => null);

            if (!response.ok) {
              const errorMessage =
                brevoResult?.message ??
                brevoResult?.code ??
                "Email delivery failed.";

              await adminClient
                .from("email_notification_deliveries")
                .update({
                  status: "failed",
                  provider: "brevo",
                  provider_message_id: null,
                  last_error: String(errorMessage),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", deliveryId);

              failed += 1;
              continue;
            }

            const { error: sentUpdateError } = await adminClient
              .from("email_notification_deliveries")
              .update({
                status: "sent",
                provider: "brevo",
                provider_message_id: brevoResult?.messageId ?? null,
                last_error: null,
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", deliveryId);

            if (sentUpdateError) {
              console.error(
                "Email sent, but delivery tracking update failed:",
                deliveryId,
                sentUpdateError,
              );
              failed += 1;
              continue;
            }

            sent += 1;
          } catch (sendError) {
            const message =
              sendError instanceof Error
                ? sendError.message
                : "Unexpected Brevo request error.";

            await adminClient
              .from("email_notification_deliveries")
              .update({
                status: "failed",
                provider: "brevo",
                provider_message_id: null,
                last_error: message,
                updated_at: new Date().toISOString(),
              })
              .eq("id", deliveryId);

            failed += 1;
          }
        }
      }
    }

    return jsonResponse({
      message: "Event reminder email run completed.",
      eligibleEvents: events?.length ?? 0,
      attempted,
      sent,
      skipped,
      failed,
    });
  } catch (error) {
    console.error("send-event-reminder-emails error:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      500,
    );
  }
});
