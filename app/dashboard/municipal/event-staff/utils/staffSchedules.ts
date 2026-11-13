export type ScheduleRow = {
  id: string;
  staffId: string;
  staffName: string;
  staffStatus: string;
  eventMunicipalityId: string;
  eventId: string;
  title: string;
  source: string;
  start: string | null;
  end: string | null;
  eventStatus: string;
  municipalStatus: string | null;
  venue: string;
};
export type ScheduleStatus =
  "upcoming" | "ongoing" | "completed" | "cancelled" | "unknown";
export function scheduleStatus(row: ScheduleRow, now: number): ScheduleStatus {
  const status = (row.eventStatus || "").toLowerCase();
  if (status === "cancelled" || row.municipalStatus === "cancelled")
    return "cancelled";
  if (status === "completed") return "completed";
  const start = Date.parse(row.start || ""),
    end = Date.parse(row.end || "");
  if (Number.isFinite(end) && end <= now) return "completed";
  if (Number.isFinite(start) && Number.isFinite(end) && end > start)
    return start <= now ? "ongoing" : "upcoming";
  return status === "ongoing" ? "ongoing" : "unknown";
}
export function scheduleConflicts(rows: ScheduleRow[], now: number) {
  const result = new Map<string, ScheduleRow[]>();
  const eligible = rows.filter((r) =>
    ["upcoming", "ongoing"].includes(scheduleStatus(r, now)),
  );
  for (let i = 0; i < eligible.length; i++)
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i],
        b = eligible[j];
      if (
        a.staffId !== b.staffId ||
        a.eventMunicipalityId === b.eventMunicipalityId
      )
        continue;
      const as = Date.parse(a.start || ""),
        ae = Date.parse(a.end || ""),
        bs = Date.parse(b.start || ""),
        be = Date.parse(b.end || "");
      if (
        [as, ae, bs, be].every(Number.isFinite) &&
        ae > as &&
        be > bs &&
        as < be &&
        bs < ae
      ) {
        result.set(a.id, [...(result.get(a.id) || []), b]);
        result.set(b.id, [...(result.get(b.id) || []), a]);
      }
    }
  return result;
}
export type ScheduleFilters = {
  staffId: string;
  status: string;
  from: string;
  to: string;
};
export function filterSchedules(
  rows: ScheduleRow[],
  filters: ScheduleFilters,
  now: number,
) {
  const from = filters.from
    ? Date.parse(filters.from + "T00:00:00+08:00")
    : -Infinity;
  const to = filters.to
    ? Date.parse(filters.to + "T00:00:00+08:00") + 86400000
    : Infinity;
  return rows
    .filter((r) => {
      if (filters.staffId !== "all" && r.staffId !== filters.staffId)
        return false;
      if (filters.status !== "all" && scheduleStatus(r, now) !== filters.status)
        return false;
      if (!filters.from && !filters.to) return true;
      const start = Date.parse(r.start || ""),
        end = Date.parse(r.end || "");
      return (
        Number.isFinite(start) &&
        start < to &&
        (Number.isFinite(end) && end > start ? end > from : start >= from)
      );
    })
    .sort(
      (a, b) =>
        (Date.parse(a.start || "") || Infinity) -
          (Date.parse(b.start || "") || Infinity) ||
        a.staffName.localeCompare(b.staffName) ||
        a.id.localeCompare(b.id),
    );
}
export function scheduleDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
