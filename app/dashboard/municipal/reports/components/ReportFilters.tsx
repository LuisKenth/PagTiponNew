"use client";

import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type {
  MunicipalReportEventOption,
  MunicipalReportEventStatus,
} from "../types/municipalReports";

type ReportFiltersProps = {
  searchTerm: string;
  selectedEventId: string;
  statusFilter: MunicipalReportEventStatus;
  dateFrom: string;
  dateTo: string;
  eventOptions: MunicipalReportEventOption[];
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

export default function ReportFilters({
  searchTerm,
  selectedEventId,
  statusFilter,
  dateFrom,
  dateTo,
  eventOptions,
  resultCount,
  hasActiveFilters,
  onSearchChange,
  onEventChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
}: ReportFiltersProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {/* Filter heading */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <SlidersHorizontal className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-slate-900">
              Report Filters
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Narrow the report by event,
              status, or event date.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {resultCount}{" "}
            {resultCount === 1
              ? "event"
              : "events"}
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 transition hover:text-red-700"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter controls */}
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        {/* Search */}
        <div className="md:col-span-2 xl:col-span-4">
          <label
            htmlFor="report-search"
            className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Search Event
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

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
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
            />
          </div>
        </div>

        {/* Event */}
        <div className="xl:col-span-2">
          <label
            htmlFor="report-event"
            className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
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
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
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

        {/* Event status */}
        <div className="xl:col-span-2">
          <label
            htmlFor="report-status"
            className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
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
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
          >
            {statusOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>

        {/* Date from */}
        <div className="xl:col-span-2">
          <label
            htmlFor="report-date-from"
            className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            From
          </label>

          <input
            id="report-date-from"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) =>
              onDateFromChange(
                event.target.value,
              )
            }
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
          />
        </div>

        {/* Date to */}
        <div className="xl:col-span-2">
          <label
            htmlFor="report-date-to"
            className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            To
          </label>

          <input
            id="report-date-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) =>
              onDateToChange(
                event.target.value,
              )
            }
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
          />
        </div>
      </div>
    </section>
  );
}