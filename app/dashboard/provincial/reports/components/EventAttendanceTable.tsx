import Link from "next/link";
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

export default function EventAttendanceTable({
  reports,
  loading,
}: EventAttendanceTableProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Event Attendance Summary
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Registration and attendance performance for provincial events.
        </p>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Loading event reports...
        </p>
      ) : reports.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-semibold text-slate-900">
            No event reports found
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Try changing or resetting the selected filters.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="py-3 pr-4">Event</th>
                <th className="py-3 pr-4">Municipalities</th>
                <th className="py-3 pr-4 text-center">Registered</th>
                <th className="py-3 pr-4 text-center">Present</th>
                <th className="py-3 pr-4 text-center">Absent</th>
                <th className="py-3 pr-4">Attendance</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((report) => (
                <tr
                  key={String(report.event.id)}
                  className="border-b last:border-b-0 hover:bg-slate-50"
                >
                  <td className="max-w-[240px] py-4 pr-4 align-top">
                    <p className="font-semibold text-slate-900">
                      {report.event.title || "Untitled Event"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(report.event.start_at)}
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusClass(
                        report.event.status
                      )}`}
                    >
                      {report.event.status || "No status"}
                    </span>
                  </td>

                  <td className="max-w-[260px] py-4 pr-4 align-top">
                    {report.municipalities.length === 0 ? (
                      <span className="text-xs text-slate-400">
                        No municipalities
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {report.municipalities.map((municipality) => (
                          <span
                            key={municipality}
                            className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                          >
                            {municipality}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="py-4 pr-4 text-center font-medium text-slate-700">
                    {report.registrations}
                  </td>

                  <td className="py-4 pr-4 text-center font-medium text-green-700">
                    {report.present}
                  </td>

                  <td className="py-4 pr-4 text-center font-medium text-red-600">
                    {report.absent}
                  </td>

                  <td className="py-4 pr-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${getRateClass(
                        report.attendanceRate
                      )}`}
                    >
                      {report.attendanceRate}%
                    </span>
                  </td>

                  <td className="py-4 text-right">
                    <Link
                      href={`/dashboard/provincial/events/${report.event.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View Event
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
