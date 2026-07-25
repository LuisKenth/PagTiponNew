import type { ProvincialDashboardStats } from "../../../types";

type DashboardStatsProps = {
  loading: boolean;
  stats: ProvincialDashboardStats;
};

export default function DashboardStats({
  loading,
  stats,
}: DashboardStatsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Total Events
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? "..." : stats.totalEvents}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700">
            E
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Provincial events created
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Upcoming Events
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-blue-700">
              {loading ? "..." : stats.upcomingEvents}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-700">
            U
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Scheduled provincial activities
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Active Municipalities
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-700">
              {loading ? "..." : stats.activeMunicipalities}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">
            M
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Municipalities reached by events
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Attendance Rate
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-violet-700">
              {loading ? "..." : `${stats.attendanceRate}%`}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-lg font-bold text-violet-700">
            %
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Present participants vs. registrations
        </p>
      </div>
    </section>
  );
}
