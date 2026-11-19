"use client";
import { useMemo, useState } from "react";
import ReportWorkspace from "../../components/reports/ReportWorkspace";
import useSimpleReports from "./hooks/useSimpleReports";
import {
  buildSimpleReports,
  emptyReportFilters,
  reportMunicipalities,
} from "./simpleReportData";
import SearchableEventSelect from "./components/SearchableEventSelect";

const control =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
export default function ProvincialReportsPage() {
  const { data, loading, error, loadedAt, refresh } = useSimpleReports();
  const [filters, setFilters] = useState({
    ...emptyReportFilters,
    source: "all",
  });
  const eventOptionsFor = (municipality: string, source: string) => {
    const assignedIds = new Set(
      data.targets
        .filter(
          (target) =>
            target.municipality === municipality &&
            target.municipal_status !== "cancelled",
        )
        .map((target) => target.event_id),
    );

    return data.events
      .filter(
        (event) =>
          !["draft", "cancelled"].includes(
            (event.status || "").trim().toLowerCase(),
          ) &&
          (municipality === "all" || assignedIds.has(event.id)) &&
          (source === "all" || event.event_origin === source),
      )
      .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  };

  const eventOptions = eventOptionsFor(filters.municipality, filters.source);
  const eventId = eventOptions.some((event) => event.id === filters.eventId)
    ? filters.eventId
    : "all";

  const update = (key: string, value: string) =>
    setFilters((previous) => {
      const next = { ...previous, [key]: value, eventId };

      if (
        (key === "municipality" || key === "source") &&
        !eventOptionsFor(next.municipality, next.source).some(
          (event) => event.id === next.eventId,
        )
      ) {
        next.eventId = "all";
      }

      return next;
    });

  const invalid = Boolean(
    filters.from && filters.to && filters.from > filters.to,
  );

  const result = useMemo(
    () =>
      buildSimpleReports(data, { ...filters, eventId }, false, loadedAt || 0),
    [data, filters, eventId, loadedAt],
  );

  const selectedEventTitle =
    eventId === "all"
      ? "All"
      : eventOptions.find((event) => event.id === eventId)?.title ||
        "Selected event";
  const description = [
    `Event: ${selectedEventTitle}`,
    `Municipality: ${
      filters.municipality === "all"
        ? "All 18 municipalities"
        : filters.municipality
    }`,
    `Source: ${
      filters.source === "all"
        ? "All sources"
        : filters.source === "municipal"
          ? "Municipal"
          : "Provincial"
    }`,
    `Event start date (PH): ${filters.from || "Any"} to ${filters.to || "Any"}`,
  ].join(" · ");
  const controls = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div className="min-w-0">
        <SearchableEventSelect
          events={eventOptions}
          value={eventId}
          onChange={(eventId) =>
            setFilters((previous) => ({
              ...previous,
              eventId,
              eventQuery: "",
            }))
          }
        />
      </div>
      <label className="min-w-0 text-xs font-semibold">
        Municipality
        <select
          className={control}
          value={filters.municipality}
          onChange={(e) => update("municipality", e.target.value)}
        >
          <option value="all">All 18 municipalities</option>
          {reportMunicipalities.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-xs font-semibold">
        Event source
        <select
          className={control}
          value={filters.source}
          onChange={(e) => update("source", e.target.value)}
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
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => update("from", e.target.value)}
        />
      </label>
      <label className="min-w-0 text-xs font-semibold">
        To (PH)
        <input
          type="date"
          className={control}
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => update("to", e.target.value)}
        />
      </label>
      <button
        className={`${control} self-end font-semibold`}
        onClick={() => setFilters({ ...emptyReportFilters, source: "all" })}
      >
        Clear filters
      </button>
    </div>
  );
  return (
    <ReportWorkspace
      provincial
      loading={loading}
      error={invalid ? "From date must be on or before To date." : error}
      updatedAt={loadedAt}
      onRefresh={() => void refresh()}
      filters={controls}
      filterDescription={description}
      events={result.eventRows.map((e) => ({
        id: e.id,
        title: e.title,
        source: e.origin === "municipal" ? "Municipal" : "Provincial",
        municipality: e.municipalities.join(", ") || "Unassigned",
        start: e.start,
        end: e.end,
        status: e.status,
        registered: e.registrations,
        present: e.present,
        late: e.late,
        absent: e.absent,
        pending: e.pending,
      }))}
      people={result.participants.map((p) => ({
        id: p.id,
        eventId: p.eventId,
        name: p.name,
        municipality: p.municipality,
        category: p.category,
        status: p.status === "Pending" ? "Awaiting time-in" : p.status,
        timeIn: p.checkedInAt,
        timeOut: p.checkedOutAt,
        method: p.method,
      }))}
      participation={result.municipalityRows.map((m) => ({
        name: m.municipality,
        events: m.assignedEvents,
        registered: m.registrations,
        attended: m.attended,
        finalRate: m.finalRate,
      }))}
    />
  );
}
