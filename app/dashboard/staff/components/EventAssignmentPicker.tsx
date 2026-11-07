"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Building2,
  AlignLeft,
  ClipboardList,
  Clock3,
  Search,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { EventAssignment } from "../types";
import { formatDateTime } from "../utils";

type EventAssignmentPickerProps = {
  assignments: EventAssignment[];
  selectedId: string;
  selectedAssignment: EventAssignment | null;
  disabled: boolean;
  onSelect: (id: string) => Promise<void>;
};

type EventFilter =
  | "active"
  | "upcoming"
  | "history"
  | "all";

const ACTIVE_STATUSES = [
  "ongoing",
  "upcoming",
  "published",
];

const UPCOMING_STATUSES = [
  "upcoming",
  "published",
];

const HISTORY_STATUSES = [
  "completed",
  "cancelled",
];

const EVENTS_PER_PAGE = 5;

function normalizeStatus(
  value: string | null | undefined
) {
  return value?.trim().toLowerCase() ?? "";
}

export default function EventAssignmentPicker({
  assignments,
  selectedId,
  selectedAssignment,
  disabled,
  onSelect,
}: EventAssignmentPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] =
    useState("");
  const [filter, setFilter] =
    useState<EventFilter>("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsAssignmentId, setDetailsAssignmentId] = useState<string | null>(null);

  const detailsAssignment = useMemo(
    () => assignments.find((assignment) => String(assignment.id) === detailsAssignmentId) ?? null,
    [assignments, detailsAssignmentId],
  );

  function viewDetails(assignment: EventAssignment) {
    setOpen(false);
    setDetailsAssignmentId(String(assignment.id));
  }

  const eventCounts = useMemo(() => {
    let active = 0;
    let upcoming = 0;
    let history = 0;

    for (const assignment of assignments) {
      const status = normalizeStatus(
        assignment.event.status
      );

      if (ACTIVE_STATUSES.includes(status)) {
        active += 1;
      }

      if (UPCOMING_STATUSES.includes(status)) {
        upcoming += 1;
      }

      if (HISTORY_STATUSES.includes(status)) {
        history += 1;
      }
    }

    return {
      active,
      upcoming,
      history,
      all: assignments.length,
    };
  }, [assignments]);

  useEffect(() => {
    if (
      filter === "active" &&
      eventCounts.active === 0 &&
      assignments.length > 0
    ) {
      setFilter("all");
    }
  }, [
    assignments.length,
    eventCounts.active,
    filter,
  ]);

  useEffect(() => {
    setOpen(false);
    setSearchQuery("");
    setCurrentPage(1);
  }, [selectedId]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [open]);

  useEffect(() => {
    if (!detailsAssignmentId) return;

    function handleDetailsEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailsAssignmentId(null);
    }

    window.addEventListener("keydown", handleDetailsEscape);
    return () => window.removeEventListener("keydown", handleDetailsEscape);
  }, [detailsAssignmentId]);

  const filteredAssignments = useMemo(() => {
    const normalizedSearch =
      searchQuery.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const status = normalizeStatus(
        assignment.event.status
      );

      const matchesFilter =
        filter === "all" ||
        (filter === "active" &&
          ACTIVE_STATUSES.includes(status)) ||
        (filter === "upcoming" &&
          UPCOMING_STATUSES.includes(status)) ||
        (filter === "history" &&
          HISTORY_STATUSES.includes(status));

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        assignment.event.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        status.includes(normalizedSearch)
      );
    });
  }, [
    assignments,
    filter,
    searchQuery,
  ]);

  // Paginate the filtered list, not the full assignment list.
  // Clamp the page in case assignments change after a refresh.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssignments.length / EVENTS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const firstIndex = (safePage - 1) * EVENTS_PER_PAGE;
  const paginatedAssignments = filteredAssignments.slice(
    firstIndex,
    firstIndex + EVENTS_PER_PAGE,
  );
  const showingFrom =
    filteredAssignments.length === 0 ? 0 : firstIndex + 1;
  const showingTo = Math.min(
    firstIndex + EVENTS_PER_PAGE,
    filteredAssignments.length,
  );

  const filterOptions: {
    value: EventFilter;
    label: string;
    count: number;
  }[] = [
    {
      value: "active",
      label: "Active",
      count: eventCounts.active,
    },
    {
      value: "upcoming",
      label: "Upcoming",
      count: eventCounts.upcoming,
    },
    {
      value: "history",
      label: "History",
      count: eventCounts.history,
    },
    {
      value: "all",
      label: "All",
      count: eventCounts.all,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-slate-700">
          Assigned Event
        </p>

        <span className="text-xs font-medium text-slate-500">
          {assignments.length}{" "}
          {assignments.length === 1
            ? "event"
            : "events"}
        </span>
      </div>

      {/* Prominent selected-event card (still opens the same selector) */}
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        disabled={disabled}
        aria-expanded={open}
        aria-label={
          selectedAssignment
            ? `Change assigned event: ${selectedAssignment.event.title}`
            : "Select an assigned event"
        }
        className={`group mt-3 w-full rounded-2xl border-2 px-5 py-5 text-left shadow-sm outline-none transition sm:px-6 sm:py-6 ${
          open
            ? "border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-100"
            : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-white hover:shadow-md"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {selectedAssignment ? (
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white sm:h-14 sm:w-14">
              <CalendarDays className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  Currently Selected Event
                </span>
                <EventStatusBadge status={selectedAssignment.event.status} />
              </div>

              <h2 className="mt-2 break-words text-xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-2xl lg:text-[28px]">
                {selectedAssignment.event.title}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-600">
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{formatDateTime(selectedAssignment.event.start_at)}</span>
              </div>

              <p className="mt-3 text-xs font-semibold text-emerald-700">
                Click to change assigned event
              </p>
            </div>

            <ChevronDown
              className={`mt-2 h-6 w-6 shrink-0 text-slate-500 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <CalendarDays className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Select an Assigned Event</p>
                <p className="mt-1 text-sm text-slate-500">
                  Choose an event to manage attendance.
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-6 w-6 shrink-0 text-slate-500 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </div>
        )}
      </button>

      {/* View information without leaving Event Control or changing the selected event. */}
      {selectedAssignment && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => viewDetails(selectedAssignment)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            View Event Details
          </button>
        </div>
      )}

      {/* Searchable event panel */}
      {open && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="event-search"
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search event title or status..."
                autoFocus
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear event search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {filterOptions.map((option) => {
                const active =
                  filter === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFilter(option.value);
                      setCurrentPage(1);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                    <span
                      className={`ml-1.5 ${
                        active
                          ? "text-emerald-100"
                          : "text-slate-400"
                      }`}
                    >
                      {option.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
            <p className="text-xs font-medium text-slate-500">
              {filteredAssignments.length}{" "}
              {filteredAssignments.length === 1
                ? "result"
                : "results"}
            </p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
            >
              Close
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filteredAssignments.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No matching events
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Try another search term or select a
                  different status filter.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {paginatedAssignments.map(
                  (assignment) => {
                    const selected =
                      String(assignment.id) ===
                      String(selectedId);

                    return (
                      <div
                        key={String(assignment.id)}
                        className="flex flex-col gap-2 rounded-xl sm:flex-row sm:items-center"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            void onSelect(String(assignment.id));
                          }}
                          className={`flex min-w-0 flex-1 items-start justify-between gap-4 rounded-xl px-4 py-3 text-left transition ${
                            selected
                              ? "bg-emerald-50 ring-1 ring-emerald-200"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className={`break-words text-base font-bold ${
                                selected ? "text-emerald-950" : "text-slate-900"
                              }`}>
                                {assignment.event.title}
                              </p>
                              <EventStatusBadge status={assignment.event.status} />
                            </div>

                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              <span>{formatDateTime(assignment.event.start_at)}</span>
                            </div>
                          </div>

                          {selected && (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => viewDetails(assignment)}
                          aria-label={`View details for ${assignment.event.title}`}
                          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-end rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 sm:self-auto"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Details
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Page controls always stay below the event list. */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-600" aria-live="polite">
              Showing {showingFrom}–{showingTo} of {filteredAssignments.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous event page"
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage <= 1}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>

              <span className="min-w-12 text-center text-xs font-semibold text-slate-700">
                {safePage} / {totalPages}
              </span>

              <button
                type="button"
                aria-label="Next event page"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, safePage + 1))
                }
                disabled={safePage >= totalPages}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsAssignment && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close event details"
            onClick={() => setDetailsAssignmentId(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-event-details-title"
            className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned Event Details
                </p>
                <h2 id="staff-event-details-title" className="mt-2 break-words text-xl font-extrabold text-slate-950 sm:text-2xl">
                  {detailsAssignment.event.title}
                </h2>
                <div className="mt-3">
                  <EventStatusBadge status={detailsAssignment.event.status} />
                </div>
              </div>

              <button
                type="button"
                autoFocus
                aria-label="Close event details"
                onClick={() => setDetailsAssignmentId(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <CalendarDays className="h-4 w-4" /> Event Starts
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatDateTime(detailsAssignment.event.start_at)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Clock3 className="h-4 w-4" /> Event Ends
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatDateTime(detailsAssignment.event.end_at)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <MapPin className="h-4 w-4" /> Assigned Municipality
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {detailsAssignment.municipality || "Not specified"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Building2 className="h-4 w-4" /> Event Venue
                </p>
                <p className="mt-2 break-words text-sm font-bold text-slate-900">
                  {detailsAssignment.venue_name?.trim() ||
                    (detailsAssignment.local_venue_id != null
                      ? "Venue details unavailable"
                      : "No venue assigned")}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <AlignLeft className="h-4 w-4" /> Event Description
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                  {detailsAssignment.event.description?.trim() ||
                    "No event description provided."}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <ClipboardList className="h-4 w-4" /> Local Instructions
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                  {detailsAssignment.local_instructions?.trim() ||
                    "No local instructions provided."}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setDetailsAssignmentId(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

type EventStatusBadgeProps = {
  status: string | null | undefined;
};

function EventStatusBadge({
  status,
}: EventStatusBadgeProps) {
  const normalizedStatus =
    normalizeStatus(status);

  const statusClassName =
    normalizedStatus === "ongoing"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalizedStatus === "upcoming" ||
          normalizedStatus === "published"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : normalizedStatus === "completed"
          ? "border-slate-200 bg-slate-100 text-slate-600"
          : normalizedStatus === "cancelled"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClassName}`}
    >
      {normalizedStatus || "Unknown"}
    </span>
  );
}