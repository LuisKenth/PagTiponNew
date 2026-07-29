import {
  Ban,
  CalendarX2,
  LockKeyhole,
  TriangleAlert,
} from "lucide-react";

import type { ReceivedEvent } from "../types/municipalDashboard";

import {
  formatDateTime,
  getPreparationButtonLabel,
  getPreparationStatusClass,
  getPreparationStatusLabel,
  normalizePreparationStatus,
} from "../utils/municipalDashboardUtils";

type ReceivedEventCardProps = {
  item: ReceivedEvent;
  onPrepare: (item: ReceivedEvent) => void;
};

export default function ReceivedEventCard({
  item,
  onPrepare,
}: ReceivedEventCardProps) {
  /*
   * Cancellation may come from either:
   *
   * event_municipalities.municipal_status
   * events.status
   */
  const municipalStatus = String(
    item.municipal_status ?? "",
  )
    .trim()
    .toLowerCase();

  const provincialStatus = String(
    item.event?.status ?? "",
  )
    .trim()
    .toLowerCase();

  const isCancelled =
    municipalStatus === "cancelled" ||
    provincialStatus === "cancelled";

  const isRegistrationOpen =
    !isCancelled &&
    item.registration_open === true;

  const normalizedPreparationStatus =
    normalizePreparationStatus(
      item.municipal_status,
    );

  return (
    <article
      className={`overflow-hidden rounded-xl border p-5 transition ${
        isCancelled
          ? "border-red-300 bg-red-50/60 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {/* CANCELLATION WARNING */}
      {isCancelled && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-100/70 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

          <div>
            <p className="text-sm font-bold text-red-900">
              Provincial Event Cancelled
            </p>

            <p className="mt-1 text-sm leading-6 text-red-700">
              Municipal preparation has been stopped and
              participant registration is closed for this
              event.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* EVENT INFORMATION */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-lg font-semibold ${
                isCancelled
                  ? "text-red-950"
                  : "text-slate-900"
              }`}
            >
              {item.event?.title || "Untitled Event"}
            </h3>

            {isCancelled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                <Ban className="h-3.5 w-3.5" />
                Cancelled
              </span>
            ) : (
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${getPreparationStatusClass(
                  item.municipal_status,
                )}`}
              >
                {getPreparationStatusLabel(
                  normalizedPreparationStatus,
                )}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isRegistrationOpen
                  ? "bg-emerald-100 text-emerald-700"
                  : isCancelled
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {isCancelled ? (
                <LockKeyhole className="h-3.5 w-3.5" />
              ) : (
                <span
                  className={`h-2 w-2 rounded-full ${
                    isRegistrationOpen
                      ? "bg-emerald-500"
                      : "bg-slate-400"
                  }`}
                />
              )}

              {isRegistrationOpen
                ? "Registration Open"
                : "Registration Closed"}
            </span>
          </div>

          <p
            className={`text-sm leading-6 ${
              isCancelled
                ? "text-red-800"
                : "text-slate-600"
            }`}
          >
            {item.event?.description ||
              "No description provided."}
          </p>

          {/* EVENT SCHEDULE */}
          <div
            className={`grid gap-3 rounded-xl border p-3 text-sm sm:grid-cols-2 ${
              isCancelled
                ? "border-red-200 bg-white/70 text-red-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            <p className="flex items-start gap-2">
              {isCancelled && (
                <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}

              <span>
                <span
                  className={`font-medium ${
                    isCancelled
                      ? "text-red-900"
                      : "text-slate-700"
                  }`}
                >
                  Start:
                </span>{" "}
                {formatDateTime(item.event?.start_at)}
              </span>
            </p>

            <p>
              <span
                className={`font-medium ${
                  isCancelled
                    ? "text-red-900"
                    : "text-slate-700"
                }`}
              >
                End:
              </span>{" "}
              {formatDateTime(item.event?.end_at)}
            </p>
          </div>

          {/* MEMO NAME */}
          {item.event?.memo_filename && (
            <p
              className={`text-sm ${
                isCancelled
                  ? "text-red-700"
                  : "text-slate-500"
              }`}
            >
              Memo:{" "}
              <span
                className={`font-medium ${
                  isCancelled
                    ? "text-red-900"
                    : "text-slate-700"
                }`}
              >
                {item.event.memo_filename}
              </span>
            </p>
          )}

          {/* LOCAL INSTRUCTIONS */}
          {item.local_instructions && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                isCancelled
                  ? "border-red-200 bg-white/70 text-red-700"
                  : "border-slate-100 bg-slate-50 text-slate-600"
              }`}
            >
              <span
                className={`font-medium ${
                  isCancelled
                    ? "text-red-900"
                    : "text-slate-800"
                }`}
              >
                Local Instructions:
              </span>{" "}
              {item.local_instructions}

              {isCancelled && (
                <p className="mt-2 text-xs font-medium text-red-600">
                  These instructions are retained for reference
                  and can no longer be edited.
                </p>
              )}
            </div>
          )}
        </div>

        {/* EVENT ACTIONS */}
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          {item.event?.memo_url && (
            <a
              href={item.event.memo_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-lg px-4 py-2 text-center text-sm font-medium text-white transition ${
                isCancelled
                  ? "bg-red-800 hover:bg-red-700"
                  : "bg-slate-950 hover:bg-slate-800"
              }`}
            >
              View Memo
            </a>
          )}

          {isCancelled ? (
            <button
              type="button"
              onClick={() => onPrepare(item)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              <Ban className="h-4 w-4" />
              View Cancellation
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onPrepare(item)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {getPreparationButtonLabel(
                item.municipal_status,
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}