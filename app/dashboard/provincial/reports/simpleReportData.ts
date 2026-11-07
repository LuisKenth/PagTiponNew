export type ReportEvent = {
  id: string;
  title: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  created_at: string | null;
};
export type ReportTarget = {
  id: string;
  event_id: string;
  municipality: string;
};
export type ReportRegistration = {
  id: string;
  event_municipality_id: string;
  user_id: string;
  status: string | null;
};
export type ReportAttendance = {
  id: string;
  rsvp_id: string | null;
  status: string;
  checked_in_at: string | null;
  updated_at?: string | null;
};
export type ReportProfile = {
  id: string;
  full_name: string | null;
  participant_category: string | null;
  participant_category_other: string | null;
};
export type ReportData = {
  events: ReportEvent[];
  targets: ReportTarget[];
  registrations: ReportRegistration[];
  attendance: ReportAttendance[];
  profiles: ReportProfile[];
};
export const emptyReportData: ReportData = {
  events: [],
  targets: [],
  registrations: [],
  attendance: [],
  profiles: [],
};
export type ReportFilters = {
  eventQuery: string;
  participantQuery: string;
  municipality: string;
  from: string;
  to: string;
  category: string;
};
export const emptyReportFilters: ReportFilters = {
  eventQuery: "",
  participantQuery: "",
  municipality: "all",
  from: "",
  to: "",
  category: "all",
};
export const reportCategories = [
  ["farmer", "Farmer"],
  ["fisherman", "Fisherman"],
  ["senior_citizen", "Senior Citizen"],
  ["4ps", "4Ps"],
  ["others", "Others"],
  ["uncategorized", "Uncategorized"],
];
export const reportMunicipalities = [
  "Anini-y",
  "Barbaza",
  "Belison",
  "Bugasong",
  "Caluya",
  "Culasi",
  "Hamtic",
  "Laua-an",
  "Libertad",
  "Pandan",
  "Patnongon",
  "San Jose de Buenavista",
  "San Remigio",
  "Sebaste",
  "Sibalom",
  "Tibiao",
  "Tobias Fornier",
  "Valderrama",
];
export function categoryKey(value: string | null | undefined) {
  return (
    (value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_") || "uncategorized"
  );
}
export function phDay(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function reportStatus(event: ReportEvent, now: number) {
  const status = (event.status || "").toLowerCase();
  if (["draft", "cancelled", "completed"].includes(status)) return status;
  const end = Date.parse(event.end_at || "");
  const start = Date.parse(event.start_at || "");
  if (Number.isFinite(end) && now >= end) return "completed";
  if (Number.isFinite(start) && now >= start) return "ongoing";
  return status === "ongoing" ? "ongoing" : "upcoming";
}
export type ParticipantReportRow = {
  id: string;
  name: string;
  municipality: string;
  category: string;
  categoryKey: string;
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  status: "Present" | "Late" | "Pending" | "Absent";
  checkedInAt: string | null;
};
function counts(rows: ParticipantReportRow[]) {
  const completed = rows.filter((r) => r.eventStatus === "completed");
  const attended = (list: ParticipantReportRow[]) =>
    list.filter((r) => r.status === "Present" || r.status === "Late").length;
  return {
    registrations: rows.length,
    attended: attended(rows),
    finalRate: completed.length
      ? Math.round((attended(completed) / completed.length) * 100)
      : null,
    completedRegistrations: completed.length,
  };
}
export function buildSimpleReports(
  data: ReportData,
  filters: ReportFilters,
  participantTab: boolean,
  now: number,
) {
  const profiles = new Map(data.profiles.map((p) => [p.id, p]));
  const events = data.events.filter((e) => {
    if ((e.status || "").trim().toLowerCase() === "draft") return false;
    const query = filters.eventQuery.trim().replace(/\s+/g, " ").toLowerCase();
    const title = (e.title || "Untitled Event")
      .replace(/\s+/g, " ")
      .toLowerCase();
    if (query && !title.includes(query)) return false;
    if (filters.from || filters.to) {
      const day = phDay(e.start_at);
      if (
        !day ||
        (filters.from && day < filters.from) ||
        (filters.to && day > filters.to)
      )
        return false;
    }
    return (
      filters.municipality === "all" ||
      data.targets.some(
        (t) => t.event_id === e.id && t.municipality === filters.municipality,
      )
    );
  });
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const targets = data.targets.filter(
    (t) =>
      eventMap.has(t.event_id) &&
      (filters.municipality === "all" ||
        t.municipality === filters.municipality),
  );
  const targetMap = new Map(targets.map((t) => [t.id, t]));
  const attended = (a: ReportAttendance) =>
    a.status === "present" || a.status === "late";
  const attendance = new Map<string, ReportAttendance>();
  for (const a of data.attendance) {
    if (!a.rsvp_id) continue;
    const previous = attendance.get(a.rsvp_id);
    if (
      !previous ||
      (attended(a) && !attended(previous)) ||
      (attended(a) === attended(previous) &&
        (a.updated_at || a.checked_in_at || "") >
          (previous.updated_at || previous.checked_in_at || ""))
    )
      attendance.set(a.rsvp_id, a);
  }
  const seen = new Set<string>();
  const participants: ParticipantReportRow[] = [];
  for (const registration of data.registrations) {
    if (registration.status !== "registered" || seen.has(registration.id))
      continue;
    seen.add(registration.id);
    const target = targetMap.get(registration.event_municipality_id);
    const event = target && eventMap.get(target.event_id);
    if (!target || !event) continue;
    const eventStatus = reportStatus(event, now);
    if (eventStatus === "draft" || eventStatus === "cancelled") continue;
    const profile = profiles.get(registration.user_id);
    const key = categoryKey(profile?.participant_category);
    if (
      participantTab &&
      filters.category !== "all" &&
      key !== filters.category
    )
      continue;
    const name = profile?.full_name?.trim() || "Profile unavailable";
    const nameQuery = filters.participantQuery
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
    if (
      participantTab &&
      nameQuery &&
      !name.replace(/\s+/g, " ").toLowerCase().includes(nameQuery)
    )
      continue;
    const a = attendance.get(registration.id);
    const status =
      a?.status === "present"
        ? "Present"
        : a?.status === "late"
          ? "Late"
          : eventStatus === "completed"
            ? "Absent"
            : "Pending";
    const label =
      reportCategories.find(([value]) => value === key)?.[1] ||
      key.replaceAll("_", " ");
    participants.push({
      id: registration.id,
      name,
      municipality: target.municipality,
      category:
        key === "others" && profile?.participant_category_other
          ? `Others — ${profile.participant_category_other}`
          : label,
      categoryKey: key,
      eventId: event.id,
      eventTitle: event.title || "Untitled Event",
      eventStatus,
      status,
      checkedInAt: a?.checked_in_at || null,
    });
  }
  participants.sort(
    (a, b) =>
      a.eventTitle.localeCompare(b.eventTitle) ||
      a.municipality.localeCompare(b.municipality) ||
      a.name.localeCompare(b.name),
  );
  const eventRows = events.map((event) => ({
    id: event.id,
    title: event.title || "Untitled Event",
    start: event.start_at,
    end: event.end_at,
    status: reportStatus(event, now),
    municipalities: [
      ...new Set(
        targets
          .filter((t) => t.event_id === event.id)
          .map((t) => t.municipality),
      ),
    ],
    ...counts(participants.filter((p) => p.eventId === event.id)),
  }));
  const municipalityRows = [...new Set(targets.map((t) => t.municipality))]
    .sort()
    .map((municipality) => ({
      municipality,
      assignedEvents: new Set(
        targets
          .filter((t) => t.municipality === municipality)
          .map((t) => t.event_id),
      ).size,
      ...counts(participants.filter((p) => p.municipality === municipality)),
    }));
  return {
    participants,
    eventRows,
    municipalityRows,
    summary: { events: events.length, ...counts(participants) },
  };
}
export function csvText(rows: (string | number | null)[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const raw = String(cell ?? "");
            const safe = /^[\s]*[=+@\-]/.test(raw) ? "'" + raw : raw;
            return '"' + safe.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
