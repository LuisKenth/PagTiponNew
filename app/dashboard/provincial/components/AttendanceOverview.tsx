import type { ProvincialDashboardStats } from "../../../types";

type AttendanceOverviewProps = {
  loading: boolean;
  stats: ProvincialDashboardStats;
};

export default function AttendanceOverview({
  loading,
  stats,
}: AttendanceOverviewProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">
        Attendance Overview
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Current provincial event activity.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">
            Present
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "..." : stats.presentAttendance}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">
            Registered
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "..." : stats.totalRegistrations}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">
            Registration Open
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "..." : stats.openRegistrations}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">
            Prepared
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "..." : stats.preparedMunicipalities}
          </p>
        </div>
      </div>
    </div>
  );
}
