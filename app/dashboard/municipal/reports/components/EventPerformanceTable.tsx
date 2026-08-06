import {
  CalendarDays,
  CircleAlert,
  ClipboardX,
  LoaderCircle,
  QrCode,
  ScanLine,
  UsersRound,
} from "lucide-react";

import type {
  MunicipalReportEvent,
} from "../types/municipalReports";

type EventPerformanceTableProps = {
  events: MunicipalReportEvent[];
  loading: boolean;
  errorMessage: string | null;
};

type AttendanceRateDisplay = {
  label: string;
  detail: string;
  showBar: boolean;
  textClass: string;
  barClass: string;
};

function normalizeValue(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}

function formatStatusLabel(
  value: string,
) {
  const normalized =
    normalizeValue(value);

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

function getStatusClasses(
  value: string,
) {
  switch (
  normalizeValue(value)
  ) {
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

function formatEventDate(
  value: string | null,
) {
  if (!value) {
    return "Schedule unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Schedule unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function getAttendanceRateDisplay(
  event: MunicipalReportEvent,
): AttendanceRateDisplay {
  const status = normalizeValue(
    event.eventStatus,
  );

  if (status === "cancelled") {
    return {
      label: "N/A",
      detail: "Cancelled event",
      showBar: false,
      textClass: "text-red-600",
      barClass: "bg-red-400",
    };
  }

  if (
    status === "draft" ||
    status === "published" ||
    status === "upcoming"
  ) {
    return {
      label: "Not started",
      detail:
        "Rate available after event start",
      showBar: false,
      textClass: "text-amber-700",
      barClass: "bg-amber-400",
    };
  }

  if (
    status === "ongoing" ||
    status === "completed"
  ) {
    if (
      event.totalRegistrations === 0
    ) {
      return {
        label: "No registrations",
        detail:
          "No eligible participants",
        showBar: false,
        textClass: "text-slate-600",
        barClass: "bg-slate-400",
      };
    }

    return {
      label: `${event.attendanceRate.toFixed(
        1,
      )}%`,
      detail:
        status === "ongoing"
          ? "Live rate"
          : "Final rate",
      showBar: true,
      textClass:
        status === "ongoing"
          ? "text-blue-700"
          : "text-emerald-700",
      barClass:
        status === "ongoing"
          ? "bg-blue-500"
          : "bg-emerald-500",
    };
  }

  return {
    label: "Unavailable",
    detail:
      "Event status unavailable",
    showBar: false,
    textClass: "text-slate-500",
    barClass: "bg-slate-400",
  };
}

export default function EventPerformanceTable({
  events,
  loading,
  errorMessage,
}: EventPerformanceTableProps) {
  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center px-6 py-12">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-slate-500" />

          <p className="mt-3 text-sm font-medium text-slate-500">
            Loading report events...
          </p>
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
            Unable to load reports
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <ClipboardX className="mx-auto h-10 w-10 text-slate-300" />

          <h3 className="mt-4 font-bold text-slate-900">
            No report events found
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            No assigned events match the
            selected report filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-[1100px] w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Event",
                "Status",
                "Registrations",
                "Attendance",
                "Check-ins",
                "Rate",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {events.map((event) => (
              <tr
                key={
                  event.eventMunicipalityId
                }
                className="transition hover:bg-slate-50"
              >
                <td className="px-5 py-4 align-top">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <CalendarDays className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="max-w-xs font-bold text-slate-900">
                        {event.eventTitle}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatEventDate(
                          event.startAt,
                        )}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Preparation:{" "}
                        {formatStatusLabel(
                          event.municipalStatus,
                        )}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4 align-top">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                      event.eventStatus,
                    )}`}
                  >
                    {formatStatusLabel(
                      event.eventStatus,
                    )}
                  </span>
                </td>

                <td className="px-5 py-4 align-top">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                    <UsersRound className="h-4 w-4" />
                    {
                      event.totalRegistrations
                    }
                  </span>
                </td>

                <td className="px-5 py-4 align-top">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                      {event.presentCount} present
                    </span>

                    {event.lateCount >
                      0 && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                          {event.lateCount} late
                        </span>
                      )}

                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                      {event.absentCount} absent
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                      {event.pendingCount} pending
                    </span>
                  </div>
                </td>

                <td className="px-5 py-4 align-top">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                      <QrCode className="h-3.5 w-3.5" />
                      {event.qrCheckInCount} QR
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                      <ScanLine className="h-3.5 w-3.5" />
                      {
                        event.manualCheckInCount
                      }{" "}
                      manual
                    </span>
                  </div>
                </td>

                <td className="px-5 py-4 align-top">
                  {(() => {
                    const rateDisplay =
                      getAttendanceRateDisplay(
                        event,
                      );

                    return (
                      <div className="min-w-32">
                        <p
                          className={`text-sm font-bold ${rateDisplay.textClass}`}
                        >
                          {rateDisplay.label}
                        </p>

                        <p className="mt-1 text-[11px] font-medium text-slate-400">
                          {rateDisplay.detail}
                        </p>

                        {rateDisplay.showBar && (
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${rateDisplay.barClass}`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  event.attendanceRate,
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-200 lg:hidden">
        {events.map((event) => (
          <article
            key={
              event.eventMunicipalityId
            }
            className="p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {event.eventTitle}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatEventDate(
                        event.startAt,
                      )}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                      event.eventStatus,
                    )}`}
                  >
                    {formatStatusLabel(
                      event.eventStatus,
                    )}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Registrations
                    </dt>

                    <dd className="mt-1 font-bold text-slate-800">
                      {
                        event.totalRegistrations
                      }
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Attendance Rate
                    </dt>

                    {(() => {
                      const rateDisplay =
                        getAttendanceRateDisplay(
                          event,
                        );

                      return (
                        <>
                          <dd
                            className={`mt-1 font-bold ${rateDisplay.textClass}`}
                          >
                            {rateDisplay.label}
                          </dd>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {rateDisplay.detail}
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Present / Late
                    </dt>

                    <dd className="mt-1 font-semibold text-slate-700">
                      {event.presentCount} /{" "}
                      {event.lateCount}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Absent / Pending
                    </dt>

                    <dd className="mt-1 font-semibold text-slate-700">
                      {event.absentCount} /{" "}
                      {event.pendingCount}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      QR Check-ins
                    </dt>

                    <dd className="mt-1 font-semibold text-blue-700">
                      {
                        event.qrCheckInCount
                      }
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Manual Check-ins
                    </dt>

                    <dd className="mt-1 font-semibold text-violet-700">
                      {
                        event.manualCheckInCount
                      }
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
