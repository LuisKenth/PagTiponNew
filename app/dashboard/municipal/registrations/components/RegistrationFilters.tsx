import {
  FilterX,
  Search,
} from "lucide-react";

import type {
  RegistrationEventOption,
  RegistrationStatusFilter,
} from "../types/municipalRegistrations";

type RegistrationFiltersProps = {
  searchTerm: string;
  selectedEventId: string;
  statusFilter: RegistrationStatusFilter;
  eventOptions: RegistrationEventOption[];
  resultCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (
    value: string,
  ) => void;
  onEventChange: (
    value: string,
  ) => void;
  onStatusChange: (
    value: RegistrationStatusFilter,
  ) => void;
  onClearFilters: () => void;
};

export default function RegistrationFilters({
  searchTerm,
  selectedEventId,
  statusFilter,
  eventOptions,
  resultCount,
  hasActiveFilters,
  onSearchChange,
  onEventChange,
  onStatusChange,
  onClearFilters,
}: RegistrationFiltersProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(15rem,1fr)_minmax(12rem,0.65fr)]">
        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Search Participants
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
              placeholder="Search participant name or email..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </label>

        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Event
          </span>

          <select
            value={selectedEventId}
            onChange={(event) =>
              onEventChange(
                event.target.value,
              )
            }
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">
              All Events
            </option>

            {eventOptions.map(
              (eventOption) => (
                <option
                  key={
                    eventOption.event_municipality_id
                  }
                  value={
                    eventOption.event_municipality_id
                  }
                >
                  {
                    eventOption.event_title
                  }{" "}
                  (
                  {
                    eventOption.registration_count
                  }
                  )
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Registration Status
          </span>

          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusChange(
                event.target
                  .value as RegistrationStatusFilter,
              )
            }
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">
              All Statuses
            </option>

            <option value="registered">
              Registered
            </option>

            <option value="pending">
              Pending
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
            matching registration
            {resultCount === 1
              ? ""
              : "s"}
            .
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
