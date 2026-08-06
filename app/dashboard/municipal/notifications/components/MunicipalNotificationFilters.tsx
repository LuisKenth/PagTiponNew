"use client";

import type { MunicipalNotificationFilter } from "../types";
import { municipalNotificationFilters } from "../utils";

type MunicipalNotificationFiltersProps = {
  activeFilter: MunicipalNotificationFilter;
  unreadCount: number;
  onFilterChange: (
    filter: MunicipalNotificationFilter,
  ) => void;
};

export default function MunicipalNotificationFilters({
  activeFilter,
  unreadCount,
  onFilterChange,
}: MunicipalNotificationFiltersProps) {
  return (
    <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
      <div
        className="-mx-1 overflow-x-auto px-1 pb-1"
        aria-label="Notification filters"
      >
        <div className="flex min-w-max items-center gap-2">
          {municipalNotificationFilters.map(
            (filter) => {
              const isActive =
                activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    onFilterChange(filter.value)
                  }
                  aria-pressed={isActive}
                  className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>{filter.label}</span>

                  {filter.value === "unread" &&
                    unreadCount > 0 && (
                      <span
                        className={`ml-2 inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {unreadCount > 99
                          ? "99+"
                          : unreadCount}
                      </span>
                    )}
                </button>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}