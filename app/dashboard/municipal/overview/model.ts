export type MunicipalEvent = {
  id: string;
  title: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
};
export type MunicipalAssignment = {
  id: string;
  event_id: string;
  municipality: string | null;
  municipal_status: string | null;
  created_at: string | null;
};
export type MunicipalRegistration = {
  id: string;
  event_municipality_id: string;
  status: string | null;
};
export type MunicipalAttendance = {
  id: string;
  rsvp_id: string | null;
  event_municipality_id: string;
  status: string | null;
};
export type MunicipalOverviewData = {
  municipality: string;
  fullName: string | null;
  events: MunicipalEvent[];
  assignments: MunicipalAssignment[];
  registrations: MunicipalRegistration[];
  attendance: MunicipalAttendance[];
  loadedAt: string | null;
};
export const EMPTY_OVERVIEW: MunicipalOverviewData = {
  municipality: "",
  fullName: null,
  events: [],
  assignments: [],
  registrations: [],
  attendance: [],
  loadedAt: null,
};
export const MUNICIPAL_EVENT_STATES = [
  { key: "upcoming", label: "Upcoming", color: "#6366f1" },
  { key: "ongoing", label: "Ongoing", color: "#10b981" },
  { key: "completed", label: "Completed", color: "#94a3b8" },
  { key: "cancelled", label: "Cancelled", color: "#f87171" },
  { key: "unscheduled", label: "Unscheduled", color: "#f59e0b" },
] as const;
export type MunicipalEventState =
  (typeof MUNICIPAL_EVENT_STATES)[number]["key"];
const normalized = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase();
export function municipalEventState(
  event: MunicipalEvent,
  assignment: MunicipalAssignment,
  now: number,
): MunicipalEventState {
  if (
    normalized(event.status) === "cancelled" ||
    normalized(assignment.municipal_status) === "cancelled"
  )
    return "cancelled";
  if (normalized(event.status) === "completed") return "completed";
  const start = Date.parse(event.start_at || ""),
    end = Date.parse(event.end_at || "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return "unscheduled";
  if (now >= end) return "completed";
  if (now >= start) return "ongoing";
  return "upcoming";
}
export function preparationLabel(value: string | null) {
  const status = normalized(value);
  if (status === "prepared") return "Prepared";
  if (["preparing", "in_progress"].includes(status)) return "Preparing";
  return "Pending";
}
export function municipalOverviewMetrics(
  data: MunicipalOverviewData,
  now: number,
) {
  const events = new Map(
    data.events
      .filter((event) => normalized(event.status) !== "draft")
      .map((event) => [event.id, event]),
  );
  const assignments = [
    ...new Map(data.assignments.map((row) => [row.id, row])).values(),
  ].filter(
    (row) =>
      normalized(row.municipality) === normalized(data.municipality) &&
      events.has(row.event_id),
  );
  const rows = assignments.map((assignment) => {
    const event = events.get(assignment.event_id)!;
    return {
      assignment,
      event,
      state: municipalEventState(event, assignment, now),
    };
  });
  const byAssignment = new Map(rows.map((row) => [row.assignment.id, row]));
  const registrations = [
    ...new Map(data.registrations.map((row) => [row.id, row])).values(),
  ].filter(
    (row) =>
      normalized(row.status) === "registered" &&
      byAssignment.has(row.event_municipality_id) &&
      byAssignment.get(row.event_municipality_id)!.state !== "cancelled",
  );
  const completedRegistrations = registrations.filter(
    (row) => byAssignment.get(row.event_municipality_id)!.state === "completed",
  );
  const eligible = new Map(completedRegistrations.map((row) => [row.id, row]));
  const attended = new Set(
    data.attendance
      .filter(
        (row) =>
          row.rsvp_id &&
          eligible.has(row.rsvp_id) &&
          row.event_municipality_id ===
            eligible.get(row.rsvp_id)!.event_municipality_id &&
          ["present", "late"].includes(normalized(row.status)),
      )
      .map((row) => row.rsvp_id),
  ).size;
  const counts: Record<MunicipalEventState, number> = {
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
    unscheduled: 0,
  };
  for (const row of rows) counts[row.state]++;
  const needsPreparation = rows.filter(
    (row) =>
      row.state === "upcoming" &&
      preparationLabel(row.assignment.municipal_status) !== "Prepared",
  ).length;
  const active = rows
    .filter((row) => row.state === "upcoming" || row.state === "ongoing")
    .sort(
      (a, b) =>
        (a.state === "ongoing" ? 0 : 1) - (b.state === "ongoing" ? 0 : 1) ||
        Date.parse(a.event.start_at!) - Date.parse(b.event.start_at!) ||
        a.assignment.id.localeCompare(b.assignment.id),
    );
  return {
    received: rows.length,
    counts,
    needsPreparation,
    registrations: registrations.length,
    completedRegistrations: completedRegistrations.length,
    attended,
    attendanceRate: completedRegistrations.length
      ? Math.round((attended / completedRegistrations.length) * 100)
      : null,
    active,
    preview: active.slice(0, 5),
    assignments,
  };
}
export function municipalDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not scheduled";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
export function municipalNotificationDestination(
  assignments: MunicipalAssignment[],
  assignmentId: string,
  eventId: string,
  notificationType: string,
) {
  const target =
    assignments.find((row) => assignmentId && row.id === assignmentId) ||
    assignments.find((row) => eventId && row.event_id === eventId);
  if (!target) return null;
  const params = new URLSearchParams({ assignmentId: target.id });
  if (notificationType) params.set("notificationType", notificationType);
  return "/dashboard/municipal/preparations?" + params;
}
