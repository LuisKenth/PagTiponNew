import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { eventActor, eventFailure, EventRequestError } from "@/lib/municipal-events/server";
import type {
  ReportData,
  ReportEvent,
  ReportTarget,
  ReportRegistration,
  ReportAttendance,
  ReportProfile,
} from "@/app/dashboard/provincial/reports/simpleReportData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 500;
const ID_BATCH_SIZE = 100;

// Paginate every query so the Supabase default row limit cannot truncate reports.
async function readAll<T>(
  query: (from: number, to: number) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function readBatches<T>(
  values: string[],
  query: (ids: string[], from: number, to: number) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const result: T[] = [];
  const ids = [...new Set(values.filter(Boolean))];
  for (let i = 0; i < ids.length; i += ID_BATCH_SIZE) {
    const batch = ids.slice(i, i + ID_BATCH_SIZE);
    result.push(...await readAll<T>((from, to) => query(batch, from, to)));
  }
  return result;
}

export async function GET(request: Request) {
  try {
    // CRITICAL: All service-role queries below are behind this existing
    // server-side authentication, active-account, approved-profile and role guard.
    // Never move service-role access into the client component.
    await eventActor(request, "provincial_admin");

    const columns = "id,title,status,start_at,end_at,created_at,event_origin";
    const [provincialEvents, municipalEvents] = await Promise.all([
      readAll<ReportEvent>((from, to) =>
        supabaseAdmin.from("events")
          .select(columns)
          .eq("event_origin", "provincial")
          .order("id")
          .range(from, to)),
      // Match the existing Provincial Admin > Municipal Events monitoring scope.
      // Draft/unapproved municipal events must NOT leak into provincial analytics.
      readAll<ReportEvent>((from, to) =>
        supabaseAdmin.from("events")
          .select(columns)
          .eq("event_origin", "municipal")
          .neq("status", "draft")
          .not("municipal_approval_recorded_at", "is", null)
          .not("municipal_approval_recorded_by", "is", null)
          .order("id")
          .range(from, to)),
    ]);

    const events = Array.from(
      new Map([...provincialEvents, ...municipalEvents].map((event) => [event.id, event])).values(),
    );
    const targets = await readBatches<ReportTarget>(
      events.map((event) => event.id),
      (ids, from, to) => supabaseAdmin.from("event_municipalities")
        .select("id,event_id,municipality,municipal_status")
        .in("event_id", ids)
        .order("id")
        .range(from, to),
    );
    const registrations = await readBatches<ReportRegistration>(
      targets.map((target) => target.id),
      (ids, from, to) => supabaseAdmin.from("rsvps")
        .select("id,event_municipality_id,user_id,status")
        .in("event_municipality_id", ids)
        .eq("status", "registered")
        .order("id")
        .range(from, to),
    );
    const [attendance, profiles] = await Promise.all([
      readBatches<ReportAttendance>(
        registrations.map((registration) => registration.id),
        (ids, from, to) => supabaseAdmin.from("attendance")
          .select("id,rsvp_id,status,method,checked_in_at,checked_out_at,updated_at")
          .in("rsvp_id", ids)
          .order("id")
          .range(from, to),
      ),
      readBatches<ReportProfile>(
        registrations.map((registration) => registration.user_id),
        (ids, from, to) => supabaseAdmin.from("profiles")
          .select("id,full_name,participant_category,participant_category_other")
          .in("id", ids)
          .order("id")
          .range(from, to),
      ),
    ]);

    const data: ReportData = { events, targets, registrations, attendance, profiles };
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    // Keep authentication errors precise but do not expose internal database
    // errors from the service-role reporting query to the browser.
    if (error instanceof EventRequestError) return eventFailure(error);
    console.error("Provincial reports fetch failed:", error);
    return eventFailure(new EventRequestError("Unable to load provincial reports. Try again.", 503));
  }
}
