"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import ProvincialPageHeader, {
  provincialHeaderButton,
} from "../components/ProvincialPageHeader";
import EventsTable from "../events/components/EventsTable";
import EventsFilters from "../events/components/EventsFilters";
import EventsStatusTabs from "../events/components/EventsStatusTabs";
import SummaryCard from "../events/components/SummaryCard";
import { getAutomaticEventStatus, getStatusClass } from "../events/utils";
import type {
  EventSortOption,
  EventStatusFilter,
  EventWithMunicipalities,
} from "../events/types";
import { municipalEventRequest, phDate } from "@/lib/municipal-events/client";
import type { MunicipalEvent } from "@/lib/municipal-events/types";
import VenueLocationButton from "@/app/components/VenueLocationButton";

export default function MunicipalEventsMonitor() {
  const [records, setRecords] = useState<MunicipalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [town, setTown] = useState("all");
  const [status, setStatus] = useState<EventStatusFilter>("all");
  const [sort, setSort] = useState<EventSortOption>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selected, setSelected] = useState<MunicipalEvent | null>(null);
  const [now, setNow] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await municipalEventRequest(
        "/api/provincial/municipal-events",
      );
      setRecords(result.events);
      setNow(Date.now());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load municipal events.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const events: EventWithMunicipalities[] = records.map((event) => ({
    ...event,
    created_at: null,
    municipalities: event.event_municipalities.map((assignment) => ({
      ...assignment,
      event_id: event.id,
      municipality: event.owner_municipality,
      preparation_status:
        assignment.municipal_status === "prepared"
          ? "ready"
          : assignment.municipal_status,
    })),
  }));
  const filtered = events.filter(
    (event) =>
      (status === "all" || getAutomaticEventStatus(event, now) === status) &&
      (town === "all" ||
        event.municipalities.some(
          (assignment) => assignment.municipality === town,
        )) &&
      [
        event.title,
        event.description,
        ...event.municipalities.map((assignment) => assignment.municipality),
      ].some((value) =>
        value?.toLowerCase().includes(search.trim().toLowerCase()),
      ),
  );
  if (sort === "title_asc")
    filtered.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  if (sort === "soonest" || sort === "latest")
    filtered.sort(
      (a, b) =>
        (Date.parse(a.start_at ?? "") - Date.parse(b.start_at ?? "")) *
        (sort === "soonest" ? 1 : -1),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const clear = () => {
    setSearch("");
    setTown("all");
    setStatus("all");
    setPage(1);
  };
  const active = events.filter((event) =>
    ["upcoming", "ongoing"].includes(getAutomaticEventStatus(event, now)),
  ).length;
  const completed = events.filter(
    (event) => getAutomaticEventStatus(event, now) === "completed",
  ).length;
  if (selected) {
    const assignment = selected.event_municipalities[0];
    const eventStatus = getAutomaticEventStatus(selected, now);
    return (
      <div className="space-y-6">
        <ProvincialPageHeader
          icon={<CalendarDays size={22} />}
          eyebrow={`Municipal Event · ${selected.owner_municipality}`}
          title={selected.title}
          description="Event information, schedule, and official documents."
          actions={
            <button
              type="button"
              className={provincialHeaderButton}
              onClick={() => setSelected(null)}
            >
              Back to Events
            </button>
          }
          footer={
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(eventStatus)}`}
            >
              {eventStatus}
            </span>
          }
        />
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Event Information</h2>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
              {selected.description || "No description provided."}
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs text-slate-500">Start · PH</dt>
                <dd className="mt-1 font-medium">
                  {phDate(selected.start_at)}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs text-slate-500">End · PH</dt>
                <dd className="mt-1 font-medium">{phDate(selected.end_at)}</dd>
              </div>
            </dl>
            <p className="text-sm">
              Audience ·{" "}
              {selected.audience_type === "all"
                ? "Open to all"
                : selected.audience_categories.join(", ") || "Not selected"}
              {selected.audience_category_other
                ? ` · ${selected.audience_category_other}`
                : ""}
            </p>
            <h3 className="font-semibold">Local Instructions</h3>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
              {assignment?.local_instructions || "None provided."}
            </p>
          </section>
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Municipal Preparation</h2>
            <p className="text-sm capitalize">
              Preparation · {assignment?.municipal_status || "Pending"}
            </p>
            <p className="text-sm">
              Registration · {assignment?.registration_open ? "Open" : "Closed"}
            </p>
            {assignment?.local_venue_id && (
              <VenueLocationButton
                venueId={assignment.local_venue_id}
                label="View venue map & photos"
              />
            )}
            <h3 className="font-semibold">Official Memo</h3>
            {selected.memo_url ? (
              <a
                className="block break-words text-sm text-indigo-700 underline"
                href={selected.memo_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selected.memo_filename || "Approval document"}
              </a>
            ) : (
              <p className="text-sm text-slate-500">No memo uploaded.</p>
            )}
            {selected.municipal_approval_recorded_at && (
              <p className="text-xs text-slate-500">
                Approval recorded ·{" "}
                {phDate(selected.municipal_approval_recorded_at)}
              </p>
            )}
          </section>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <ProvincialPageHeader
        icon={<CalendarDays size={22} />}
        eyebrow="Municipal Event Monitoring"
        title="Municipal Events"
        description="View published municipal events across Antique."
        actions={
          <button
            type="button"
            className={provincialHeaderButton}
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        }
      />
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      <div className="mobile-summary-grid grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Events"
          value={events.length}
          description="Municipal events in the monitoring list."
          badgeClass="bg-slate-100 text-slate-700"
        />
        <SummaryCard
          label="Upcoming / Ongoing"
          value={active}
          description="Scheduled and in-progress municipal events."
          badgeClass="bg-blue-50 text-blue-700"
        />
        <SummaryCard
          label="Completed"
          value={completed}
          description="Municipal events whose schedule has ended."
          badgeClass="bg-emerald-50 text-emerald-700"
        />
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 pt-5">
          <h2 className="text-lg font-semibold">Event List</h2>
          <p className="mt-1 text-sm text-slate-500">
            Search and filter municipal events by municipality and status.
          </p>
        </div>
        <EventsStatusTabs
          hideDraft
          events={events}
          currentTime={now}
          activeStatus={status}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <EventsFilters
          searchTerm={search}
          municipalityFilter={town}
          municipalityOptions={[
            ...new Set(records.map((event) => event.owner_municipality)),
          ].sort()}
          sortOption={sort}
          filteredCount={filtered.length}
          totalCount={events.length}
          hasStatusFilter={status !== "all"}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onMunicipalityChange={(value) => {
            setTown(value);
            setPage(1);
          }}
          onSortChange={(value) => {
            setSort(value);
            setPage(1);
          }}
          onClear={clear}
        />
        <EventsTable
          events={filtered.slice(start, start + pageSize)}
          loading={loading}
          currentTime={now}
          isFiltered={Boolean(
            search.trim() || town !== "all" || status !== "all",
          )}
          onClearFilters={clear}
          onView={(event) => {
            setSelected(
              records.find((record) => record.id === event.id) ?? null,
            );
            window.scrollTo(0, 0);
          }}
          deletingId={null}
          publishingId={null}
          cancellingId={null}
          onDelete={() => {}}
          onPublish={() => {}}
          onCancel={() => {}}
        />
        {!loading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Showing {start + 1}–
                {Math.min(start + pageSize, filtered.length)} of{" "}
                {filtered.length} events
              </span>
              <label>
                Rows{" "}
                <select
                  className="rounded-lg border border-slate-300 p-2"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  {[5, 10, 20].map((size) => (
                    <option key={size}>{size}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-2 disabled:opacity-40"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                Previous
              </button>
              <span className="rounded-lg bg-slate-900 px-3 py-2 text-white">
                {current}
              </span>
              <button
                type="button"
                className="rounded-lg border px-3 py-2 disabled:opacity-40"
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
