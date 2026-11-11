import { MUNICIPALITIES } from "@/lib/municipalities";

export type ReportEvent = {
  id: string;
  event_origin: "provincial" | "municipal";
  title: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  created_at: string | null;
};

export type ReportTarget = {
  municipal_status?: string | null;
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
  checked_out_at: string | null;
  method?: string | null;
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
  eventId: string;
  participantQuery: string;
  municipality: string;
  from: string;
  to: string;
  category: string;
  source?: string;
};

export const emptyReportFilters: ReportFilters = {
  eventQuery: "",
  eventId: "all",
  participantQuery: "",
  municipality: "all",
  from: "",
  to: "",
  category: "all",
};

export const reportCategories: [string, string][] = [
  ["farmer", "Farmer"],
  ["fisherman", "Fisherman"],
  ["senior_citizen", "Senior Citizen"],
  ["4ps", "4Ps"],
  ["others", "Others"],
  ["uncategorized", "Uncategorized"],
];

export const reportMunicipalities = [...MUNICIPALITIES];

export function categoryKey(value: string | null | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_") || "uncategorized";
}

export function phDay(value: string | null): string {
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

export function reportStatus(event: ReportEvent, now: number): string {
  const status = (event.status || "").trim().toLowerCase();
  if (["draft", "cancelled", "completed"].includes(status)) return status;
  const end = Date.parse(event.end_at || "");
  const start = Date.parse(event.start_at || "");
  if (Number.isFinite(end) && now >= end) return "completed";
  if (Number.isFinite(start) && now >= start) return "ongoing";
  return status === "ongoing" ? "ongoing" : "upcoming";
}

export type ParticipantReportRow = {
  id: string;
  userId: string;
  name: string;
  municipality: string;
  category: string;
  categoryKey: string;
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  status: "Present" | "Late" | "Pending" | "Absent";
  checkedInAt: string | null;
  checkedOutAt: string | null;
  method: "qr" | "manual" | null;
};

export type AttendanceSummary = {
  registrations: number;
  attended: number;
  present: number;
  late: number;
  pending: number;
  absent: number;
  /** Participants with a recorded check-in and check-out. */
  timedOut: number;
  /** Rate across all eligible registrations. On an ongoing event it is not final. */
  participationRate: number | null;
  /** Rate using registrations only in completed events. */
  finalRate: number | null;
  /** Number of attended registrations in eligible completed events (numerator). */
  completedAttended: number;
  /** Number of eligible registrations in completed events (denominator). */
  completedRegistrations: number;
};

export type EventReportDetail = {
  eventId: string;
  municipalityBreakdown: Array<{
    municipality: string;
  } & AttendanceSummary>;
  categoryBreakdown: Array<{
    category: string;
    categoryKey: string;
  } & AttendanceSummary>;
  totals: AttendanceSummary;
  /** Actual participants whose Time-Out is recorded for this event. */
  timeOutRecords: Array<{
    rsvpId: string;
    name: string;
    municipality: string;
    checkedInAt: string;
    checkedOutAt: string;
  }>;
};

function hasAttended(row: ParticipantReportRow): boolean {
  return row.status === "Present" || row.status === "Late";
}

function counts(rows: ParticipantReportRow[]): AttendanceSummary {
  const completed = rows.filter((r) => r.eventStatus === "completed");
  const present = rows.filter((r) => r.status === "Present").length;
  const late = rows.filter((r) => r.status === "Late").length;
  const attended = present + late;
  const finalAttended = completed.filter(hasAttended).length;
  return {
    registrations: rows.length,
    attended,
    present,
    late,
    pending: rows.filter((r) => r.status === "Pending").length,
    absent: rows.filter((r) => r.status === "Absent").length,
    timedOut: rows.filter((r) => hasAttended(r) && r.checkedInAt && r.checkedOutAt).length,
    participationRate: rows.length
      ? Math.round((attended / rows.length) * 100)
      : null,
    finalRate: completed.length
      ? Math.round((finalAttended / completed.length) * 100)
      : null,
    completedAttended: finalAttended,
    completedRegistrations: completed.length,
  };
}

function newestAttendance(rows: ReportAttendance[]): Map<string, ReportAttendance> {
  const selected = new Map<string, ReportAttendance>();
  for (const row of rows) {
    if (!row.rsvp_id) continue;
    const current = selected.get(row.rsvp_id);
    const attended = (r: ReportAttendance) =>
      ["present", "late"].includes(r.status.trim().toLowerCase());
    if (
      !current ||
      (attended(row) && !attended(current)) ||
      (attended(row) === attended(current) &&
        (row.updated_at || row.checked_in_at || "") >
          (current.updated_at || current.checked_in_at || ""))
    ) {
      selected.set(row.rsvp_id, row);
    }
  }
  return selected;
}

export function buildSimpleReports(
  data: ReportData,
  filters: ReportFilters,
  participantTab: boolean,
  now: number,
) {
  const eventQuery = filters.eventQuery.trim().replace(/\s+/g, " ").toLowerCase();
  // Search by the full or partial municipality name. When empty, all
  // 18 municipalities remain visible, including zero-activity rows.
  const municipalityQuery = filters.municipality === "all"
    ? ""
    : filters.municipality.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
  const municipalityMatches = (value: string) =>
    !municipalityQuery || value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en").includes(municipalityQuery);
  const events = data.events.filter((event) => {
    if (["draft", "cancelled"].includes((event.status || "").trim().toLowerCase())) return false;
    if (filters.source && filters.source !== "all" && event.event_origin !== filters.source) return false;
    // Exact event selection uses the stable event ID, not a possibly repeated title.
    if (filters.eventId && filters.eventId !== "all" && event.id !== filters.eventId) return false;
    const title = (event.title || "Untitled Event").replace(/\s+/g, " ").toLowerCase();
    if (eventQuery && !title.includes(eventQuery)) return false;
    if (filters.from || filters.to) {
      const day = phDay(event.start_at);
      if (!day || (filters.from && day < filters.from) || (filters.to && day > filters.to)) {
        return false;
      }
    }
    return (
      !municipalityQuery ||
      data.targets.some((target) =>
        target.event_id === event.id && municipalityMatches(target.municipality),
      )
    );
  });

  const eventMap = new Map(events.map((event) => [event.id, event]));
  const targets = data.targets.filter((target) =>
    eventMap.has(target.event_id) && target.municipal_status !== "cancelled" && municipalityMatches(target.municipality),
  );
  const targetMap = new Map(targets.map((target) => [target.id, target]));
  const profiles = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const attendanceMap = newestAttendance(data.attendance);

  const participants: ParticipantReportRow[] = [];
  const seen = new Set<string>();
  for (const registration of data.registrations) {
    if (registration.status !== "registered" || seen.has(registration.id)) continue;
    seen.add(registration.id);
    const target = targetMap.get(registration.event_municipality_id);
    const event = target && eventMap.get(target.event_id);
    if (!target || !event) continue;
    const eventStatus = reportStatus(event, now);
    if (eventStatus === "draft" || eventStatus === "cancelled") continue;

    const profile = profiles.get(registration.user_id);
    const key = categoryKey(profile?.participant_category);
    if (participantTab && filters.category !== "all" && key !== filters.category) continue;
    const name = profile?.full_name?.trim() || "Profile unavailable";
    const nameQuery = filters.participantQuery.trim().replace(/\s+/g, " ").toLowerCase();
    if (participantTab && nameQuery &&
        !name.replace(/\s+/g, " ").toLowerCase().includes(nameQuery)) continue;

    const checkIn = attendanceMap.get(registration.id);
    const attendanceStatus = checkIn?.status.trim().toLowerCase();
    const status: ParticipantReportRow["status"] =
      attendanceStatus === "present" ? "Present" :
      attendanceStatus === "late" ? "Late" :
      eventStatus === "completed" ? "Absent" : "Pending";
    const categoryLabel = reportCategories.find(([value]) => value === key)?.[1]
      || key.replaceAll("_", " ");

    participants.push({
      id: registration.id,
      userId: registration.user_id,
      name,
      municipality: target.municipality,
      category: key === "others" && profile?.participant_category_other
        ? `Others — ${profile.participant_category_other}` : categoryLabel,
      categoryKey: key,
      eventId: event.id,
      eventTitle: event.title || "Untitled Event",
      eventStatus,
      status,
      checkedInAt: checkIn?.checked_in_at || null,
      checkedOutAt: checkIn?.checked_out_at || null,
      method: checkIn?.method === "qr" || checkIn?.method === "manual" ? checkIn.method : null,
    });
  }

  participants.sort((a, b) =>
    a.eventTitle.localeCompare(b.eventTitle) ||
    a.municipality.localeCompare(b.municipality) ||
    a.name.localeCompare(b.name),
  );

  const participantsByEvent = new Map<string, ParticipantReportRow[]>();
  const participantsByMunicipality = new Map<string, ParticipantReportRow[]>();
  for (const participant of participants) {
    const byEvent = participantsByEvent.get(participant.eventId) || [];
    byEvent.push(participant);
    participantsByEvent.set(participant.eventId, byEvent);
    const byMunicipality = participantsByMunicipality.get(participant.municipality) || [];
    byMunicipality.push(participant);
    participantsByMunicipality.set(participant.municipality, byMunicipality);
  }

  const eventRows = events.map((event) => ({
    id: event.id,
    origin: event.event_origin,
    title: event.title || "Untitled Event",
    start: event.start_at,
    end: event.end_at,
    status: reportStatus(event, now),
    municipalities: [...new Set(targets.filter((t) => t.event_id === event.id)
      .map((t) => t.municipality))],
    ...counts(participantsByEvent.get(event.id) || []),
  }));

  // Display all 18 municipalities by default (including zero-activity rows).
  // When searching, display only matching municipality names, not an
  // invented row using the typed search string. Preserve unexpected stored
  // municipality names so activity is never silently discarded.
  const municipalityNames = [
    ...new Set([...reportMunicipalities, ...targets.map((target) => target.municipality)]),
  ].filter(municipalityMatches);
  const municipalityRows = municipalityNames
    .sort((a, b) => a.localeCompare(b))
    .map((municipality) => ({
      municipality,
      assignedEvents: new Set(targets.filter((target) =>
        target.municipality === municipality).map((target) => target.event_id)).size,
      ...counts(participantsByMunicipality.get(municipality) || []),
    }));

  const eventDetails: EventReportDetail[] = eventRows.map((event) => {
    const eventParticipants = participantsByEvent.get(event.id) || [];
    const municipalNames = event.municipalities;
    const municipalityBreakdown = municipalNames.map((municipality) => ({
      municipality,
      ...counts(eventParticipants.filter((p) => p.municipality === municipality)),
    }));
    const categoryKeys = [...new Set(eventParticipants.map((p) => p.categoryKey))]
      .sort();
    const categoryBreakdown = categoryKeys.map((key) => ({
      category: reportCategories.find(([value]) => value === key)?.[1]
        || key.replaceAll("_", " "),
      categoryKey: key,
      ...counts(eventParticipants.filter((p) => p.categoryKey === key)),
    }));
    return {
      eventId: event.id,
      municipalityBreakdown,
      categoryBreakdown,
      totals: counts(eventParticipants),
      timeOutRecords: eventParticipants
        .filter((p) => hasAttended(p) && p.checkedInAt && p.checkedOutAt)
        .map((p) => ({
          rsvpId: p.id,
          name: p.name,
          municipality: p.municipality,
          checkedInAt: p.checkedInAt!,
          checkedOutAt: p.checkedOutAt!,
        }))
        .sort((a, b) => b.checkedOutAt.localeCompare(a.checkedOutAt)),
    };
  });

  return {
    participants,
    eventRows,
    municipalityRows,
    eventDetails,
    summary: { events: events.length, ...counts(participants) },
  };
}

/** CSV escaping plus spreadsheet-formula neutralization for user-controlled values. */
export function csvText(rows: (string | number | null)[][]): string {
  return "\uFEFF" + rows.map((row) => row.map((cell) => {
    const raw = String(cell ?? "");
    const safe = /^\s*[=+@\-]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
}
