"use client";

import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

type VenuesFiltersProps = {
  searchTerm: string;
  resultCount: number;
  hasActiveSearch: boolean;
  onSearchChange: (
    value: string,
  ) => void;
  onClearSearch: () => void;
};

export default function VenuesFilters({
  searchTerm,
  resultCount,
  hasActiveSearch,
  onSearchChange,
  onClearSearch,
}: VenuesFiltersProps) {
  return (
    <section
      aria-labelledby="venue-search-heading"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <SlidersHorizontal className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="venue-search-heading"
                  className="font-bold text-slate-900"
                >
                  Search Venues
                </h2>

                {hasActiveSearch && (
                  <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    Filter active
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Find a venue by name,
                municipality, or capacity.
              </p>
            </div>
          </div>

          <label
            htmlFor="venue-search"
            className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            Venue Search
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="venue-search"
              type="text"
              value={searchTerm}
              onChange={(event) =>
                onSearchChange(
                  event.target.value,
                )
              }
              placeholder="Search venue name, municipality, or capacity..."
              autoComplete="off"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-600 focus:ring-4 focus:ring-slate-100"
            />

            {hasActiveSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                aria-label="Clear venue search"
                title="Clear search"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {hasActiveSearch && (
            <p className="mt-2 text-xs text-slate-500">
              Showing results for{" "}
              <span className="font-semibold text-slate-700">
                “{searchTerm.trim()}”
              </span>
            </p>
          )}
        </div>

        <div className="flex min-h-[76px] shrink-0 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 lg:min-w-[150px] lg:justify-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
            <Search className="h-4 w-4" />
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Results
            </p>

            <p
              aria-live="polite"
              className="mt-1 whitespace-nowrap text-lg font-bold text-slate-900"
            >
              {resultCount}{" "}
              {resultCount === 1
                ? "venue"
                : "venues"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}