import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type {
  AttendanceEventOption,
  AttendanceMethodFilter,
  AttendanceStatusFilter,
} from "../types/municipalAttendance";

type AttendanceFiltersProps = {
  searchTerm: string;
  selectedEventId: string;
  statusFilter: AttendanceStatusFilter;
  methodFilter: AttendanceMethodFilter;
  eventOptions: AttendanceEventOption[];
  resultCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onEventChange: (value: string) => void;
  onStatusChange: (
    value: AttendanceStatusFilter,
  ) => void;
  onMethodChange: (
    value: AttendanceMethodFilter,
  ) => void;
  onClearFilters: () => void;
};

export default function AttendanceFilters({
  searchTerm,
  selectedEventId,
  statusFilter,
  methodFilter,
  eventOptions,
  resultCount,
  hasActiveFilters,
  onSearchChange,
  onEventChange,
  onStatusChange,
  onMethodChange,
  onClearFilters,
}: AttendanceFiltersProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="attendance-search"
            className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Search participant
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="attendance-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                onSearchChange(
                  event.target.value,
                )
              }
              placeholder="Name, email, municipality, or event"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:w-[760px]">
          <div>
            <label
              htmlFor="attendance-event"
              className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              Event
            </label>

            <select
              id="attendance-event"
              value={selectedEventId}
              onChange={(event) =>
                onEventChange(
                  event.target.value,
                )
              }
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="attendance-status"
              className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              Attendance status
            </label>

            <select
              id="attendance-status"
              value={statusFilter}
              onChange={(event) =>
                onStatusChange(
                  event.target
                    .value as AttendanceStatusFilter,
                )
              }
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">
                All Statuses
              </option>
              <option value="present">
                Present
              </option>
              <option value="late">
                Late
              </option>
              <option value="absent">
                Absent
              </option>
              <option value="pending">
                Pending
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="attendance-method"
              className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              Check-in method
            </label>

            <select
              id="attendance-method"
              value={methodFilter}
              onChange={(event) =>
                onMethodChange(
                  event.target
                    .value as AttendanceMethodFilter,
                )
              }
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">
                All Methods
              </option>
              <option value="qr">
                QR Scan
              </option>
              <option value="manual">
                Manual
              </option>
              <option value="not_checked_in">
                Not Checked In
              </option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-2 text-sm text-slate-500">
          <SlidersHorizontal className="h-4 w-4" />
          {resultCount} attendance{" "}
          {resultCount === 1
            ? "record"
            : "records"}
        </p>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </button>
        )}
      </div>
    </section>
  );
}
