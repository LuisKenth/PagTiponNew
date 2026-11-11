import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * PagTipon — Automated After-Event Acknowledgment
 *
 * Standalone Edge Function: it does not modify existing reminder/registration senders.
 * Only participants with Present/Late attendance receive an email.
 * Set AFTER_EVENT_ACK_START_AT before invoking; no historical-event backfill.
 *
 * Important delivery semantics:
 * - "sent" means Brevo accepted the message; not proof of inbox delivery.
 * - ambiguous network outcomes remain pending for manual reconciliation;
 *   they are NOT automatically resent (avoids potential duplicate emails).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const FUNCTION_NAME = "send-after-event-acknowledgments";
const ACK_DELAY_MINUTES = 20; // Allow status-sync/finalization cron to settle.
const LOOKBACK_DAYS = 14; // Short recovery window after brief downtime.
const EVENT_PAGE_SIZE = 100;
const MAX_EVENT_PAGES = 10;
const ATTENDANCE_PAGE_SIZE = 500;
const PROFILE_BATCH_SIZE = 100;
const MAX_EMAILS_PER_RUN = 20;
const MAX_RETRIES_FOR_CONFIRMED_FAILURE = 3;

type Attendee = {
  id: string;
  full_name: string | null;
  email: string;
};

type Delivery = {
  id: string;
  status: string;
  attempt_count: number;
};

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function constantTimeEquals(a: string, b: string) {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

function escapeHtml(input: string | null | undefined) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "To be announced";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    result.push(values.slice(i, i + size));
  }
  return result;
}

function buildAcknowledgmentHtml(args: {
  greeting: string;
  title: string;
  municipality: string;
  endAt: string;
  appUrl: string | null;
}) {
  const { greeting, title, municipality, endAt, appUrl } = args;
  const dashboardLink = appUrl
    ? `<p style="margin-top:24px"><a href="${escapeHtml(
        `${appUrl.replace(/\/$/, "")}/dashboard/participant/attendance-history`,
      )}" style="display:inline-block;background:#047857;color:white;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px">View Attendance History</a></p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a">
      <div style="background:#047857;color:white;padding:24px;border-radius:14px 14px 0 0">
        <div style="font-size:12px;letter-spacing:.12em;font-weight:bold">PAGTIPON</div>
        <h1 style="margin:10px 0 0;font-size:22px">Thank You for Participating!</h1>
      </div>
      <div style="border:1px solid #d1fae5;border-top:none;padding:24px;border-radius:0 0 14px 14px">
        <p>Hello ${escapeHtml(greeting)},</p>
        <p style="line-height:1.7">Thank you for attending this PagTipon event. We appreciate
        your time and participation in our community activities.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:18px;border-radius:12px;margin:20px 0">
          <h2 style="margin:0 0 12px;font-size:19px">${escapeHtml(title)}</h2>
          <p><strong>Municipality:</strong> ${escapeHtml(municipality)}</p>
          <p><strong>Event ended:</strong> ${escapeHtml(formatDateTime(endAt))}</p>
        </div>
        <p style="line-height:1.7">Your attendance has been recorded in PagTipon.
        We look forward to seeing you at future activities.</p>
        ${dashboardLink}
        <p style="margin-top:28px;font-size:12px;color:#64748b">This acknowledgment was sent automatically by PagTipon after your event.</p>
      </div>
    </div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return respond({ error: "Method not allowed." }, 405);
  }

  const expectedSecret = Deno.env.get("AFTER_EVENT_ACK_CRON_SECRET") ?? "";
  const suppliedSecret = req.headers.get("x-cron-secret") ?? "";
  if (
    !expectedSecret ||
    !suppliedSecret ||
    !constantTimeEquals(expectedSecret, suppliedSecret)
  ) {
    return respond({ error: "Unauthorized." }, 401);
  }

  // A missing activation cutoff is a hard fail, not an implicit historical backfill.
  const activationText = Deno.env.get("AFTER_EVENT_ACK_START_AT") ?? "";
  if (!/(Z|[+-]\d\d:\d\d)$/.test(activationText)) {
    return respond({
      error:
        "AFTER_EVENT_ACK_START_AT must be set to an explicit timezone-aware ISO date (e.g. 2026-11-09T08:00:00+08:00).",
    }, 500);
  }
  const activationTime = new Date(activationText);
  if (Number.isNaN(activationTime.getTime())) {
    return respond({ error: "Invalid AFTER_EVENT_ACK_START_AT value." }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME");
  const appUrl = Deno.env.get("APP_URL") ?? null;

  if (!supabaseUrl || !serviceRoleKey || !brevoApiKey || !senderEmail || !senderName) {
    return respond({ error: "Missing required Edge Function environment variables." }, 500);
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  const safeEnd = new Date(now.getTime() - ACK_DELAY_MINUTES * 60_000);
  const lookbackTime = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
  const start = new Date(Math.max(activationTime.getTime(), lookbackTime.getTime()));

  const totals = {
    dryRun,
    eligibleEvents: 0,
    attendeeRecords: 0,
    eligibleRecipients: 0,
    attempted: 0,
    sent: 0,
    alreadySent: 0,
    inProgressOrUncertain: 0,
    retryLimitReached: 0,
    failed: 0,
    noEmailOrInvalidProfile: 0,
    wouldAttempt: 0,
    reachedEmailLimit: false,
    errors: [] as string[],
  };

  if (start.getTime() > safeEnd.getTime()) {
    return respond({ message: "No eligible completed events after activation cutoff.", ...totals });
  }

  try {
    let stop = false;
    for (let page = 0; page < MAX_EVENT_PAGES && !stop; page++) {
      const { data: events, error: eventError } = await client
        .from("events")
        .select("id,title,end_at,status,event_origin,municipal_approval_recorded_by,municipal_approval_recorded_at")
        .eq("status", "completed")
        .gte("end_at", start.toISOString())
        .lte("end_at", safeEnd.toISOString())
        .order("end_at", { ascending: true })
        .order("id", { ascending: true })
        .range(page * EVENT_PAGE_SIZE, (page + 1) * EVENT_PAGE_SIZE - 1);

      if (eventError) {
        throw new Error(`Could not retrieve completed events: ${eventError.message}`);
      }
      if (!events?.length) break;

      for (const event of events) {
        if (event.event_origin === "municipal" &&
          (!event.municipal_approval_recorded_by || !event.municipal_approval_recorded_at)) {
          continue; // Same completeness rule as province-wide reporting.
        }
        totals.eligibleEvents++;

        const { data: assignments, error: assignmentError } = await client
          .from("event_municipalities")
          .select("id,municipality,municipal_status")
          .eq("event_id", event.id);
        if (assignmentError) {
          totals.errors.push(`Could not load assignments for event ${event.id}.`);
          totals.failed++;
          continue;
        }

        for (const assignment of assignments ?? []) {
          if (["cancelled", "canceled", "declined"].includes(
            String(assignment.municipal_status ?? "").toLowerCase(),
          )) continue;

          // Fetch every page (Supabase's default response limit is often 1,000).
          const ids = new Set<string>();
          for (let offset = 0; ; offset += ATTENDANCE_PAGE_SIZE) {
            const { data: attendance, error: attendanceError } = await client
              .from("attendance")
              .select("id,user_id")
              .eq("event_municipality_id", assignment.id)
              .in("status", ["present", "late"])
              .order("id", { ascending: true })
              .range(offset, offset + ATTENDANCE_PAGE_SIZE - 1);
            if (attendanceError) {
              totals.failed++;
              totals.errors.push(`Could not load attendance for assignment ${assignment.id}.`);
              ids.clear();
              break;
            }
            for (const row of attendance ?? []) {
              const userId = String(row.user_id ?? "").trim();
              if (userId) ids.add(userId);
            }
            if ((attendance ?? []).length < ATTENDANCE_PAGE_SIZE) break;
          }
          if (!ids.size) continue;
          totals.attendeeRecords += ids.size;

          // Profiles are fetched in small batches to avoid overly long IN clauses.
          const recipients: Attendee[] = [];
          for (const idBatch of chunks([...ids], PROFILE_BATCH_SIZE)) {
            const { data: profiles, error: profileError } = await client
              .from("profiles")
              .select("id,full_name,email")
              .in("id", idBatch)
              .eq("role", "participant")
              .eq("verification_status", "approved")
              .not("email", "is", null);
            if (profileError) {
              totals.failed++;
              totals.errors.push(`Could not load participant profiles for ${assignment.id}.`);
              // Fail closed: no sends if any part of the recipient list failed.
              recipients.length = 0;
              break;
            }
            for (const profile of profiles ?? []) {
              const email = String(profile.email ?? "").trim().toLowerCase();
              if (email && email.includes("@")) {
                recipients.push({ id: profile.id, full_name: profile.full_name, email });
              }
            }
          }
          totals.noEmailOrInvalidProfile += Math.max(0, ids.size - recipients.length);

          for (const recipient of recipients) {
            totals.eligibleRecipients++;
            const { data: existing, error: lookupError } = await client
              .from("after_event_acknowledgment_deliveries")
              .select("id,status,attempt_count")
              .eq("event_municipality_id", assignment.id)
              .eq("participant_id", recipient.id)
              .maybeSingle();

            if (lookupError) {
              totals.failed++;
              totals.errors.push(`Delivery lookup error for assignment ${assignment.id}. Check SQL migration.`);
              continue;
            }
            const delivery = existing as Delivery | null;
            if (delivery?.status === "sent") { totals.alreadySent++; continue; }
            if (delivery?.status === "pending") {
              totals.inProgressOrUncertain++;
              continue;
            }
            if (delivery?.status === "failed" &&
                delivery.attempt_count >= MAX_RETRIES_FOR_CONFIRMED_FAILURE) {
              totals.retryLimitReached++;
              continue;
            }
            if (dryRun) {
              totals.wouldAttempt++;
              continue;
            }
            if (totals.attempted >= MAX_EMAILS_PER_RUN) {
              totals.reachedEmailLimit = true;
              stop = true;
              break;
            }

            let deliveryId: string;
            if (!delivery) {
              // Unique constraint makes simultaneous invocations race-safe.
              const { data: inserted, error: insertError } = await client
                .from("after_event_acknowledgment_deliveries")
                .insert({
                  event_municipality_id: assignment.id,
                  participant_id: recipient.id,
                  recipient_email: recipient.email,
                  status: "pending",
                  provider: "brevo",
                  attempt_count: 1,
                })
                .select("id")
                .single();
              if (insertError?.code === "23505") {
                totals.inProgressOrUncertain++;
                continue;
              }
              if (insertError || !inserted) {
                totals.failed++;
                totals.errors.push(`Delivery reservation failed for ${assignment.id}.`);
                continue;
              }
              deliveryId = inserted.id;
            } else {
              // Retry only a confirmed Brevo rejection; compare-and-swap guards concurrency.
              const { data: reset, error: resetError } = await client
                .from("after_event_acknowledgment_deliveries")
                .update({
                  status: "pending",
                  attempt_count: delivery.attempt_count + 1,
                  recipient_email: recipient.email,
                  provider_message_id: null,
                  last_error: null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", delivery.id)
                .eq("status", "failed")
                .eq("attempt_count", delivery.attempt_count)
                .select("id")
                .maybeSingle();
              if (resetError || !reset) {
                totals.inProgressOrUncertain++;
                continue;
              }
              deliveryId = reset.id;
            }

            totals.attempted++;
            const greeting = recipient.full_name?.trim() || "Participant";
            const html = buildAcknowledgmentHtml({
              greeting,
              title: event.title,
              municipality: assignment.municipality,
              endAt: event.end_at,
              appUrl,
            });

            try {
              const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                  "api-key": brevoApiKey,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  sender: { email: senderEmail, name: senderName },
                  to: [{ email: recipient.email, name: greeting }],
                  subject: `Thank You for Attending: ${event.title}`,
                  htmlContent: html,
                }),
                signal: AbortSignal.timeout(20_000),
              });
              const providerResult = await brevoResponse.json().catch(() => null);

              if (!brevoResponse.ok) {
                // Explicit Brevo rejection: safe to retry (limited number of times).
                const message = String(providerResult?.message ?? providerResult?.code ?? `Brevo HTTP ${brevoResponse.status}`);
                const { error: failureUpdate } = await client
                  .from("after_event_acknowledgment_deliveries")
                  .update({
                    status: "failed",
                    last_error: message.slice(0, 1000),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", deliveryId);
                if (failureUpdate) totals.errors.push(`Could not track Brevo rejection for ${assignment.id}.`);
                totals.failed++;
                continue;
              }

              // Brevo accepted; save before creating the optional in-app notification.
              const { error: sentUpdateError } = await client
                .from("after_event_acknowledgment_deliveries")
                .update({
                  status: "sent",
                  provider_message_id: providerResult?.messageId ?? null,
                  sent_at: new Date().toISOString(),
                  last_error: null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", deliveryId);
              if (sentUpdateError) {
                // PENDING stays locked. Never automatically resend an accepted message.
                totals.failed++;
                totals.errors.push(`Brevo accepted an email but its tracking update failed for ${assignment.id}. Manual reconciliation required.`);
                continue;
              }
              totals.sent++;

              const { error: notificationError } = await client
                .from("notifications")
                .insert({
                  user_id: recipient.id,
                  event_id: event.id,
                  event_municipality_id: assignment.id,
                  type: "after_event_acknowledgment",
                  title: `Thank you for attending: ${event.title}`,
                  message: `Thank you for joining ${event.title} in ${assignment.municipality}. Your attendance was recorded.`,
                  read: false,
                  dedupe_key: `after_event_acknowledgment:${assignment.id}:${recipient.id}:v1`,
                });
              if (notificationError && notificationError.code !== "23505") {
                // A notification error must never cause a second email.
                totals.errors.push(`Email accepted, but in-app notification insert failed for ${assignment.id}.`);
              }
            } catch (error) {
              // Timeout/network exception can mean Brevo accepted the email.
              // Keep status=PENDING for manual reconciliation, never auto-resend.
              const message = error instanceof Error ? error.message : "Unknown request error.";
              const { error: uncertainUpdateError } = await client
                .from("after_event_acknowledgment_deliveries")
                .update({
                  last_error: `UNCERTAIN DELIVERY — inspect Brevo before retry: ${message}`.slice(0, 1000),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", deliveryId);
              if (uncertainUpdateError) totals.errors.push(`Could not flag uncertain delivery for ${assignment.id}.`);
              totals.failed++;
              console.error(`${FUNCTION_NAME}: uncertain delivery for ${deliveryId}:`, message);
            }
          }
          if (stop) break;
        }
        if (stop) break;
      }
      if (events.length < EVENT_PAGE_SIZE) break;
    }

    return respond({
      message: dryRun
        ? "Acknowledgment eligibility check completed (no messages sent)."
        : "After-event acknowledgment run completed.",
      activationCutoff: activationTime.toISOString(),
      safeEventEndThrough: safeEnd.toISOString(),
      ...totals,
    });
  } catch (error) {
    console.error(`${FUNCTION_NAME} error:`, error);
    return respond({
      error: error instanceof Error ? error.message : "Unexpected server error.",
    }, 500);
  }
});
