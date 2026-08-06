import type {
  MunicipalReportEvent,
} from "../types/municipalReports";

type ExportMunicipalReportCsvOptions = {
  events: MunicipalReportEvent[];
  municipality: string | null;
};

function escapeCsvValue(
  value: string | number | boolean | null,
) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function formatDateForCsv(
  value: string | null,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function sanitizeFilename(
  value: string,
) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normalizeValue(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}

function getAttendanceRateExportValue(
  event: MunicipalReportEvent,
) {
  const status = normalizeValue(
    event.eventStatus,
  );

  if (status === "cancelled") {
    return "N/A - Cancelled event";
  }

  if (
    status === "draft" ||
    status === "published" ||
    status === "upcoming"
  ) {
    return "Not started";
  }

  if (
    status === "ongoing" ||
    status === "completed"
  ) {
    if (
      event.totalRegistrations === 0
    ) {
      return "No registrations";
    }

    return `${event.attendanceRate.toFixed(
      1,
    )}%`;
  }

  return "Unavailable";
}

export function exportMunicipalReportCsv({
  events,
  municipality,
}: ExportMunicipalReportCsvOptions) {
  if (events.length === 0) {
    return;
  }

  const headings = [
    "Event",
    "Event Status",
    "Municipal Preparation",
    "Registration Open",
    "Start",
    "End",
    "Registrations",
    "Present",
    "Late",
    "Absent",
    "Pending",
    "QR Check-ins",
    "Manual Check-ins",
    "Attendance Rate",
  ];

  const rows = events.map(
    (event) => [
      event.eventTitle,
      event.eventStatus,
      event.municipalStatus,
      event.registrationOpen
        ? "Yes"
        : "No",
      formatDateForCsv(
        event.startAt,
      ),
      formatDateForCsv(
        event.endAt,
      ),
      event.totalRegistrations,
      event.presentCount,
      event.lateCount,
      event.absentCount,
      event.pendingCount,
      event.qrCheckInCount,
      event.manualCheckInCount,
      getAttendanceRateExportValue(
        event,
      ),
    ],
  );

  const csvContent = [
    headings,
    ...rows,
  ]
    .map((row) =>
      row
        .map((value) =>
          escapeCsvValue(value),
        )
        .join(","),
    )
    .join("\n");

  const blob = new Blob(
    [csvContent],
    {
      type: "text/csv;charset=utf-8;",
    },
  );

  const objectUrl =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  const municipalityPart =
    sanitizeFilename(
      municipality ||
      "municipality",
    );

  const datePart =
    new Date()
      .toISOString()
      .slice(0, 10);

  link.href = objectUrl;
  link.download = `${municipalityPart}-municipal-report-${datePart}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(
    objectUrl,
  );
}
