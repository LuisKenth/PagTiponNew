import type {
  EventSortOption,
} from "../types";

import EventsSortSelect from "./EventsSortSelect";

type EventsFiltersProps = {
  searchTerm: string;
  municipalityFilter: string;
  municipalityOptions: string[];

  sortOption: EventSortOption;

  filteredCount: number;
  totalCount: number;
  hasStatusFilter: boolean;

  onSearchChange: (value: string) => void;
  onMunicipalityChange: (value: string) => void;

  onSortChange: (
    value: EventSortOption
  ) => void;

  onClear: () => void;
};

export default function EventsFilters({
  searchTerm,
  municipalityFilter,
  municipalityOptions,
  sortOption,
  filteredCount,
  totalCount,
  hasStatusFilter,
  onSearchChange,
  onMunicipalityChange,
  onSortChange,
  onClear,
}: EventsFiltersProps) {
  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    municipalityFilter !== "all" ||
    hasStatusFilter;

  return (
    <div className="border-b border-slate-100 px-6 py-4">
      <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto] xl:items-center">
        {/* SEARCH */}
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />

            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="text"
            value={searchTerm}
            onChange={(event) =>
              onSearchChange(
                event.target.value
              )
            }
            placeholder="Search event name, description, or municipality..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        {/* MUNICIPALITY */}
        <select
          value={municipalityFilter}
          onChange={(event) =>
            onMunicipalityChange(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 xl:w-56"
        >
          <option value="all">
            All Municipalities
          </option>

          {municipalityOptions.map(
            (municipality) => (
              <option
                key={municipality}
                value={municipality}
              >
                {municipality}
              </option>
            )
          )}
        </select>

        {/* SORT */}
        <EventsSortSelect
          value={sortOption}
          onChange={
            onSortChange
          }
        />
      </div>

      {/* BOTTOM INFO */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {filteredCount}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-700">
            {totalCount}
          </span>{" "}
          events
        </p>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}