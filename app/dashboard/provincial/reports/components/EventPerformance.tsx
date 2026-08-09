"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { EventReport } from "../types";
import { formatDate } from "../utils";

type EventPerformanceProps = {
  reports: EventReport[];
  loading: boolean;
};

const EVENTS_PER_PAGE = 5;

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
  const [currentPage, setCurrentPage] =
    useState(1);

  const rankedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
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

      if (
        b.attendanceRate !==
        a.attendanceRate
      ) {
        return (
          b.attendanceRate -
          a.attendanceRate
        );
      }

      return (
        b.registrations -
        a.registrations
      );
    });
  }, [reports]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      rankedReports.length /
        EVENTS_PER_PAGE
    )
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
    (currentPage - 1) *
    EVENTS_PER_PAGE;

  const endIndex = Math.min(
    startIndex + EVENTS_PER_PAGE,
    rankedReports.length
  );

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  const visibleReports =
    rankedReports.slice(
      startIndex,
      endIndex
    );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:p-0 print:shadow-none">
      {/* =====================================
          SCREEN VERSION
          ===================================== */}
      <div className="print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Event Performance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Evaluate provincial events based on participant
              registration and attendance performance.
            </p>
          </div>

          {!loading &&
            rankedReports.length > 0 && (
              <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                {rankedReports.length}{" "}
                {rankedReports.length === 1
                  ? "Event"
                  : "Events"}
              </span>
            )}
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Loading event performance...
          </p>
        ) : rankedReports.length ===
          0 ? (
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
          <>
            <div className="mt-5 space-y-4">
              {visibleReports.map(
                (report, pageIndex) => {
                  const globalIndex =
                    startIndex +
                    pageIndex;

                  const performance =
                    getPerformanceLabel(
                      report.registrations,
                      report.attendanceRate
                    );

                  return (
                    <div
                      key={String(
                        report.event.id
                      )}
                      className="rounded-xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                        {/* Event information */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              #
                              {globalIndex +
                                1}
                            </span>

                            <h3 className="font-semibold text-slate-900">
                              {report
                                .event
                                .title ||
                                "Untitled Event"}
                            </h3>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${performance.className}`}
                            >
                              {
                                performance.label
                              }
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {formatDate(
                              report.event
                                .start_at
                            )}
                          </p>

                          {report
                            .municipalities
                            .length >
                            0 && (
                            <p className="mt-1 text-xs text-slate-500">
                              {
                                report
                                  .municipalities
                                  .length
                              }{" "}
                              {report
                                .municipalities
                                .length ===
                              1
                                ? "municipality"
                                : "municipalities"}
                            </p>
                          )}
                        </div>

                        {/* Statistics */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[520px]">
                          <div className="rounded-lg bg-slate-50 px-3 py-3">
                            <p className="text-xs text-slate-500">
                              Registered
                            </p>

                            <p className="mt-1 text-lg font-bold text-slate-900">
                              {
                                report.registrations
                              }
                            </p>
                          </div>

                          <div className="rounded-lg bg-green-50 px-3 py-3">
                            <p className="text-xs text-green-700">
                              Present
                            </p>

                            <p className="mt-1 text-lg font-bold text-green-800">
                              {
                                report.present
                              }
                            </p>
                          </div>

                          <div className="rounded-lg bg-red-50 px-3 py-3">
                            <p className="text-xs text-red-700">
                              Absent
                            </p>

                            <p className="mt-1 text-lg font-bold text-red-800">
                              {
                                report.absent
                              }
                            </p>
                          </div>

                          <div className="rounded-lg bg-slate-50 px-3 py-3">
                            <p className="text-xs text-slate-500">
                              Attendance
                            </p>

                            <p className="mt-1 text-lg font-bold text-slate-900">
                              {report.registrations >
                              0
                                ? `${report.attendanceRate}%`
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-500">
                            Attendance
                            Performance
                          </p>

                          <p className="text-xs font-medium text-slate-600">
                            {report.registrations >
                            0
                              ? `${report.attendanceRate}%`
                              : "No registrations"}
                          </p>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${performance.barClassName}`}
                            style={{
                              width:
                                report.registrations >
                                0
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
                }
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-700">
                    {startIndex +
                      1}
                  </span>
                  –
                  <span className="font-medium text-slate-700">
                    {endIndex}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-700">
                    {
                      rankedReports.length
                    }
                  </span>{" "}
                  events
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.max(
                            page - 1,
                            1
                          )
                      )
                    }
                    disabled={
                      currentPage ===
                      1
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {pageNumbers.map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() =>
                          setCurrentPage(
                            page
                          )
                        }
                        className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition ${
                          currentPage ===
                          page
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.min(
                            page + 1,
                            totalPages
                          )
                      )
                    }
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Performance Guide */}
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
          </>
        )}
      </div>

      {/* =====================================
          COMPACT PRINT VERSION
          ===================================== */}
      <div className="hidden print:block">
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Event Performance
          </h2>

          <p className="mt-0.5 text-[9px] text-slate-500">
            Provincial events ranked by registration and
            attendance performance.
          </p>
        </div>

        {loading ? (
          <p className="py-3 text-center text-[9px] text-slate-500">
            Loading event performance...
          </p>
        ) : rankedReports.length ===
          0 ? (
          <p className="py-3 text-center text-[9px] text-slate-500">
            No event performance data.
          </p>
        ) : (
          <div className="overflow-visible rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="w-[35px] px-2 py-1.5 text-[8px] font-bold uppercase text-slate-500">
                    Rank
                  </th>

                  <th className="px-2 py-1.5 text-[8px] font-bold uppercase text-slate-500">
                    Event
                  </th>

                  <th className="px-2 py-1.5 text-center text-[8px] font-bold uppercase text-slate-500">
                    Reg.
                  </th>

                  <th className="px-2 py-1.5 text-center text-[8px] font-bold uppercase text-slate-500">
                    Present
                  </th>

                  <th className="px-2 py-1.5 text-center text-[8px] font-bold uppercase text-slate-500">
                    Absent
                  </th>

                  <th className="px-2 py-1.5 text-center text-[8px] font-bold uppercase text-slate-500">
                    Rate
                  </th>

                  <th className="px-2 py-1.5 text-center text-[8px] font-bold uppercase text-slate-500">
                    Performance
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rankedReports.map(
                  (report, index) => {
                    const performance =
                      getPerformanceLabel(
                        report.registrations,
                        report.attendanceRate
                      );

                    return (
                      <tr
                        key={String(
                          report.event.id
                        )}
                        className="break-inside-avoid"
                      >
                        <td className="px-2 py-1.5 text-center text-[9px] font-semibold text-slate-600">
                          #{index + 1}
                        </td>

                        <td className="px-2 py-1.5">
                          <p className="text-[9px] font-semibold text-slate-900">
                            {report
                              .event
                              .title ||
                              "Untitled Event"}
                          </p>

                          <p className="mt-0.5 text-[8px] text-slate-500">
                            {formatDate(
                              report.event
                                .start_at
                            )}
                          </p>
                        </td>

                        <td className="px-2 py-1.5 text-center text-[9px] font-semibold text-slate-900">
                          {
                            report.registrations
                          }
                        </td>

                        <td className="px-2 py-1.5 text-center text-[9px] font-semibold text-green-700">
                          {
                            report.present
                          }
                        </td>

                        <td className="px-2 py-1.5 text-center text-[9px] font-semibold text-red-600">
                          {
                            report.absent
                          }
                        </td>

                        <td className="px-2 py-1.5 text-center text-[9px] font-semibold text-slate-900">
                          {report.registrations >
                          0
                            ? `${report.attendanceRate}%`
                            : "—"}
                        </td>

                        <td className="px-2 py-1.5 text-center">
                          <span
                            className={`inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-medium ${performance.className}`}
                          >
                            {
                              performance.label
                            }
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}