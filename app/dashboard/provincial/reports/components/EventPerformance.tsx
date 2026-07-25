import type { EventReport } from "../types";
import { formatDate } from "../utils";

type EventPerformanceProps = {
  reports: EventReport[];
  loading: boolean;
};

function getPerformanceLabel(
  registrations: number,
  attendanceRate: number
) {
  if (registrations === 0) {
    return {
      label: "No Data",
      className: "bg-slate-100 text-slate-600",
      barClassName: "bg-slate-300",
    };
  }

  if (attendanceRate >= 80) {
    return {
      label: "Excellent",
      className: "bg-green-50 text-green-700",
      barClassName: "bg-green-600",
    };
  }

  if (attendanceRate >= 60) {
    return {
      label: "Good",
      className: "bg-blue-50 text-blue-700",
      barClassName: "bg-blue-600",
    };
  }

  if (attendanceRate >= 40) {
    return {
      label: "Fair",
      className: "bg-amber-50 text-amber-700",
      barClassName: "bg-amber-500",
    };
  }

  return {
    label: "Needs Improvement",
    className: "bg-red-50 text-red-700",
    barClassName: "bg-red-500",
  };
}

export default function EventPerformance({
  reports,
  loading,
}: EventPerformanceProps) {
  const rankedReports = [...reports].sort((a, b) => {
    // Events with registrations should rank above events with no data.
    if (
      a.registrations === 0 &&
      b.registrations > 0
    ) {
      return 1;
    }

    if (
      b.registrations === 0 &&
      a.registrations > 0
    ) {
      return -1;
    }

    if (b.attendanceRate !== a.attendanceRate) {
      return b.attendanceRate - a.attendanceRate;
    }

    return b.registrations - a.registrations;
  });

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Event Performance
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Evaluate provincial events based on participant
          registration and attendance performance.
        </p>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Loading event performance...
        </p>
      ) : rankedReports.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-semibold text-slate-900">
            No event performance data
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Try changing or resetting the selected report
            filters.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {rankedReports.map((report, index) => {
            const performance = getPerformanceLabel(
              report.registrations,
              report.attendanceRate
            );

            return (
              <div
                key={String(report.event.id)}
                className="rounded-xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                  {/* Event information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        #{index + 1}
                      </span>

                      <h3 className="font-semibold text-slate-900">
                        {report.event.title ||
                          "Untitled Event"}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${performance.className}`}
                      >
                        {performance.label}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(report.event.start_at)}
                    </p>

                    {report.municipalities.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        {report.municipalities.length}{" "}
                        {report.municipalities.length === 1
                          ? "municipality"
                          : "municipalities"}
                      </p>
                    )}
                  </div>

                  {/* Event statistics */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[520px]">
                    <div className="rounded-lg bg-slate-50 px-3 py-3">
                      <p className="text-xs text-slate-500">
                        Registered
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {report.registrations}
                      </p>
                    </div>

                    <div className="rounded-lg bg-green-50 px-3 py-3">
                      <p className="text-xs text-green-700">
                        Present
                      </p>

                      <p className="mt-1 text-lg font-bold text-green-800">
                        {report.present}
                      </p>
                    </div>

                    <div className="rounded-lg bg-red-50 px-3 py-3">
                      <p className="text-xs text-red-700">
                        Absent
                      </p>

                      <p className="mt-1 text-lg font-bold text-red-800">
                        {report.absent}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-3 py-3">
                      <p className="text-xs text-slate-500">
                        Attendance
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {report.registrations > 0
                          ? `${report.attendanceRate}%`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance progress bar */}
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      Attendance Performance
                    </p>

                    <p className="text-xs font-medium text-slate-600">
                      {report.registrations > 0
                        ? `${report.attendanceRate}%`
                        : "No registrations"}
                    </p>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${performance.barClassName}`}
                      style={{
                        width:
                          report.registrations > 0
                            ? `${Math.min(
                                report.attendanceRate,
                                100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && rankedReports.length > 0 && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-600">
            Performance Guide
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              Excellent: 80–100%
            </span>

            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              Good: 60–79%
            </span>

            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              Fair: 40–59%
            </span>

            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
              Needs Improvement: below 40%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}