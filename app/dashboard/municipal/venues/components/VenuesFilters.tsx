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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <SlidersHorizontal className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Search Venues
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Find a venue by name,
                municipality, or capacity.
              </p>
            </div>
          </div>

          <label
            htmlFor="venue-search"
            className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Venue Search
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="venue-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                onSearchChange(
                  event.target.value,
                )
              }
              placeholder="Search venue name or capacity..."
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
            />

            {hasActiveSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                aria-label="Clear venue search"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Results
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {resultCount}{" "}
            {resultCount === 1
              ? "venue"
              : "venues"}
          </p>
        </div>
      </div>
    </section>
  );
}
