import type {
  MunicipalAttendanceRecord,
} from "../types/municipalAttendance";

import {
  formatAttendanceDate,
  getAttendanceMethodLabel,
  getAttendanceStatusLabel,
} from "./municipalAttendanceUtils";

function escapeCsvValue(
  value:
    | string
    | number
    | boolean
    | null
    | undefined,
) {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type ExportAttendanceCsvOptions = {
  records: MunicipalAttendanceRecord[];
  eventTitle?: string | null;
};

export function exportAttendanceCsv({
  records,
  eventTitle,
}: ExportAttendanceCsvOptions) {
  if (records.length === 0) {
    window.alert(
      "There are no attendance records to export.",
    );

    return;
  }

  const headers = [
    "Participant Name",
    "Email",
    "Municipality",
    "Event",
    "Attendance Status",
    "Check-in Method",
    "Checked In At",
    "Checked In By",
    "Registration Status",
  ];

  const rows = records.map(
    (record) => [
      record.participant_name,
      record.participant_email,
      record.participant_municipality ??
        "",
      record.event_title,
      getAttendanceStatusLabel(
        record.attendance_status,
      ),
      getAttendanceMethodLabel(
        record.attendance_method,
      ),
      formatAttendanceDate(
        record.checked_in_at,
      ),
      record.checked_in_by_name ?? "",
      record.registration_status,
    ],
  );

  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      row.map(escapeCsvValue).join(","),
    ),
  ].join("\r\n");

  const csvBlob = new Blob(
    ["\uFEFF", csvContent],
    {
      type: "text/csv;charset=utf-8;",
    },
  );

  const downloadUrl =
    URL.createObjectURL(csvBlob);

  const dateStamp = new Date()
    .toISOString()
    .slice(0, 10);

  const eventName = eventTitle
    ? sanitizeFilename(eventTitle)
    : "all-events";

  const link =
    document.createElement("a");

  link.href = downloadUrl;
  link.download =
    `municipal-attendance-${eventName}-${dateStamp}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(downloadUrl);
}
