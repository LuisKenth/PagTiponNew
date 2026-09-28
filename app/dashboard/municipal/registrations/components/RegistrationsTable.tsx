import Link from "next/link";

import {
  ArrowUpRight,
  CalendarDays,
  QrCode,
  Search,
  UsersRound,
} from "lucide-react";

import type {
  RegistrationEventGroup,
} from "../hooks/useMunicipalRegistrations";

type RegistrationsTableProps = {
  eventGroups: RegistrationEventGroup[];
  loading: boolean;
  errorMessage: string | null;
};

export default function RegistrationsTable({
  eventGroups,
  loading,
  errorMessage,
}: RegistrationsTableProps) {
  if (loading) {
    return (
      <div className="space-y-4 p-5 sm:p-6">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-5 sm:p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (eventGroups.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
        <Search className="h-10 w-10 text-slate-300" />
        <h3 className="mt-4 text-base font-bold text-slate-900">
          No registrations found
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          No participant registrations match the selected event and filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-slate-50/60 p-4 sm:p-5">
      {eventGroups.map((eventGroup) => (
        <article
          key={eventGroup.eventMunicipalityId}
          className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
            eventGroup.isCancelled
              ? "border-red-200"
              : "border-slate-200"
          }`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                eventGroup.isCancelled
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-950 text-white"
              }`}
            >
              <CalendarDays className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Provincial Event
              </p>

              <h3
                className={`mt-1 text-base font-bold sm:text-lg ${
                  eventGroup.isCancelled
                    ? "text-red-950"
                    : "text-slate-950"
                }`}
              >
                {eventGroup.eventTitle}
              </h3>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    eventGroup.isCancelled
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {eventGroup.isCancelled ? "Cancelled Event" : "Active Event"}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  <UsersRound className="h-3.5 w-3.5" />
                  {eventGroup.registrationCount}{" "}
                  {eventGroup.registrationCount === 1
                    ? "registration"
                    : "registrations"}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  <QrCode className="h-3.5 w-3.5" />
                  {eventGroup.qrReadyCount} QR ready
                </span>
              </div>
            </div>
          </div>

          <Link
            href={`/dashboard/municipal/registrations/${encodeURIComponent(
              eventGroup.eventMunicipalityId,
            )}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            View participants
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </article>
      ))}
    </div>
  );
}