import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type { MunicipalityFilter } from "../types/municipality";

type MunicipalityFiltersProps = {
  searchQuery: string;
  statusFilter: MunicipalityFilter;
  totalCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;

  onSearchChange: (value: string) => void;
  onStatusChange: (value: MunicipalityFilter) => void;
  onClearFilters: () => void;
};

export default function MunicipalityFilters({
  searchQuery,
  statusFilter,
  totalCount,
  filteredCount,
  hasActiveFilters,
  onSearchChange,
  onStatusChange,
  onClearFilters,
}: MunicipalityFiltersProps) {
  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search municipality, administrator, or email..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        {/* Status Filter */}
        <div className="relative min-w-52">
          <SlidersHorizontal
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusChange(
                event.target.value as MunicipalityFilter
              )
            }
            className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">All statuses</option>
            <option value="approved">Admin assigned</option>
            <option value="pending">Pending admin</option>
            <option value="unassigned">
              No admin assigned
            </option>
          </select>
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-700">
          {filteredCount}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-700">
          {totalCount}
        </span>{" "}
        municipalities
      </p>
    </div>
  );
}