import Link from "next/link";

import {
  ArrowLeft,
  ClipboardCheck,
  Download,
  RefreshCw,
} from "lucide-react";

type AttendanceHeaderProps = {
  totalRecords: number;
  filteredRecords: number;
  loading: boolean;
  refreshing: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  onRefresh: () => void;
};

export default function AttendanceHeader({
  totalRecords,
  filteredRecords,
  loading,
  refreshing,
  exportDisabled,
  onExport,
  onRefresh,
}: AttendanceHeaderProps) {
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
              <ClipboardCheck className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Municipal Attendance
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Monitor participant attendance recorded by authorized event staff.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

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
              : "Refresh Attendance"}
          </button>
        </div>
      </div>

      <div className="grid border-t border-slate-200 bg-slate-50 sm:grid-cols-2">
        <div className="border-b border-slate-200 px-5 py-3 sm:border-b-0 sm:border-r">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total Registered Participants
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {totalRecords}
          </p>
        </div>

        <div className="px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Filtered Results
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {filteredRecords}
          </p>
        </div>
      </div>
    </header>
  );
}
