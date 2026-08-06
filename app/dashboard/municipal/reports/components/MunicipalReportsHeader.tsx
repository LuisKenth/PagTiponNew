import Link from "next/link";

import {
  ArrowLeft,
  Download,
  FileBarChart,
  RefreshCw,
} from "lucide-react";

type MunicipalReportsHeaderProps = {
  municipality: string | null;
  loading: boolean;
  refreshing: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  onRefresh: () => void;
};

export default function MunicipalReportsHeader({
  municipality,
  loading,
  refreshing,
  exportDisabled,
  onExport,
  onRefresh,
}: MunicipalReportsHeaderProps) {
  const isRefreshing =
    loading || refreshing;

  return (
    <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
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
              <FileBarChart className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Municipal Management
              </p>

              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Municipal Reports
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Review registration and
                attendance performance for
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

        <div className="grid w-full gap-2 sm:flex sm:w-auto">
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
            disabled={isRefreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
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
              : "Refresh Reports"}
          </button>
        </div>
      </div>
    </header>
  );
}
