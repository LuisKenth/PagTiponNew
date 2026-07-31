import {
  Ban,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";

import type {
  RegistrationEventOption,
} from "../types/municipalRegistrations";

function normalizeValue(
  value: string | null,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

type EventRegistrationSummaryProps = {
  selectedEvent:
    | RegistrationEventOption
    | null;
};

export default function EventRegistrationSummary({
  selectedEvent,
}: EventRegistrationSummaryProps) {
  if (!selectedEvent) {
    return null;
  }

  const cancelled =
    normalizeValue(
      selectedEvent.event_status,
    ) === "cancelled" ||
    normalizeValue(
      selectedEvent.municipal_status,
    ) === "cancelled";

  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        cancelled
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              cancelled
                ? "text-red-500"
                : "text-slate-400"
            }`}
          >
            Selected Event
          </p>

          <h2
            className={`mt-1 text-lg font-bold ${
              cancelled
                ? "text-red-950"
                : "text-slate-900"
            }`}
          >
            {selectedEvent.event_title}
          </h2>

          <p
            className={`mt-1 text-sm ${
              cancelled
                ? "text-red-700"
                : "text-slate-500"
            }`}
          >
            {
              selectedEvent.registration_count
            }{" "}
            registered{" "}
            {selectedEvent.registration_count ===
            1
              ? "participant"
              : "participants"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cancelled ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">
              <Ban className="h-4 w-4" />
              Event Cancelled
            </span>
          ) : selectedEvent.registration_open ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Registration Open
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <LockKeyhole className="h-4 w-4" />
              Registration Closed
            </span>
          )}
        </div>
      </div>

      {cancelled && (
        <p className="mt-4 border-t border-red-200 pt-4 text-sm leading-6 text-red-700">
          This is a read-only registration
          record. The provincial event has
          been cancelled and no new
          participant registration is allowed.
        </p>
      )}
    </section>
  );
}
