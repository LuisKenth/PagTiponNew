"use client";

import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type {
  MunicipalParticipantCategoryOption,
  MunicipalReportEventOption,
  MunicipalReportEventStatus,
} from "../types/municipalReports";

type ReportFiltersProps = {
  searchTerm: string;

  selectedEventId: string;

  statusFilter: MunicipalReportEventStatus;

  participantCategoryFilter: string;

  dateFrom: string;

  dateTo: string;

  eventOptions: MunicipalReportEventOption[];

  participantCategoryOptions: MunicipalParticipantCategoryOption[];

  resultCount: number;

  hasActiveFilters: boolean;

  onSearchChange: (
    value: string,
  ) => void;

  onEventChange: (
    value: string,
  ) => void;

  onStatusChange: (
    value: MunicipalReportEventStatus,
  ) => void;

  onParticipantCategoryChange: (
    value: string,
  ) => void;

  onDateFromChange: (
    value: string,
  ) => void;

  onDateToChange: (
    value: string,
  ) => void;

  onClearFilters: () => void;
};

const statusOptions: {
  value: MunicipalReportEventStatus;
  label: string;
}[] = [
  {
    value: "all",
    label: "All Statuses",
  },
  {
    value: "published",
    label: "Published",
  },
  {
    value: "upcoming",
    label: "Upcoming",
  },
  {
    value: "ongoing",
    label: "Ongoing",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "unknown",
    label: "Unknown",
  },
];

const controlClassName =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition duration-150 hover:border-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100";

const labelClassName =
  "mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500";

export default function ReportFilters({
  searchTerm,
  selectedEventId,
  statusFilter,
  participantCategoryFilter,
  dateFrom,
  dateTo,
  eventOptions,
  participantCategoryOptions,
  resultCount,
  hasActiveFilters,
  onSearchChange,
  onEventChange,
  onStatusChange,
  onParticipantCategoryChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
}: ReportFiltersProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <SlidersHorizontal className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-slate-900">
              Report Filters
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Narrow the report by event,
              status, participant category,
              or event date.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
            {resultCount}{" "}
            {resultCount === 1
              ? "event"
              : "events"}
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-50"
            >
              <X className="h-4 w-4" />

              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 py-5 sm:px-6">
        <div
          className="
            grid grid-cols-1 gap-4
            sm:grid-cols-2
            xl:grid-cols-[minmax(240px,1.7fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(190px,1.15fr)_minmax(160px,1fr)_minmax(160px,1fr)]
          "
        >
          {/* Search */}
          <div className="sm:col-span-2 xl:col-span-1">
            <label
              htmlFor="report-search"
              className={
                labelClassName
              }
            >
              Search Event
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="report-search"
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  onSearchChange(
                    event.target.value,
                  )
                }
                placeholder="Search event title..."
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              />
            </div>
          </div>

          {/* Event */}
          <div>
            <label
              htmlFor="report-event"
              className={
                labelClassName
              }
            >
              Event
            </label>

            <select
              id="report-event"
              value={selectedEventId}
              onChange={(event) =>
                onEventChange(
                  event.target.value,
                )
              }
              className={
                controlClassName
              }
            >
              <option value="all">
                All Events
              </option>

              {eventOptions.map(
                (eventOption) => (
                  <option
                    key={
                      eventOption.eventMunicipalityId
                    }
                    value={
                      eventOption.eventMunicipalityId
                    }
                  >
                    {
                      eventOption.eventTitle
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Event Status */}
          <div>
            <label
              htmlFor="report-status"
              className={
                labelClassName
              }
            >
              Event Status
            </label>

            <select
              id="report-status"
              value={statusFilter}
              onChange={(event) =>
                onStatusChange(
                  event.target
                    .value as MunicipalReportEventStatus,
                )
              }
              className={
                controlClassName
              }
            >
              {statusOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Participant Category */}
          <div>
            <label
              htmlFor="report-participant-category"
              className={
                labelClassName
              }
            >
              Participant Category
            </label>

            <select
              id="report-participant-category"
              value={
                participantCategoryFilter
              }
              onChange={(event) =>
                onParticipantCategoryChange(
                  event.target.value,
                )
              }
              className={
                controlClassName
              }
            >
              <option value="all">
                All Categories
              </option>

              {participantCategoryOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label
              htmlFor="report-date-from"
              className={
                labelClassName
              }
            >
              From
            </label>

            <input
              id="report-date-from"
              type="date"
              value={dateFrom}
              max={
                dateTo ||
                undefined
              }
              onChange={(event) =>
                onDateFromChange(
                  event.target.value,
                )
              }
              className={
                controlClassName
              }
            />
          </div>

          {/* Date To */}
          <div>
            <label
              htmlFor="report-date-to"
              className={
                labelClassName
              }
            >
              To
            </label>

            <input
              id="report-date-to"
              type="date"
              value={dateTo}
              min={
                dateFrom ||
                undefined
              }
              onChange={(event) =>
                onDateToChange(
                  event.target.value,
                )
              }
              className={
                controlClassName
              }
            />
          </div>
        </div>

        {/* Active filter note */}
        {hasActiveFilters && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <div className="h-2 w-2 shrink-0 rounded-full bg-slate-500" />

            <p className="text-xs font-medium leading-5 text-slate-500">
              Report totals and event
              performance currently reflect
              the active filters above.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}