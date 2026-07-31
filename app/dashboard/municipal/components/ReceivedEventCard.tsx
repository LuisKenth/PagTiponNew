import Link from "next/link";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  ListChecks,
  LockKeyhole,
  Settings2,
  TriangleAlert,
  UsersRound,
  ArrowUpRight,
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

  const isPrepared =
    normalizedPreparationStatus === "prepared";

  const registeredParticipants =
    item.registered_participants ?? 0;

  const accentClass = isCancelled
    ? "bg-red-500"
    : isPrepared
      ? "bg-emerald-500"
      : normalizedPreparationStatus ===
        "preparing"
        ? "bg-blue-500"
        : "bg-amber-500";

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 ${isCancelled
          ? "border-red-200"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
        }`}
    >
      {/* Status accent */}
      <div
        className={`absolute inset-y-0 left-0 w-1 ${accentClass}`}
      />

      {/* Cancellation notice */}
      {isCancelled && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <TriangleAlert className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-red-900">
                Provincial Event Cancelled
              </p>

              <p className="mt-1 text-sm leading-6 text-red-700">
                Municipal preparation and participant
                registration have been stopped. Existing
                event details remain available for reference.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          {/* Event details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Provincial Event
              </span>

              {isCancelled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  <Ban className="h-3.5 w-3.5" />
                  Cancelled
                </span>
              ) : (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getPreparationStatusClass(
                    item.municipal_status,
                  )}`}
                >
                  {getPreparationStatusLabel(
                    normalizedPreparationStatus,
                  )}
                </span>
              )}

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${isRegistrationOpen
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : isCancelled
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
              >
                {isRegistrationOpen ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <LockKeyhole className="h-3.5 w-3.5" />
                )}

                {isRegistrationOpen
                  ? "Registration Open"
                  : "Registration Closed"}
              </span>
            </div>

            <h3
              className={`mt-3 text-xl font-bold tracking-tight sm:text-2xl ${isCancelled
                  ? "text-red-950"
                  : "text-slate-950"
                }`}
            >
              {item.event?.title ||
                "Untitled Event"}
            </h3>

            <p
              className={`mt-2 max-w-3xl text-sm leading-6 ${isCancelled
                  ? "text-red-800"
                  : "text-slate-600"
                }`}
            >
              {item.event?.description ||
                "No description provided."}
            </p>

            {/* Schedule */}
            <div
              className={`mt-5 grid gap-3 rounded-xl border p-4 sm:grid-cols-2 ${isCancelled
                  ? "border-red-200 bg-red-50/60"
                  : "border-slate-200 bg-slate-50"
                }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isCancelled
                      ? "bg-red-100 text-red-700"
                      : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                    }`}
                >
                  <CalendarClock className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold uppercase tracking-wide ${isCancelled
                        ? "text-red-500"
                        : "text-slate-400"
                      }`}
                  >
                    Start Date and Time
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${isCancelled
                        ? "text-red-900"
                        : "text-slate-800"
                      }`}
                  >
                    {formatDateTime(
                      item.event?.start_at,
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isCancelled
                      ? "bg-red-100 text-red-700"
                      : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                    }`}
                >
                  <Clock3 className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold uppercase tracking-wide ${isCancelled
                        ? "text-red-500"
                        : "text-slate-400"
                      }`}
                  >
                    End Date and Time
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${isCancelled
                        ? "text-red-900"
                        : "text-slate-800"
                      }`}
                  >
                    {formatDateTime(
                      item.event?.end_at,
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Supporting details */}
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {/* Registered participants */}
              <Link
                href={`/dashboard/municipal/registrations?eventMunicipalityId=${encodeURIComponent(
                  String(item.id),
                )}`}
                className={`group flex items-start gap-3 rounded-xl border p-4 transition ${isCancelled
                    ? "border-red-200 bg-red-50/50 hover:bg-red-100/60"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                aria-label={`View registered participants for ${item.event?.title || "this event"
                  }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isCancelled
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-50 text-emerald-700"
                    }`}
                >
                  <UsersRound className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-bold uppercase tracking-wide ${isCancelled
                        ? "text-red-500"
                        : "text-slate-400"
                      }`}
                  >
                    Registered Participants
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${isCancelled
                        ? "text-red-900"
                        : "text-slate-800"
                      }`}
                  >
                    {registeredParticipants}{" "}
                    {registeredParticipants === 1
                      ? "participant"
                      : "participants"}
                  </p>

                  <p
                    className={`mt-1 flex items-center gap-1 text-xs font-semibold ${isCancelled
                        ? "text-red-600"
                        : "text-emerald-700"
                      }`}
                  >
                    View registration records
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </p>
                </div>
              </Link>
            </div>

            {/* Event actions */}
            <div className="flex w-full shrink-0 flex-col gap-2 border-t border-slate-200 pt-5 sm:flex-row xl:w-52 xl:flex-col xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
              {item.event?.memo_url && (
                <a
                  href={item.event.memo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${isCancelled
                      ? "bg-red-800 hover:bg-red-700"
                      : "bg-slate-950 hover:bg-slate-800"
                    }`}
                >
                  <FileText className="h-4 w-4" />
                  View Memo
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {isCancelled ? (
                <button
                  type="button"
                  onClick={() =>
                    onPrepare(item)
                  }
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  <Ban className="h-4 w-4" />
                  View Cancellation
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onPrepare(item)
                  }
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
                >
                  <Settings2 className="h-4 w-4" />

                  {getPreparationButtonLabel(
                    item.municipal_status,
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}