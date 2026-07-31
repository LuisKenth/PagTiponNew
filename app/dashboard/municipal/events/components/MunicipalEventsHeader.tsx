import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

type MunicipalEventsHeaderProps = {
  municipality: string;
  totalReceived: number;
  filteredCount: number;
  registrationOpenCount: number;
  cancelledCount: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

export default function MunicipalEventsHeader({
  municipality,
  totalReceived,
  filteredCount,
  registrationOpenCount,
  cancelledCount,
  loading,
  refreshing,
  onRefresh,
}: MunicipalEventsHeaderProps) {
  return (
    <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard/municipal"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <CalendarDays className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Received Events
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Search, review, and manage
                provincial events assigned to{" "}
                <span className="font-semibold text-slate-800">
                  {municipality ||
                    "your municipality"}
                </span>
                .
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={
            loading || refreshing
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading || refreshing
                ? "animate-spin"
                : ""
            }`}
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh Events"}
        </button>
      </div>

      <div className="grid border-t border-slate-200 bg-slate-50 sm:grid-cols-4">
        <div className="border-b border-slate-200 px-5 py-3 sm:border-b-0 sm:border-r">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total Received
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {totalReceived}
          </p>
        </div>

        <div className="border-b border-slate-200 px-5 py-3 sm:border-b-0 sm:border-r">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Filtered Results
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {filteredCount}
          </p>
        </div>

        <div className="border-b border-slate-200 px-5 py-3 sm:border-b-0 sm:border-r">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Registration Open
          </p>

          <p className="mt-1 text-lg font-bold text-emerald-700">
            {registrationOpenCount}
          </p>
        </div>

        <div className="px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Cancelled
          </p>

          <p className="mt-1 text-lg font-bold text-red-700">
            {cancelledCount}
          </p>
        </div>
      </div>
    </header>
  );
}
