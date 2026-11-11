"use client";
import { useState } from "react";
import ReportWorkspace, {
  type EventRow,
} from "../../components/reports/ReportWorkspace";
import useMunicipalReports from "./hooks/useMunicipalReports";
import SearchableEventSelect from "../../provincial/reports/components/SearchableEventSelect";
const control =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
export default function MunicipalReportsPage() {
  const r = useMunicipalReports();
  const [source, setSource] = useState("all");
  const events = r.filteredEvents.filter(
    (e) => source === "all" || e.eventOrigin === source,
  );
  const ids = new Set(events.map((e) => e.eventMunicipalityId));
  const invalid = Boolean(r.dateFrom && r.dateTo && r.dateFrom > r.dateTo);

  const selectedEventTitle =
    r.selectedEventId === "all"
      ? "All"
      : r.reportEvents.find(
          (event) => event.eventMunicipalityId === r.selectedEventId,
        )?.eventTitle || "Selected event";

  const description = [
    `Municipality: ${r.municipality || "Your municipality"}`,
    `Event: ${selectedEventTitle}`,
    `Source: ${
      source === "all"
        ? "All sources"
        : source === "municipal"
          ? "Municipal"
          : "Provincial"
    }`,
    `Event start date (PH): ${r.dateFrom || "Any"} to ${r.dateTo || "Any"}`,
  ].join(" · ");
  const controls = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div className="min-w-0">
        <SearchableEventSelect
          events={r.reportEvents
            .filter((event) => source === "all" || event.eventOrigin === source)
            .map((event) => ({
              id: event.eventMunicipalityId,
              title: `${event.eventTitle} · ${
                event.eventOrigin === "municipal" ? "Municipal" : "Provincial"
              }`,
              start_at: event.startAt,
              status: event.eventStatus,
            }))
            .sort((a, b) => a.title.localeCompare(b.title))}
          value={r.selectedEventId}
          onChange={(eventId) => {
            r.setSearchTerm("");
            r.changeSelectedEvent(eventId);
          }}
        />
      </div>
      <label className="min-w-0 text-xs font-semibold">
        Event source
        <select
          className={control}
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            r.setSearchTerm("");
            r.changeSelectedEvent("all");
          }}
        >
          <option value="all">All sources</option>
          <option value="provincial">Provincial</option>
          <option value="municipal">Municipal</option>
        </select>
      </label>
      <label className="min-w-0 text-xs font-semibold">
        From (PH)
        <input
          type="date"
          className={control}
          value={r.dateFrom}
          max={r.dateTo || undefined}
          onChange={(e) => r.setDateFrom(e.target.value)}
        />
      </label>
      <label className="min-w-0 text-xs font-semibold">
        To (PH)
        <input
          type="date"
          className={control}
          value={r.dateTo}
          min={r.dateFrom || undefined}
          onChange={(e) => r.setDateTo(e.target.value)}
        />
      </label>
      <button
        className={`${control} self-end font-semibold`}
        onClick={() => {
          r.clearFilters();
          setSource("all");
        }}
      >
        Clear filters
      </button>
    </div>
  );
  return (
    <ReportWorkspace
      provincial={false}
      municipality={r.municipality}
      loading={r.loading}
      error={
        invalid ? "From date must be on or before To date." : r.errorMessage
      }
      updatedAt={r.lastUpdatedAt}
      onRefresh={() => void r.refreshReports()}
      filters={controls}
      filterDescription={description}
      events={events.map(
        (e): EventRow => ({
          id: e.eventMunicipalityId,
          title: e.eventTitle,
          source: e.eventOrigin === "municipal" ? "Municipal" : "Provincial",
          municipality: r.municipality || "—",
          start: e.startAt,
          end: e.endAt,
          status: e.eventStatus,
          registered: e.totalRegistrations,
          present: e.presentCount,
          late: e.lateCount,
          absent: e.absentCount,
          pending: e.pendingCount,
        }),
      )}
      people={r.participantRows
        .filter((p) => ids.has(p.eventMunicipalityId))
        .map((p) => ({
          id: p.rsvpId,
          eventId: p.eventMunicipalityId,
          name: p.participantName,
          municipality: r.municipality || "—",
          category: p.categoryLabel,
          status:
            p.attendanceStatus === "pending"
              ? "Awaiting time-in"
              : p.attendanceStatus,
          timeIn: p.checkedInAt,
          timeOut: p.checkedOutAt,
          method: p.method,
        }))}
      participation={[]}
    />
  );
}
