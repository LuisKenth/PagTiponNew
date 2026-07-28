"use client";

import type { NotificationFilter } from "../types";
import { notificationFilters } from "../utils";

type NotificationFiltersProps = {
  activeFilter: NotificationFilter;
  unreadCount: number;
  onFilterChange: (
    filter: NotificationFilter,
  ) => void;
};

export default function NotificationFilters({
  activeFilter,
  unreadCount,
  onFilterChange,
}: NotificationFiltersProps) {
  return (
    <div className="border-b border-slate-100 p-4 sm:p-6">
      <div className="flex flex-wrap gap-2">
        {notificationFilters.map((filter) => {
          const isActive =
            activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() =>
                onFilterChange(filter.value)
              }
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {filter.label}

              {filter.value === "unread" &&
                unreadCount > 0 && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
