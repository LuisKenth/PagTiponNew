import {
  CircleAlert,
  ClipboardX,
  LoaderCircle,
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

type AttendanceTableProps = {
  records: MunicipalAttendanceRecord[];
  loading: boolean;
  errorMessage: string | null;
};

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

export default function AttendanceTable({
  records,
  loading,
  errorMessage,
}: AttendanceTableProps) {
  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center px-6 py-12">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-slate-500" />

          <p className="mt-3 text-sm font-medium text-slate-500">
            Loading attendance records...
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
            Unable to load attendance
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
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
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Participant",
                "Event",
                "Attendance",
                "Method",
                "Check-in Time",
                "Checked In By",
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
            {records.map((record) => (
              <tr
                key={record.rsvp_id}
                className="transition hover:bg-slate-50"
              >
                <td className="px-5 py-4 align-top">
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
                </td>

                <td className="px-5 py-4 align-top">
                  <p className="max-w-xs font-semibold text-slate-800">
                    {record.event_title}
                  </p>

                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {record.event_status}
                  </p>
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
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 lg:hidden">
        {records.map((record) => (
          <article
            key={record.rsvp_id}
            className="p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900">
                  {record.participant_name}
                </h3>

                <p className="mt-1 break-all text-sm text-slate-500">
                  {record.participant_email}
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {record.event_title}
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
          </article>
        ))}
      </div>
    </>
  );
}
