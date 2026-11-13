import { supabase } from "@/lib/supabase";

export type Staff = {
  id: string;
  full_name: string | null;
  email: string | null;
  verification_status: string;
};
export type Assignment = {
  id: string;
  event_municipality_id: string;
  staff_id: string;
  status: string;
  staff: Staff | null;
};
export type StaffEvent = {
  id: string;
  event_id: string;
  local_venue_id: string | null;
  event: { title: string; start_at: string | null; end_at: string | null };
};
export type ScheduleAssignment = {
  staffId: string;
  assignmentId: string;
  title: string;
  start: string | null;
  end: string | null;
};
export type StaffData = {
  scheduleAssignments: ScheduleAssignment[];
  staff: Staff[];
  events: StaffEvent[];
  assignments: Assignment[];
};
export const emptyStaffData: StaffData = {
  scheduleAssignments: [],
  staff: [],
  events: [],
  assignments: [],
};
export const staffButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50";
export const staffPrimaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
export function formatStaffDate(value: string | null) {
  return value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not scheduled";
}
export function schedulesOverlap(
  start: string | null,
  end: string | null,
  otherStart: string | null,
  otherEnd: string | null,
) {
  const v = [start, end, otherStart, otherEnd].map((x) => Date.parse(x || ""));
  return (
    v.every(Number.isFinite) &&
    v[0] < v[1] &&
    v[2] < v[3] &&
    v[0] < v[3] &&
    v[2] < v[1]
  );
}
export async function staffRequest(
  method: "GET" | "POST" | "PATCH",
  body?: object,
  signal?: AbortSignal,
) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again.");
  const response = await fetch("/api/municipal/event-staff/assignments", {
    method,
    signal,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "Unable to load or update staff assignments.",
    );
  return result;
}
export async function readStaffData(signal?: AbortSignal): Promise<StaffData> {
  const result = await staffRequest("GET", undefined, signal);
  return {
    scheduleAssignments: result.scheduleAssignments || [],
    staff: result.staff || [],
    events: result.events || [],
    assignments: result.assignments || [],
  };
}
export function notifyStaffChanged() {
  window.dispatchEvent(new Event("pagtipon:staff-assignments-changed"));
}
