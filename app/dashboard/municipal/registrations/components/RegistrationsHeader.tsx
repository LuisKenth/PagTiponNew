import Link from "next/link";

import {
  ArrowLeft,
  CalendarCheck2,
  Download,
  ListFilter,
  QrCode,
  RefreshCw,
  UsersRound,
} from "lucide-react";

type RegistrationsHeaderProps = {
  totalRegistrations: number;
  filteredRegistrations: number;
  qrReadyCount: number;
  eventCount: number;
  loading: boolean;
  refreshing: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  onRefresh: () => void;
};

export default function RegistrationsHeader({
  totalRegistrations,
  filteredRegistrations,
  qrReadyCount,
  eventCount,
  loading,
  refreshing,
  exportDisabled,
  onExport,
  onRefresh,
}: RegistrationsHeaderProps) {
  const isRefreshing =
    loading || refreshing;

  return (
    <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Main header */}
      <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard/municipal"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="mt-3 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm sm:h-12 sm:w-12">
              <UsersRound className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Event Operations
              </p>

              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Participant Registrations
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Review registered participants,
                registration status, and QR
                availability for events assigned
                to your municipality.
              </p>
            </div>
          </div>
        </div>

        {/* Header actions */}
        <div className="grid w-full gap-2 sm:flex sm:w-auto">
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh Registrations"}
          </button>
        </div>
      </div>

      {/* Summary statistics */}
      <div className="grid grid-cols-2 border-t border-slate-200 bg-slate-50 sm:grid-cols-4">
        {/* Total registrations */}
        <div className="border-b border-r border-slate-200 p-4 sm:border-b-0 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
              <UsersRound className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Total Registrations
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950">
                {totalRegistrations}
              </p>
            </div>
          </div>
        </div>

        {/* Filtered registrations */}
        <div className="border-b border-slate-200 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <ListFilter className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Filtered Results
              </p>

              <p className="mt-1 text-xl font-bold text-blue-700">
                {filteredRegistrations}
              </p>
            </div>
          </div>
        </div>

        {/* QR-ready registrations */}
        <div className="border-r border-slate-200 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <QrCode className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                QR Ready
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-700">
                {qrReadyCount}
              </p>
            </div>
          </div>
        </div>

        {/* Events with registrations */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-100">
              <CalendarCheck2 className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Events with Registrations
              </p>

              <p className="mt-1 text-xl font-bold text-violet-700">
                {eventCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}