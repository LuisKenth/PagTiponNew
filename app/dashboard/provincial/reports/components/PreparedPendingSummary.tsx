import type { PreparedPendingSummary as PreparedPendingSummaryType } from "../types";

type PreparedPendingSummaryProps = {
  summary: PreparedPendingSummaryType;
};

export default function PreparedPendingSummary({
  summary,
}: PreparedPendingSummaryProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Prepared vs Pending Summary
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Municipality preparation status for the currently selected
            provincial event assignments.
          </p>
        </div>

        <div className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {summary.total}{" "}
          {summary.total === 1 ? "assignment" : "assignments"} total
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-green-700">
                Prepared
              </p>

              <p className="mt-2 text-3xl font-bold text-green-900">
                {summary.prepared}
              </p>

              <p className="mt-1 text-xs text-green-700">
                Municipality assignments already prepared
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-green-700 shadow-sm">
              {summary.preparedRate}%
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-green-100">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{
                width: `${Math.min(summary.preparedRate, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-700">
                Pending
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-900">
                {summary.pending}
              </p>

              <p className="mt-1 text-xs text-amber-700">
                Municipality assignments not yet prepared
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-700 shadow-sm">
              {summary.pendingRate}%
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{
                width: `${Math.min(summary.pendingRate, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {summary.total === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center">
          <p className="text-sm font-medium text-slate-700">
            No municipality assignments found
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Try changing or resetting the selected report filters.
          </p>
        </div>
      )}
    </div>
  );
}
