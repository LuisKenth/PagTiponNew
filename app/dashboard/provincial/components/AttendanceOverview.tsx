import type { ProvincialDashboardStats } from "../types";

type AttendanceOverviewProps = {
  loading: boolean;
  stats: ProvincialDashboardStats;
};

export default function AttendanceOverview({
  loading,
  stats,
}: AttendanceOverviewProps) {
  const notCheckedIn = Math.max(
    stats.totalRegistrations - stats.presentAttendance,
    0
  );

  const getAttendanceMessage = () => {
    if (stats.totalRegistrations === 0) {
      return "No participant registrations yet.";
    }

    if (stats.attendanceRate >= 90) {
      return "Excellent attendance participation.";
    }

    if (stats.attendanceRate >= 75) {
      return "Good attendance participation.";
    }

    if (stats.attendanceRate >= 50) {
      return "Moderate attendance participation.";
    }

    return "Attendance requires monitoring.";
  };

  const getProgressColor = () => {
    if (stats.attendanceRate >= 75) {
      return "bg-emerald-500";
    }

    if (stats.attendanceRate >= 50) {
      return "bg-blue-500";
    }

    if (stats.attendanceRate > 0) {
      return "bg-amber-500";
    }

    return "bg-slate-300";
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* HEADER */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          Attendance Overview
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Monitor participant registration and attendance activity.
        </p>
      </div>

      {loading ? (
        <div className="mt-5 space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />

          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ) : (
        <>
          {/* ATTENDANCE RATE */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Overall Attendance Rate
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Present participants compared with total registrations.
                </p>
              </div>

              <div className="text-right">
                <p className="text-3xl font-bold tracking-tight text-slate-900">
                  {stats.attendanceRate}%
                </p>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="mt-4">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
                  style={{
                    width: `${Math.min(
                      Math.max(stats.attendanceRate, 0),
                      100
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs font-medium text-slate-500">
                {getAttendanceMessage()}
              </p>
            </div>
          </div>

          {/* MAIN NUMBERS */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-medium text-blue-700">
                Registered
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-700">
                {stats.totalRegistrations}
              </p>

              <p className="mt-1 text-xs text-blue-600">
                Total participants
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-medium text-emerald-700">
                Present
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {stats.presentAttendance}
              </p>

              <p className="mt-1 text-xs text-emerald-600">
                Checked in participants
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-medium text-amber-700">
                Not Checked In
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-700">
                {notCheckedIn}
              </p>

              <p className="mt-1 text-xs text-amber-600">
                Registered but not present
              </p>
            </div>

            <div className="rounded-xl bg-violet-50 p-4">
              <p className="text-xs font-medium text-violet-700">
                Registration Open
              </p>

              <p className="mt-2 text-2xl font-bold text-violet-700">
                {stats.openRegistrations}
              </p>

              <p className="mt-1 text-xs text-violet-600">
                Municipal assignments
              </p>
            </div>
          </div>

          {/* MUNICIPAL PREPARATION */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Prepared Municipal Assignments
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Municipalities ready or accepting registrations.
              </p>
            </div>

            <div className="ml-4 text-right">
              <p className="text-xl font-bold text-slate-900">
                {stats.preparedMunicipalities}
              </p>

              <p className="text-xs text-slate-500">
                of {stats.totalTargetMunicipalities}
              </p>
            </div>
          </div>

          {/* NO DATA MESSAGE */}
          {stats.totalRegistrations === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-center">
              <p className="text-sm font-medium text-slate-700">
                No attendance data available yet.
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Attendance analytics will update once participants
                register and check in.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}