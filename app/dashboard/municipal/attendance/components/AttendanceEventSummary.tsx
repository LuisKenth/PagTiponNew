import {
  CalendarDays,
  CircleAlert,
  DoorOpen,
} from "lucide-react";

import type {
  AttendanceEventOption,
} from "../types/municipalAttendance";

import {
  formatEventSchedule,
} from "../utils/municipalAttendanceUtils";

type AttendanceEventSummaryProps = {
  selectedEvent:
    | AttendanceEventOption
    | null;
};

export default function AttendanceEventSummary({
  selectedEvent,
}: AttendanceEventSummaryProps) {
  if (!selectedEvent) {
    return null;
  }

  const isCancelled =
    selectedEvent.event_status ===
    "cancelled";

  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${
        isCancelled
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              isCancelled
                ? "text-red-500"
                : "text-slate-400"
            }`}
          >
            Selected Event
          </p>

          <h2
            className={`mt-1 text-xl font-bold ${
              isCancelled
                ? "text-red-950"
                : "text-slate-950"
            }`}
          >
            {selectedEvent.event_title}
          </h2>

          <div
            className={`mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 ${
              isCancelled
                ? "text-red-700"
                : "text-slate-500"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatEventSchedule(
                selectedEvent.event_start_date,
                selectedEvent.event_end_date,
              )}
            </span>

            <span className="inline-flex items-center gap-2">
              <DoorOpen className="h-4 w-4" />
              Registration{" "}
              {selectedEvent.registration_open
                ? "open"
                : "closed"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              isCancelled
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {selectedEvent.event_status}
          </span>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-700">
            {
              selectedEvent.municipal_status
            }
          </span>
        </div>
      </div>

      {isCancelled && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-white/70 p-4 text-sm text-red-800">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

          <p>
            This event was cancelled.
            Attendance records remain
            available for review and export,
            but municipal preparation and
            registration must stay stopped.
          </p>
        </div>
      )}
    </section>
  );
}
