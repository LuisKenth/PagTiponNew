import type {
  AttendanceRow,
  EventMunicipalityRow,
  EventRow,
  RSVPRow,
} from "./types";

export function eventDate(event: EventRow, end = false): string | null {
  const value = end
    ? (event.end_at ?? event.end_date)
    : (event.start_at ?? event.start_date);
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
}
export function eventStatus(event: EventRow, now: Date) {
  const saved = String(event.status ?? "draft").toLowerCase();
  if (saved === "draft" || saved === "cancelled" || saved === "completed")
    return saved;
  const start = eventDate(event),
    end = eventDate(event, true);
  if (end && Date.parse(end) < now.getTime()) return "completed";
  if (start && Date.parse(start) <= now.getTime()) return "ongoing";
  return "upcoming";
}
export function dashboardMetrics(
  events: EventRow[],
  assignments: EventMunicipalityRow[],
  rsvps: RSVPRow[],
  attendance: AttendanceRow[],
  now: Date,
) {
  const counts = {
    draft: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const event of events)
    counts[eventStatus(event, now) as keyof typeof counts]++;
  const registered = rsvps.filter(
    (row) => String(row.status ?? "registered").toLowerCase() !== "cancelled",
  );
  const ids = new Set(registered.map((row) => String(row.id)));
  const checkedIn = new Set(
    attendance
      .filter(
        (row) =>
          ids.has(String(row.rsvp_id)) &&
          ["present", "late"].includes(String(row.status).toLowerCase()),
      )
      .map((row) => String(row.rsvp_id)),
  ).size;
  const live = new Set(
    events
      .filter((event) =>
        ["upcoming", "ongoing"].includes(eventStatus(event, now)),
      )
      .map((event) => String(event.id)),
  );
  const activeAssignments = assignments.filter((row) =>
    live.has(String(row.event_id)),
  );
  const ready = activeAssignments.filter(
    (row) =>
      String(row.preparation_status ?? row.status).toLowerCase() === "ready" ||
      String(row.preparation_status ?? row.status).toLowerCase() === "prepared",
  ).length;
  const open = activeAssignments.filter(
    (row) =>
      row.registration_open === true || row.registration_status === "open",
  ).length;
  return {
    counts,
    registered: registered.length,
    checkedIn,
    rate: registered.length
      ? Math.round((checkedIn / registered.length) * 100)
      : 0,
    activeAssignments,
    ready,
    open,
  };
}
export function monthlyCreated(events: EventRow[], year: number) {
  const counts = Array<number>(12).fill(0);
  for (const event of events) {
    if (!event.created_at || !Number.isFinite(Date.parse(event.created_at)))
      continue;
    const parts = new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "numeric",
      timeZone: "Asia/Manila",
    }).formatToParts(new Date(event.created_at));
    const y = Number(parts.find((p) => p.type === "year")?.value),
      m = Number(parts.find((p) => p.type === "month")?.value);
    if (y === year) counts[m - 1]++;
  }
  return counts;
}
