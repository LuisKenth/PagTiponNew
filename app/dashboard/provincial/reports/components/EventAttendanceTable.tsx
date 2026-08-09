"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
} from "lucide-react";

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

const EVENTS_PER_PAGE = 5;

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
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(
    1,
    Math.ceil(reports.length / EVENTS_PER_PAGE)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [reports]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex =
    (currentPage - 1) * EVENTS_PER_PAGE;

  const endIndex = Math.min(
    startIndex + EVENTS_PER_PAGE,
    reports.length
  );

  const pageNumbers = useMemo(
    () =>
      Array.from(
        { length: totalPages },
        (_, index) => index + 1
      ),
    [totalPages]
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:shadow-none">
      {/* Header */}
      <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 print:px-3 print:py-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Event Attendance Summary
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500 print:text-xs print:leading-4">
            Registration and attendance performance for provincial
            events.
          </p>
        </div>

        {!loading && reports.length > 0 && (
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 print:hidden">
            {reports.length}{" "}
            {reports.length === 1 ? "Event" : "Events"}
          </span>
        )}
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
        <>
          {/* Table */}
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[1120px] border-collapse text-left print:min-w-0 print:text-[10px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="w-[260px] px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 print:w-auto print:px-3 print:py-2 print:text-[9px]">
                    Event
                  </th>

                  <th className="w-[240px] px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 print:w-auto print:px-2 print:py-2 print:text-[9px]">
                    Municipalities
                  </th>

                  <th className="w-[115px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500 print:w-auto print:px-2 print:py-2 print:text-[9px]">
                    Registered
                  </th>

                  <th className="w-[100px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500 print:w-auto print:px-2 print:py-2 print:text-[9px]">
                    Present
                  </th>

                  <th className="w-[100px] px-4 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500 print:w-auto print:px-2 print:py-2 print:text-[9px]">
                    Absent
                  </th>

                  <th className="w-[210px] px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 print:w-auto print:px-2 print:py-2 print:text-[9px]">
                    Attendance
                  </th>

                  <th className="w-[130px] px-6 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500 print:hidden">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {reports.map((report, index) => {
                  const attendanceRate = Number(
                    report.attendanceRate ?? 0
                  );

                  const safeAttendanceRate = Math.min(
                    Math.max(attendanceRate, 0),
                    100
                  );

                  const isOnCurrentPage =
                    index >= startIndex &&
                    index < endIndex;

                  return (
                    <tr
                      key={String(report.event.id)}
                      className={`transition hover:bg-slate-50/80 ${
                        isOnCurrentPage
                          ? "table-row"
                          : "hidden"
                      } print:table-row`}
                    >
                      {/* Event */}
                      <td className="px-6 py-5 align-top print:px-3 print:py-2">
                        <p className="max-w-[230px] break-words text-sm font-bold leading-5 text-slate-900 print:max-w-none print:text-[10px] print:leading-4">
                          {report.event.title ||
                            "Untitled Event"}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 print:mt-1 print:text-[9px]">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 print:h-3 print:w-3" />

                          <span>
                            {formatDate(
                              report.event.start_at
                            )}
                          </span>
                        </div>

                        <span
                          className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize print:mt-1.5 print:px-2 print:py-0.5 print:text-[9px] ${getStatusClass(
                            report.event.status
                          )}`}
                        >
                          {report.event.status ||
                            "No status"}
                        </span>
                      </td>

                      {/* Municipalities */}
                      <td className="px-4 py-5 align-top print:px-2 print:py-2">
                        {report.municipalities.length ===
                        0 ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-400 print:text-[9px]">
                            <MapPin className="h-4 w-4 print:h-3 print:w-3" />
                            No municipalities
                          </span>
                        ) : (
                          <div className="flex max-w-[220px] flex-wrap gap-1.5 print:max-w-none print:gap-1">
                            {report.municipalities.map(
                              (municipality) => (
                                <span
                                  key={municipality}
                                  className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 print:px-1.5 print:py-0.5 print:text-[9px]"
                                >
                                  {municipality}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </td>

                      {/* Registered */}
                      <td className="px-4 py-5 text-center align-middle print:px-2 print:py-2">
                        <span className="text-base font-bold tabular-nums text-slate-900 print:text-[10px]">
                          {report.registrations}
                        </span>
                      </td>

                      {/* Present */}
                      <td className="px-4 py-5 text-center align-middle print:px-2 print:py-2">
                        <span className="text-base font-bold tabular-nums text-emerald-700 print:text-[10px]">
                          {report.present}
                        </span>
                      </td>

                      {/* Absent */}
                      <td className="px-4 py-5 text-center align-middle print:px-2 print:py-2">
                        <span className="text-base font-bold tabular-nums text-red-600 print:text-[10px]">
                          {report.absent}
                        </span>
                      </td>

                      {/* Attendance */}
                      <td className="px-4 py-5 align-middle print:px-2 print:py-2">
                        <div className="flex items-center justify-between gap-3 print:gap-1.5">
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 print:h-1.5">
                            <div
                              className={`h-full rounded-full transition-all ${getAttendanceBarClass(
                                safeAttendanceRate
                              )}`}
                              style={{
                                width: `${safeAttendanceRate}%`,
                              }}
                            />
                          </div>

                          <span
                            className={`min-w-[52px] rounded-full px-2.5 py-1 text-center text-xs font-bold tabular-nums print:min-w-[38px] print:px-1.5 print:py-0.5 print:text-[9px] ${getRateClass(
                              safeAttendanceRate
                            )}`}
                          >
                            {safeAttendanceRate}%
                          </span>
                        </div>
                      </td>

                      {/* Action - screen only */}
                      <td className="px-6 py-5 text-right align-middle print:hidden">
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

          {/* Pagination - screen only */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 print:hidden">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {startIndex + 1}
                </span>
                –
                <span className="font-medium text-slate-700">
                  {endIndex}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700">
                  {reports.length}
                </span>{" "}
                events
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* Previous */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(page - 1, 1)
                    )
                  }
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() =>
                      setCurrentPage(page)
                    }
                    className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition ${
                      currentPage === page
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(
                        page + 1,
                        totalPages
                      )
                    )
                  }
                  disabled={
                    currentPage === totalPages
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}