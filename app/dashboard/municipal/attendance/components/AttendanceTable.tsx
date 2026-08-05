"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  ClipboardX,
  Clock3,
  LoaderCircle,
  QrCode,
  ScanLine,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

import type {
  AttendanceStatus,
  MunicipalAttendanceRecord,
} from "../types/municipalAttendance";

import {
  formatAttendanceDate,
  getAttendanceMethodLabel,
  getAttendanceStatusLabel,
} from "../utils/municipalAttendanceUtils";

type AttendanceEventGroup = {
  eventMunicipalityId: string;
  eventTitle: string;
  eventStatus: string;
  records: MunicipalAttendanceRecord[];

  registeredCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  pendingCount: number;

  qrCheckInCount: number;
  manualCheckInCount: number;
};

type AttendanceTableProps = {
  eventGroups: AttendanceEventGroup[];
  loading: boolean;
  errorMessage: string | null;
};

const PARTICIPANTS_PER_PAGE = 5;

function normalizeValue(
  value:
    | string
    | null
    | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getStatusClasses(
  status: AttendanceStatus,
) {
  switch (status) {
    case "present":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "late":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "absent":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function getMethodClasses(
  method:
    | MunicipalAttendanceRecord["attendance_method"]
    | null,
) {
  switch (method) {
    case "qr":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "manual":
      return "bg-violet-50 text-violet-700 ring-violet-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getEventStatusClasses(
  status: string,
) {
  switch (normalizeValue(status)) {
    case "ongoing":
      return "bg-blue-100 text-blue-700";

    case "completed":
      return "bg-slate-200 text-slate-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    case "published":
    case "upcoming":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getEventStatusLabel(
  status: string,
) {
  const normalized =
    normalizeValue(status);

  if (!normalized) {
    return "Unknown";
  }

  return normalized
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

export default function AttendanceTable({
  eventGroups,
  loading,
  errorMessage,
}: AttendanceTableProps) {
  const [
    expandedEventIds,
    setExpandedEventIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  /*
   * Each event keeps its own participant
   * pagination state.
   */
  const [
    participantPageByEvent,
    setParticipantPageByEvent,
  ] = useState<Record<string, number>>(
    {},
  );

  /*
   * Automatically expand an event when the
   * current filters return only one event.
   *
   * Previously expanded events remain expanded
   * as long as they are still visible.
   */
  useEffect(() => {
    setExpandedEventIds(
      (previousIds) => {
        const visibleEventIds =
          new Set(
            eventGroups.map(
              (eventGroup) =>
                eventGroup.eventMunicipalityId,
            ),
          );

        const nextIds = new Set(
          Array.from(
            previousIds,
          ).filter((eventId) =>
            visibleEventIds.has(
              eventId,
            ),
          ),
        );

        if (eventGroups.length === 1) {
          nextIds.add(
            eventGroups[0]
              .eventMunicipalityId,
          );
        }

        const previousValues =
          Array.from(previousIds).sort();

        const nextValues =
          Array.from(nextIds).sort();

        const unchanged =
          previousValues.length ===
            nextValues.length &&
          previousValues.every(
            (value, index) =>
              value ===
              nextValues[index],
          );

        return unchanged
          ? previousIds
          : nextIds;
      },
    );
  }, [eventGroups]);

  /*
   * Keep every event participant page valid
   * when filters or attendance records change.
   */
  useEffect(() => {
    setParticipantPageByEvent(
      (previousPages) => {
        const nextPages: Record<
          string,
          number
        > = {};

        eventGroups.forEach(
          (eventGroup) => {
            const totalParticipantPages =
              Math.max(
                1,
                Math.ceil(
                  eventGroup.records.length /
                    PARTICIPANTS_PER_PAGE,
                ),
              );

            const previousPage =
              previousPages[
                eventGroup
                  .eventMunicipalityId
              ] ?? 1;

            nextPages[
              eventGroup.eventMunicipalityId
            ] = Math.min(
              Math.max(previousPage, 1),
              totalParticipantPages,
            );
          },
        );

        const previousKeys =
          Object.keys(
            previousPages,
          ).sort();

        const nextKeys =
          Object.keys(nextPages).sort();

        const unchanged =
          previousKeys.length ===
            nextKeys.length &&
          previousKeys.every(
            (key, index) =>
              key === nextKeys[index] &&
              previousPages[key] ===
                nextPages[key],
          );

        return unchanged
          ? previousPages
          : nextPages;
      },
    );
  }, [eventGroups]);

  function toggleEvent(
    eventMunicipalityId: string,
  ) {
    setExpandedEventIds(
      (previousIds) => {
        const nextIds = new Set(
          previousIds,
        );

        if (
          nextIds.has(
            eventMunicipalityId,
          )
        ) {
          nextIds.delete(
            eventMunicipalityId,
          );
        } else {
          nextIds.add(
            eventMunicipalityId,
          );
        }

        return nextIds;
      },
    );
  }

  function changeParticipantPage(
    eventMunicipalityId: string,
    requestedPage: number,
    totalPages: number,
  ) {
    const validPage = Math.min(
      Math.max(requestedPage, 1),
      totalPages,
    );

    setParticipantPageByEvent(
      (previousPages) => ({
        ...previousPages,
        [eventMunicipalityId]:
          validPage,
      }),
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-5 sm:p-6">
        {[1, 2, 3].map(
          (item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-slate-100"
            />
          ),
        )}

        <div className="flex items-center justify-center pt-2">
          <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-72 items-center justify-center px-6 py-12">
        <div className="max-w-lg text-center">
          <CircleAlert className="mx-auto h-9 w-9 text-red-500" />

          <h3 className="mt-3 font-bold text-slate-900">
            Unable to load attendance
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  if (eventGroups.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <ClipboardX className="mx-auto h-9 w-9 text-slate-400" />

          <h3 className="mt-3 font-bold text-slate-900">
            No attendance records found
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Registered participants will
            appear here. Use the filters to
            review a specific event or
            attendance status.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-slate-50/60 p-4 sm:p-5">
      {eventGroups.map(
        (eventGroup) => {
          const expanded =
            expandedEventIds.has(
              eventGroup.eventMunicipalityId,
            );

          const isCancelled =
            normalizeValue(
              eventGroup.eventStatus,
            ) === "cancelled";

          /*
           * Participant-level pagination for
           * this particular event.
           */
          const totalParticipantPages =
            Math.max(
              1,
              Math.ceil(
                eventGroup.records.length /
                  PARTICIPANTS_PER_PAGE,
              ),
            );

          const participantPage = Math.min(
            participantPageByEvent[
              eventGroup.eventMunicipalityId
            ] ?? 1,
            totalParticipantPages,
          );

          const participantStartIndex =
            (participantPage - 1) *
            PARTICIPANTS_PER_PAGE;

          const visibleParticipantRecords =
            eventGroup.records.slice(
              participantStartIndex,
              participantStartIndex +
                PARTICIPANTS_PER_PAGE,
            );

          const firstVisibleParticipant =
            eventGroup.records.length === 0
              ? 0
              : participantStartIndex + 1;

          const lastVisibleParticipant =
            Math.min(
              participantStartIndex +
                PARTICIPANTS_PER_PAGE,
              eventGroup.records.length,
            );

          return (
            <section
              key={
                eventGroup.eventMunicipalityId
              }
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                isCancelled
                  ? "border-red-200"
                  : "border-slate-200"
              }`}
            >
              {/* Event heading */}
              <button
                type="button"
                onClick={() =>
                  toggleEvent(
                    eventGroup.eventMunicipalityId,
                  )
                }
                aria-expanded={expanded}
                className={`flex w-full flex-col gap-4 p-4 text-left transition sm:p-5 lg:flex-row lg:items-center lg:justify-between ${
                  isCancelled
                    ? "bg-red-50/70 hover:bg-red-50"
                    : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isCancelled
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-950 text-white"
                    }`}
                  >
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      Provincial Event
                    </p>

                    <h3
                      className={`mt-1 text-base font-bold sm:text-lg ${
                        isCancelled
                          ? "text-red-950"
                          : "text-slate-950"
                      }`}
                    >
                      {
                        eventGroup.eventTitle
                      }
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEventStatusClasses(
                          eventGroup.eventStatus,
                        )}`}
                      >
                        {getEventStatusLabel(
                          eventGroup.eventStatus,
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        <UsersRound className="h-3.5 w-3.5" />

                        {
                          eventGroup.registeredCount
                        }{" "}
                        {eventGroup.registeredCount ===
                        1
                          ? "participant"
                          : "participants"}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />

                        {
                          eventGroup.presentCount
                        }{" "}
                        present
                      </span>

                      {eventGroup.lateCount >
                        0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <Clock3 className="h-3.5 w-3.5" />

                          {
                            eventGroup.lateCount
                          }{" "}
                          late
                        </span>
                      )}

                      {eventGroup.absentCount >
                        0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          <XCircle className="h-3.5 w-3.5" />

                          {
                            eventGroup.absentCount
                          }{" "}
                          absent
                        </span>
                      )}

                      {eventGroup.pendingCount >
                        0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          <Clock3 className="h-3.5 w-3.5" />

                          {
                            eventGroup.pendingCount
                          }{" "}
                          pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                      <QrCode className="h-3.5 w-3.5" />

                      {
                        eventGroup.qrCheckInCount
                      }{" "}
                      QR
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-2 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                      <ScanLine className="h-3.5 w-3.5" />

                      {
                        eventGroup.manualCheckInCount
                      }{" "}
                      manual
                    </span>
                  </div>

                  <div
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                      isCancelled
                        ? "border-red-200 bg-white text-red-700"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {expanded
                      ? "Hide participants"
                      : "View participants"}

                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded participant records */}
              {expanded && (
                <div className="border-t border-slate-200">
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          {[
                            "Participant",
                            "Attendance",
                            "Method",
                            "Check-in Time",
                            "Checked In By",
                          ].map(
                            (heading) => (
                              <th
                                key={
                                  heading
                                }
                                scope="col"
                                className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                              >
                                {
                                  heading
                                }
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 bg-white">
                        {visibleParticipantRecords.map(
                          (record) => (
                            <tr
                              key={
                                record.rsvp_id
                              }
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-5 py-4 align-top">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                    <UserRound className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900">
                                      {
                                        record.participant_name
                                      }
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                      {
                                        record.participant_email
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                      {record.participant_municipality ??
                                        "Municipality unavailable"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 align-top">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getStatusClasses(
                                    record.attendance_status,
                                  )}`}
                                >
                                  {getAttendanceStatusLabel(
                                    record.attendance_status,
                                  )}
                                </span>
                              </td>

                              <td className="px-5 py-4 align-top">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getMethodClasses(
                                    record.attendance_method,
                                  )}`}
                                >
                                  {getAttendanceMethodLabel(
                                    record.attendance_method,
                                  )}
                                </span>
                              </td>

                              <td className="px-5 py-4 align-top text-sm text-slate-600">
                                {formatAttendanceDate(
                                  record.checked_in_at,
                                )}
                              </td>

                              <td className="px-5 py-4 align-top text-sm text-slate-600">
                                {record.checked_in_by_name ??
                                  "—"}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile participant cards */}
                  <div className="divide-y divide-slate-100 lg:hidden">
                    {visibleParticipantRecords.map(
                      (record) => (
                        <article
                          key={
                            record.rsvp_id
                          }
                          className="p-5"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                              <UserRound className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <h4 className="font-bold text-slate-900">
                                    {
                                      record.participant_name
                                    }
                                  </h4>

                                  <p className="mt-1 break-all text-sm text-slate-500">
                                    {
                                      record.participant_email
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {record.participant_municipality ??
                                      "Municipality unavailable"}
                                  </p>
                                </div>

                                <span
                                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getStatusClasses(
                                    record.attendance_status,
                                  )}`}
                                >
                                  {getAttendanceStatusLabel(
                                    record.attendance_status,
                                  )}
                                </span>
                              </div>

                              <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                                <div>
                                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Check-in method
                                  </dt>

                                  <dd className="mt-1 font-semibold text-slate-700">
                                    {getAttendanceMethodLabel(
                                      record.attendance_method,
                                    )}
                                  </dd>
                                </div>

                                <div>
                                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Check-in time
                                  </dt>

                                  <dd className="mt-1 font-semibold text-slate-700">
                                    {formatAttendanceDate(
                                      record.checked_in_at,
                                    )}
                                  </dd>
                                </div>

                                <div className="sm:col-span-2">
                                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Checked in by
                                  </dt>

                                  <dd className="mt-1 font-semibold text-slate-700">
                                    {record.checked_in_by_name ??
                                      "—"}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          </div>
                        </article>
                      ),
                    )}
                  </div>

                  {/* Participant pagination */}
                  <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <p className="text-sm text-slate-500">
                      Showing{" "}
                      <span className="font-semibold text-slate-800">
                        {
                          firstVisibleParticipant
                        }
                      </span>
                      {" – "}
                      <span className="font-semibold text-slate-800">
                        {
                          lastVisibleParticipant
                        }
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-800">
                        {
                          eventGroup.records
                            .length
                        }
                      </span>{" "}
                      {eventGroup.records
                        .length === 1
                        ? "participant"
                        : "participants"}
                    </p>

                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          changeParticipantPage(
                            eventGroup.eventMunicipalityId,
                            participantPage -
                              1,
                            totalParticipantPages,
                          )
                        }
                        disabled={
                          participantPage <= 1
                        }
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>

                      <span className="whitespace-nowrap px-2 text-sm font-semibold text-slate-700">
                        Page{" "}
                        {participantPage}{" "}
                        of{" "}
                        {
                          totalParticipantPages
                        }
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          changeParticipantPage(
                            eventGroup.eventMunicipalityId,
                            participantPage +
                              1,
                            totalParticipantPages,
                          )
                        }
                        disabled={
                          participantPage >=
                          totalParticipantPages
                        }
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        },
      )}
    </div>
  );
}