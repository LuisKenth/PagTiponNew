import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";

import type { EventReport } from "../types";
import {
  formatDate,
  getRateClass,
  getStatusClass,
} from "../utils";

type EventAttendanceTableProps = {
  reports: EventReport[];
  loading: boolean;
};

function getAttendanceBarClass(rate: number) {
  if (rate >= 75) {
    return "bg-emerald-500";
  }

  if (rate >= 50) {
    return "bg-amber-500";
  }

  return "bg-red-500";
}

export default function EventAttendanceTable({
  reports,
  loading,
}: EventAttendanceTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <h2 className="text-lg font-bold text-slate-900">
          Event Attendance Summary
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Registration and attendance performance for provincial events.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-52 items-center justify-center px-6">
          <p className="text-sm font-medium text-slate-500">
            Loading event reports...
          </p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-5 sm:p-6">
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
            <p className="font-semibold text-slate-900">
              No event reports found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing or resetting the selected filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full border-collapse text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="w-[260px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Event
                </th>

                <th className="w-[240px] px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Municipalities
                </th>

                <th className="w-[115px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Registered
                </th>

                <th className="w-[100px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Present
                </th>

                <th className="w-[100px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  Absent
                </th>

                <th className="w-[210px] px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Attendance
                </th>

                <th className="w-[130px] px-6 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => {
                const attendanceRate = Number(
                  report.attendanceRate ?? 0,
                );

                const safeAttendanceRate = Math.min(
                  Math.max(attendanceRate, 0),
                  100,
                );

                return (
                  <tr
                    key={String(report.event.id)}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5 align-top">
                      <p className="max-w-[230px] break-words text-sm font-bold leading-5 text-slate-900">
                        {report.event.title || "Untitled Event"}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />

                        <span>
                          {formatDate(report.event.start_at)}
                        </span>
                      </div>

                      <span
                        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClass(
                          report.event.status,
                        )}`}
                      >
                        {report.event.status || "No status"}
                      </span>
                    </td>

                    <td className="px-4 py-5 align-top">
                      {report.municipalities.length === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                          <MapPin className="h-4 w-4" />
                          No municipalities
                        </span>
                      ) : (
                        <div className="flex max-w-[220px] flex-wrap gap-1.5">
                          {report.municipalities.map(
                            (municipality) => (
                              <span
                                key={municipality}
                                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                              >
                                {municipality}
                              </span>
                            ),
                          )}
                        </div>
                      )}
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

                    <td className="px-4 py-5 text-center align-middle">
                      <span className="text-base font-bold tabular-nums text-red-600">
                        {report.absent}
                      </span>
                    </td>

                    <td className="px-4 py-5 align-middle">
                      <div className="flex items-center justify-between gap-3">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${getAttendanceBarClass(
                              safeAttendanceRate,
                            )}`}
                            style={{
                              width: `${safeAttendanceRate}%`,
                            }}
                          />
                        </div>

                        <span
                          className={`min-w-[52px] rounded-full px-2.5 py-1 text-center text-xs font-bold tabular-nums ${getRateClass(
                            safeAttendanceRate,
                          )}`}
                        >
                          {safeAttendanceRate}%
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-right align-middle">
                      <Link
                        href={`/dashboard/provincial/events/${report.event.id}`}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        View Event
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
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