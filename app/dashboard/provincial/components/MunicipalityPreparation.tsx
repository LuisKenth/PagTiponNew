import Link from "next/link";
import { useMemo } from "react";

import type {
  EventMunicipalityRow,
  EventRow,
} from "../types";

import {
  formatStatusLabel,
  getEventTitle,
  getStatusStyle,
} from "../utils";

type MunicipalityPreparationProps = {
  loading: boolean;
  events: EventRow[];
  eventMunicipalities: EventMunicipalityRow[];
};

type MunicipalityStatus = {
  item: EventMunicipalityRow;
  preparationReady: boolean;
  registrationOpen: boolean;
  progress: number;
  overallStatus: "ready" | "in_progress" | "pending";
};

export default function MunicipalityPreparation({
  loading,
  events,
  eventMunicipalities,
}: MunicipalityPreparationProps) {
  const municipalityStatuses = useMemo<MunicipalityStatus[]>(() => {
    return eventMunicipalities.map((item) => {
      const preparationStatus = String(
        item.status || "pending"
      ).toLowerCase();

      const registrationStatus = String(
        item.registration_status || "closed"
      ).toLowerCase();

      const preparationReady = [
        "prepared",
        "ready",
        "registration_open",
      ].includes(preparationStatus);

      const registrationOpen =
        preparationStatus === "registration_open" ||
        registrationStatus === "open";

      let progress = 0;

      if (preparationReady) {
        progress += 50;
      }

      if (registrationOpen) {
        progress += 50;
      }

      let overallStatus:
        | "ready"
        | "in_progress"
        | "pending" = "pending";

      if (progress === 100) {
        overallStatus = "ready";
      } else if (progress > 0) {
        overallStatus = "in_progress";
      }

      return {
        item,
        preparationReady,
        registrationOpen,
        progress,
        overallStatus,
      };
    });
  }, [eventMunicipalities]);

  const summary = useMemo(() => {
    const total = municipalityStatuses.length;

    const ready = municipalityStatuses.filter(
      (record) => record.overallStatus === "ready"
    ).length;

    const inProgress = municipalityStatuses.filter(
      (record) =>
        record.overallStatus === "in_progress"
    ).length;

    const pending = municipalityStatuses.filter(
      (record) => record.overallStatus === "pending"
    ).length;

    const overallProgress =
      total > 0
        ? Math.round(
            municipalityStatuses.reduce(
              (sum, record) => sum + record.progress,
              0
            ) / total
          )
        : 0;

    return {
      total,
      ready,
      inProgress,
      pending,
      overallProgress,
    };
  }, [municipalityStatuses]);

  const visibleMunicipalities = useMemo(() => {
    const priority = {
      pending: 0,
      in_progress: 1,
      ready: 2,
    };

    return [...municipalityStatuses]
      .sort(
        (a, b) =>
          priority[a.overallStatus] -
          priority[b.overallStatus]
      )
      .slice(0, 8);
  }, [municipalityStatuses]);

  const getOverallStatusStyle = (
    status: MunicipalityStatus["overallStatus"]
  ) => {
    if (status === "ready") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (status === "in_progress") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-amber-100 text-amber-700";
  };

  const getOverallStatusLabel = (
    status: MunicipalityStatus["overallStatus"]
  ) => {
    if (status === "ready") {
      return "Ready";
    }

    if (status === "in_progress") {
      return "In Progress";
    }

    return "Pending";
  };

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Municipality Preparation Status
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track municipality preparation and registration
            readiness for provincial events.
          </p>
        </div>

        <Link
          href="/dashboard/provincial/municipalities"
          className="w-fit text-sm font-semibold text-slate-700 transition hover:text-slate-950"
        >
          View municipalities →
        </Link>
      </div>

      {/* SUMMARY */}
      {!loading && eventMunicipalities.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">
              Assignments
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {summary.total}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-700">
              Ready
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {summary.ready}
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-medium text-blue-700">
              In Progress
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-700">
              {summary.inProgress}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700">
              Pending
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-700">
              {summary.pending}
            </p>
          </div>

          <div className="col-span-2 rounded-xl bg-violet-50 p-4 lg:col-span-1">
            <p className="text-xs font-medium text-violet-700">
              Overall Progress
            </p>

            <p className="mt-2 text-2xl font-bold text-violet-700">
              {summary.overallProgress}%
            </p>
          </div>
        </div>
      )}

      {/* OVERALL PROGRESS */}
      {!loading && eventMunicipalities.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Overall Municipality Readiness
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Based on preparation completion and registration
                availability.
              </p>
            </div>

            <p className="shrink-0 text-xl font-bold text-slate-900">
              {summary.overallProgress}%
            </p>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${summary.overallProgress}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="mt-5 space-y-3">
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
        </div>
      )}

      {/* EMPTY */}
      {!loading && visibleMunicipalities.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <p className="font-medium text-slate-700">
            No municipality assignments yet.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Municipality preparation data will appear after an
            event is distributed.
          </p>
        </div>
      )}

      {/* MOBILE CARDS */}
      {!loading && visibleMunicipalities.length > 0 && (
        <div className="mt-5 space-y-3 md:hidden">
          {visibleMunicipalities.map(
            ({ item, progress, overallStatus }, index) => {
              const preparationStatus = String(
                item.status || "pending"
              );

              const registrationStatus = String(
                item.registration_status || "closed"
              );

              return (
                <div
                  key={`${String(
                    item.event_id
                  )}-${item.municipality}-${index}`}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {item.municipality || "N/A"}
                      </p>

                      <p className="mt-1 break-words text-sm text-slate-500">
                        {getEventTitle(
                          events,
                          item.event_id
                        )}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getOverallStatusStyle(
                        overallStatus
                      )}`}
                    >
                      {getOverallStatusLabel(
                        overallStatus
                      )}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Preparation
                      </p>

                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                          preparationStatus
                        )}`}
                      >
                        {formatStatusLabel(
                          preparationStatus
                        )}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Registration
                      </p>

                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                          registrationStatus
                        )}`}
                      >
                        {formatStatusLabel(
                          registrationStatus
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-500">
                        Progress
                      </p>

                      <p className="text-xs font-semibold text-slate-700">
                        {progress}%
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progress === 100
                            ? "bg-emerald-500"
                            : progress > 0
                            ? "bg-blue-500"
                            : "bg-amber-400"
                        }`}
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* DESKTOP TABLE */}
      {!loading && visibleMunicipalities.length > 0 && (
        <div className="mt-5 hidden overflow-hidden rounded-xl border border-slate-200 md:block">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="w-[16%] px-4 py-3 font-medium">
                  Municipality
                </th>

                <th className="w-[25%] px-4 py-3 font-medium">
                  Event
                </th>

                <th className="w-[15%] px-4 py-3 font-medium">
                  Preparation
                </th>

                <th className="w-[15%] px-4 py-3 font-medium">
                  Registration
                </th>

                <th className="w-[17%] px-4 py-3 font-medium">
                  Progress
                </th>

                <th className="w-[12%] px-4 py-3 font-medium">
                  Overall
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleMunicipalities.map(
                ({ item, progress, overallStatus }, index) => {
                  const preparationStatus = String(
                    item.status || "pending"
                  );

                  const registrationStatus = String(
                    item.registration_status || "closed"
                  );

                  return (
                    <tr
                      key={`${String(
                        item.event_id
                      )}-${item.municipality}-${index}`}
                      className="border-t border-slate-200 transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-4 align-top">
                        <p className="break-words font-semibold text-slate-900">
                          {item.municipality || "N/A"}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="break-words font-medium text-slate-700">
                          {getEventTitle(
                            events,
                            item.event_id
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                            preparationStatus
                          )}`}
                        >
                          {formatStatusLabel(
                            preparationStatus
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                            registrationStatus
                          )}`}
                        >
                          {formatStatusLabel(
                            registrationStatus
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="w-full">
                          <div className="mb-1.5 flex justify-between">
                            <span className="text-xs text-slate-500">
                              Progress
                            </span>

                            <span className="text-xs font-semibold text-slate-700">
                              {progress}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                progress === 100
                                  ? "bg-emerald-500"
                                  : progress > 0
                                  ? "bg-blue-500"
                                  : "bg-amber-400"
                              }`}
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getOverallStatusStyle(
                            overallStatus
                          )}`}
                        >
                          {getOverallStatusLabel(
                            overallStatus
                          )}
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

      {!loading && eventMunicipalities.length > 8 && (
        <div className="mt-4 text-center">
          <Link
            href="/dashboard/provincial/municipalities"
            className="text-sm font-semibold text-slate-700 hover:text-slate-950"
          >
            View all {eventMunicipalities.length} assignments →
          </Link>
        </div>
      )}
    </section>
  );
}