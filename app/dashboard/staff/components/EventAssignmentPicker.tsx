"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
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
        <label
          htmlFor="event-search"
          className="text-sm font-semibold text-slate-700"
        >
          Assigned Event
        </label>

        <span className="text-xs font-medium text-slate-500">
          {assignments.length}{" "}
          {assignments.length === 1
            ? "event"
            : "events"}
        </span>
      </div>

      {/* Selected event trigger */}
      <button
        type="button"
        onClick={() =>
          setOpen((previous) => !previous)
        }
        disabled={disabled}
        aria-expanded={open}
        className="mt-2 flex w-full items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left outline-none transition hover:border-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        {selectedAssignment ? (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">
                {selectedAssignment.event.title}
              </p>

              <EventStatusBadge
                status={
                  selectedAssignment.event.status
                }
              />
            </div>

            <p className="mt-1 truncate text-xs text-slate-500">
              {formatDateTime(
                selectedAssignment.event.start_at
              )}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-600">
              Select an assigned event
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Search or filter available events
            </p>
          </div>
        )}

        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

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
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search event title or status..."
                autoFocus
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
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
                    onClick={() =>
                      setFilter(option.value)
                    }
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
                {filteredAssignments.map(
                  (assignment) => {
                    const selected =
                      String(assignment.id) ===
                      String(selectedId);

                    return (
                      <button
                        key={String(
                          assignment.id
                        )}
                        type="button"
                        onClick={() => {
                          setOpen(false);

                          void onSelect(
                            String(
                              assignment.id
                            )
                          );
                        }}
                        className={`flex w-full items-start justify-between gap-4 rounded-xl px-4 py-3 text-left transition ${
                          selected
                            ? "bg-emerald-50 ring-1 ring-emerald-200"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`truncate text-sm font-semibold ${
                                selected
                                  ? "text-emerald-950"
                                  : "text-slate-900"
                              }`}
                            >
                              {
                                assignment.event
                                  .title
                              }
                            </p>

                            <EventStatusBadge
                              status={
                                assignment.event
                                  .status
                              }
                            />
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />

                            <span>
                              {formatDateTime(
                                assignment.event
                                  .start_at
                              )}
                            </span>
                          </div>
                        </div>

                        {selected && (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>
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