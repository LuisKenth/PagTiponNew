import type { EventAssignment } from "./types";
const time = (value: string | null | undefined) => Date.parse(value || "");
export function staffEventStatus(a: EventAssignment, now: number) {
  const status = (a.event.status || "").trim().toLowerCase();
  if (status === "cancelled" || a.municipal_status === "cancelled")
    return "cancelled";
  if (status === "draft" || status === "completed") return status;
  const start = time(a.event.start_at),
    end = time(a.event.end_at);
  if (now > 0 && Number.isFinite(end) && now >= end) return "completed";
  if (now > 0 && Number.isFinite(start) && now >= start) return "ongoing";
  return status === "published" ? "upcoming" : status;
}
export function checkoutDeadline(a: EventAssignment) {
  const override = time(a.check_out_deadline_at),
    end = time(a.event.end_at);
  return Number.isFinite(override)
    ? override
    : Number.isFinite(end)
      ? end + 7200000
      : NaN;
}
// null means reference-only, never an automatic default.
export function staffEventPriority(
  a: EventAssignment,
  now: number,
): number | null {
  if (now <= 0) return null;
  const status = staffEventStatus(a, now),
    start = time(a.event.start_at),
    end = time(a.event.end_at);
  if (
    ["draft", "cancelled"].includes(status) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start
  )
    return null;
  const inWindow = status !== "completed" && now >= start && now < end;
  const outWindow =
    now >= end && now < checkoutDeadline(a) && Boolean(a.check_in_opened_at);
  if (
    (inWindow && a.check_in_opened_at && !a.check_in_closed_at) ||
    (outWindow && a.check_out_opened_at && !a.check_out_closed_at)
  )
    return 0;
  if (inWindow) return 1;
  if (outWindow) return 2;
  if (status === "upcoming" && now < start) return 3;
  return null;
}
export function sortStaffEvents(assignments: EventAssignment[], now: number) {
  return [...assignments].sort(
    (a, b) =>
      (staffEventPriority(a, now) ?? 99) - (staffEventPriority(b, now) ?? 99) ||
      (time(a.event.start_at) || 0) - (time(b.event.start_at) || 0) ||
      String(a.id).localeCompare(String(b.id)),
  );
}
export function preferredStaffEvent(
  assignments: EventAssignment[],
  now: number,
) {
  return (
    sortStaffEvents(assignments, now).find(
      (a) => staffEventPriority(a, now) !== null,
    ) ?? null
  );
}
export function preserveStaffSelection(
  assignments: EventAssignment[],
  currentId: string,
) {
  return assignments.find((a) => String(a.id) === currentId) ?? null;
}
