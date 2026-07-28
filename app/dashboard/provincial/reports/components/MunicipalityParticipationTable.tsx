import { Building2 } from "lucide-react";

import type { MunicipalityReport } from "../types";
import { getRateClass } from "../utils";

type MunicipalityParticipationTableProps = {
  reports: MunicipalityReport[];
  loading: boolean;
};

function clampRate(rate: number) {
  return Math.min(Math.max(Number(rate) || 0, 0), 100);
}

function getAttendanceBarClass(rate: number) {
  if (rate >= 75) {
    return "bg-emerald-500";
  }

  if (rate >= 50) {
    return "bg-amber-500";
  }

  return "bg-red-500";
}

export default function MunicipalityParticipationTable({
  reports,
  loading,
}: MunicipalityParticipationTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <h2 className="text-lg font-bold text-slate-900">
          Municipality Participation
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Compare event preparation and participant attendance by municipality.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-52 items-center justify-center px-6">
          <p className="text-sm font-medium text-slate-500">
            Loading municipality reports...
          </p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-5 sm:p-6">
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
            <p className="font-semibold text-slate-900">
              No municipality participation data
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing or resetting the selected filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="w-[220px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Municipality
                </th>

                <th className="w-[135px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Events Received
                </th>

                <th className="w-[110px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Prepared
                </th>

                <th className="w-[260px] px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Preparation Rate
                </th>

                <th className="w-[125px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Registrations
                </th>

                <th className="w-[100px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Present
                </th>

                <th className="w-[240px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Attendance Rate
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => {
                const preparationRate = clampRate(
                  report.preparationRate,
                );

                const attendanceRate = clampRate(
                  report.attendanceRate,
                );

                return (
                  <tr
                    key={report.municipality}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Building2 className="h-5 w-5" />
                        </div>

                        <p className="text-sm font-bold text-slate-900">
                          {report.municipality}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-center align-middle">
                      <span className="text-base font-bold tabular-nums text-slate-900">
                        {report.eventsReceived}
                      </span>
                    </td>

                    <td className="px-4 py-5 text-center align-middle">
                      <span className="text-base font-bold tabular-nums text-emerald-700">
                        {report.prepared}
                      </span>
                    </td>

                    <td className="px-4 py-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-slate-900 transition-all"
                            style={{
                              width: `${preparationRate}%`,
                            }}
                          />
                        </div>

                        <span
                          className={`min-w-[54px] rounded-full px-2.5 py-1 text-center text-xs font-bold tabular-nums ${getRateClass(
                            preparationRate,
                          )}`}
                        >
                          {preparationRate}%
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-center align-middle">
                      <span className="text-base font-bold tabular-nums text-slate-900">
                        {report.registrations}
                      </span>
                    </td>

                    <td className="px-4 py-5 text-center align-middle">
                      <span className="text-base font-bold tabular-nums text-emerald-700">
                        {report.present}
                      </span>
                    </td>

                    <td className="px-6 py-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${getAttendanceBarClass(
                              attendanceRate,
                            )}`}
                            style={{
                              width: `${attendanceRate}%`,
                            }}
                          />
                        </div>

                        <span
                          className={`min-w-[54px] rounded-full px-2.5 py-1 text-center text-xs font-bold tabular-nums ${getRateClass(
                            attendanceRate,
                          )}`}
                        >
                          {attendanceRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}