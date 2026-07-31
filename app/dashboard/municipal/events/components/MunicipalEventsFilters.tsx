import {
  FilterX,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import type {
  RegistrationFilter,
  SortOption,
  StatusFilter,
} from "../types/municipalEvents";

type MunicipalEventsFiltersProps = {
  searchTerm: string;
  statusFilter: StatusFilter;
  registrationFilter: RegistrationFilter;
  sortOption: SortOption;
  resultCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (
    value: StatusFilter,
  ) => void;
  onRegistrationFilterChange: (
    value: RegistrationFilter,
  ) => void;
  onSortChange: (
    value: SortOption,
  ) => void;
  onClearFilters: () => void;
};

export default function MunicipalEventsFilters({
  searchTerm,
  statusFilter,
  registrationFilter,
  sortOption,
  resultCount,
  hasActiveFilters,
  onSearchChange,
  onStatusFilterChange,
  onRegistrationFilterChange,
  onSortChange,
  onClearFilters,
}: MunicipalEventsFiltersProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <SlidersHorizontal className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900">
            Search and Filters
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            Narrow down the received event
            assignments.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(12rem,0.65fr)_minmax(12rem,0.65fr)_minmax(13rem,0.75fr)]">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Search Events
          </span>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                onSearchChange(
                  event.target.value,
                )
              }
              placeholder="Search title, description, memo..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Preparation Status
          </span>

          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(
                event.target
                  .value as StatusFilter,
              )
            }
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">
              All Statuses
            </option>
            <option value="pending">
              Pending
            </option>
            <option value="preparing">
              Preparing
            </option>
            <option value="prepared">
              Prepared
            </option>
            <option value="cancelled">
              Cancelled
            </option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Registration
          </span>

          <select
            value={registrationFilter}
            onChange={(event) =>
              onRegistrationFilterChange(
                event.target
                  .value as RegistrationFilter,
              )
            }
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">
              All Registration
            </option>
            <option value="open">
              Registration Open
            </option>
            <option value="closed">
              Registration Closed
            </option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Sort By
          </span>

          <select
            value={sortOption}
            onChange={(event) =>
              onSortChange(
                event.target
                  .value as SortOption,
              )
            }
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          >
            <option value="newest_received">
              Newest Received
            </option>
            <option value="oldest_received">
              Oldest Received
            </option>
            <option value="schedule_soonest">
              Event Schedule: Soonest
            </option>
            <option value="schedule_latest">
              Event Schedule: Latest
            </option>
            <option value="title_asc">
              Event Title: A–Z
            </option>
          </select>
        </label>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {resultCount}
            </span>{" "}
            matching event
            {resultCount === 1 ? "" : "s"}.
          </p>

          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <FilterX className="h-4 w-4" />
            Clear Filters
          </button>
        </div>
      )}
    </section>
  );
}
