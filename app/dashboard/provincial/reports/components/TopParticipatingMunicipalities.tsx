"use client";

import { useMemo } from "react";

import type { MunicipalityReport } from "../types";
import { getRateClass } from "../utils";

type TopParticipatingMunicipalitiesProps = {
  reports: MunicipalityReport[];
  loading: boolean;
  limit?: number;
};

export default function TopParticipatingMunicipalities({
  reports,
  loading,
  limit = 5,
}: TopParticipatingMunicipalitiesProps) {
  const rankedMunicipalities = useMemo(() => {
    return [...reports]
      .filter(
        (report) => report.registrations > 0
      )
      .sort((a, b) => {
        if (
          b.registrations !==
          a.registrations
        ) {
          return (
            b.registrations -
            a.registrations
          );
        }

        if (b.present !== a.present) {
          return b.present - a.present;
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

        return a.municipality.localeCompare(
          b.municipality
        );
      })
      .slice(0, limit);
  }, [reports, limit]);

  const highestRegistrations =
    rankedMunicipalities.length > 0
      ? rankedMunicipalities[0]
          .registrations
      : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:p-3 print:shadow-none">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:gap-1">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 print:text-sm">
            Top Participating Municipalities
          </h2>

          <p className="mt-1 text-sm text-slate-500 print:mt-0.5 print:text-[9px]">
            Municipalities ranked by participant
            registrations for the currently selected
            report filters.
          </p>
        </div>

        {!loading &&
          rankedMunicipalities.length > 0 && (
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 print:hidden">
              Top{" "}
              {
                rankedMunicipalities.length
              }
            </span>
          )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Loading municipality rankings...
        </p>
      ) : rankedMunicipalities.length ===
        0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center print:mt-2 print:p-4">
          <p className="font-semibold text-slate-900 print:text-xs">
            No participation data yet
          </p>

          <p className="mt-1 text-sm text-slate-500 print:text-[9px]">
            Municipality rankings will appear
            once participants register for the
            selected events.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3 print:mt-2 print:space-y-1.5">
          {rankedMunicipalities.map(
            (report, index) => {
              const participationWidth =
                highestRegistrations > 0
                  ? Math.round(
                      (report.registrations /
                        highestRegistrations) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={report.municipality}
                  className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 print:break-inside-avoid print:rounded-lg print:p-2"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center print:flex-row print:items-center print:gap-2">
                    {/* Municipality */}
                    <div className="flex min-w-0 flex-1 items-center gap-4 print:gap-2">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold print:h-6 print:w-6 print:text-[9px] ${
                          index === 0
                            ? "bg-amber-100 text-amber-700"
                            : index === 1
                              ? "bg-slate-200 text-slate-700"
                              : index === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        #{index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between print:flex-row print:items-center print:justify-between print:gap-2">
                          <p className="truncate font-semibold text-slate-900 print:text-[10px]">
                            {
                              report.municipality
                            }
                          </p>

                          <p className="text-sm font-semibold text-slate-900 print:text-[9px]">
                            {
                              report.registrations
                            }{" "}
                            {report.registrations ===
                            1
                              ? "registration"
                              : "registrations"}
                          </p>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 print:mt-1 print:h-1">
                          <div
                            className="h-full rounded-full bg-slate-900 transition-all"
                            style={{
                              width: `${Math.min(
                                participationWidth,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[360px] print:w-[230px] print:grid-cols-3 print:gap-1">
                      <div className="rounded-lg bg-slate-50 px-3 py-2 print:px-2 print:py-1">
                        <p className="text-xs text-slate-500 print:text-[8px]">
                          Present
                        </p>

                        <p className="mt-1 font-semibold text-green-700 print:mt-0 print:text-[10px]">
                          {report.present}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 px-3 py-2 print:px-2 print:py-1">
                        <p className="text-xs text-slate-500 print:text-[8px]">
                          Attendance
                        </p>

                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium print:mt-0 print:px-1.5 print:py-0 print:text-[8px] ${getRateClass(
                            report.attendanceRate
                          )}`}
                        >
                          {
                            report.attendanceRate
                          }
                          %
                        </span>
                      </div>

                      <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2 sm:col-span-1 print:col-span-1 print:px-2 print:py-1">
                        <p className="text-xs text-slate-500 print:text-[8px]">
                          Events
                        </p>

                        <p className="mt-1 font-semibold text-slate-700 print:mt-0 print:text-[10px]">
                          {
                            report.eventsReceived
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}