import type {
  MunicipalParticipantCategoryBreakdownItem,
  MunicipalReportEvent,
} from "../types/municipalReports";

type ExportMunicipalReportCsvOptions = {
  events: MunicipalReportEvent[];
  municipality: string | null;

  participantCategoryFilter: string;

  participantCategoryBreakdown: MunicipalParticipantCategoryBreakdownItem[];
};

type CsvValue =
  | string
  | number
  | boolean
  | null;

function escapeCsvValue(
  value: CsvValue,
) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(
      /"/g,
      '""',
    )}"`;
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

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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

function formatExportedAt() {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date());
}

function sanitizeFilename(
  value: string,
) {
  return value
    .trim()
    .replace(
      /[^a-z0-9]+/gi,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .toLowerCase();
}

function normalizeValue(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}

const PARTICIPANT_CATEGORY_LABELS: Record<
  string,
  string
> = {
  all: "All Categories",

  farmer: "Farmer",

  senior_citizen:
    "Senior Citizen",

  "senior citizen":
    "Senior Citizen",

  "4ps": "4Ps",

  fisherman: "Fisherman",

  others: "Others",

  not_set: "Not Set",
};

function formatParticipantCategoryLabel(
  value: string,
) {
  const normalizedValue =
    normalizeValue(value);

  const knownLabel =
    PARTICIPANT_CATEGORY_LABELS[
      normalizedValue
    ];

  if (knownLabel) {
    return knownLabel;
  }

  return normalizedValue
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function getAttendanceRateExportValue(
  event: MunicipalReportEvent,
) {
  const status =
    normalizeValue(
      event.eventStatus,
    );

  if (
    status ===
    "cancelled"
  ) {
    return "N/A - Cancelled event";
  }

  if (
    status === "draft" ||
    status ===
      "published" ||
    status ===
      "upcoming"
  ) {
    return "Not started";
  }

  if (
    status ===
      "ongoing" ||
    status ===
      "completed"
  ) {
    if (
      event.totalRegistrations ===
      0
    ) {
      return "No registrations";
    }

    return `${event.attendanceRate.toFixed(
      1,
    )}%`;
  }

  return "Unavailable";
}

function formatOtherCategoryDetails(
  item: MunicipalParticipantCategoryBreakdownItem,
) {
  if (
    item.value !==
      "others" ||
    item.details.length ===
      0
  ) {
    return "";
  }

  return item.details
    .map(
      (detail) =>
        `${detail.label} (${detail.count})`,
    )
    .join("; ");
}

function convertRowsToCsv(
  rows: CsvValue[][],
) {
  return rows
    .map((row) =>
      row
        .map((value) =>
          escapeCsvValue(
            value,
          ),
        )
        .join(","),
    )
    .join("\n");
}

export function exportMunicipalReportCsv({
  events,
  municipality,
  participantCategoryFilter,
  participantCategoryBreakdown,
}: ExportMunicipalReportCsvOptions) {
  if (
    events.length === 0
  ) {
    return;
  }

  const categoryFilterLabel =
    formatParticipantCategoryLabel(
      participantCategoryFilter,
    );

  /*
   * General report information.
   */
  const metadataRows: CsvValue[][] =
    [
      [
        "Municipal Report",
      ],

      [
        "Municipality",
        municipality ||
          "Unknown",
      ],

      [
        "Participant Category Filter",
        categoryFilterLabel,
      ],

      [
        "Exported At",
        formatExportedAt(),
      ],

      [],
    ];

  /*
   * Event performance table.
   */
  const eventHeadings: CsvValue[] =
    [
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

  const eventRows: CsvValue[][] =
    events.map(
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

  /*
   * Participant Category
   * Breakdown section.
   */
  const participantCategoryRows: CsvValue[][] =
    [
      [],

      [
        "Participant Category Breakdown",
      ],

      [
        "Category",
        "Participants",
        "Percentage",
        "Specified Categories",
      ],

      ...participantCategoryBreakdown.map(
        (item) => [
          item.label,

          item.count,

          `${item.percentage.toFixed(
            1,
          )}%`,

          formatOtherCategoryDetails(
            item,
          ),
        ],
      ),
    ];

  const csvContent =
    convertRowsToCsv([
      ...metadataRows,

      eventHeadings,

      ...eventRows,

      ...participantCategoryRows,
    ]);

  /*
   * UTF-8 BOM improves compatibility
   * with Microsoft Excel.
   */
  const blob =
    new Blob(
      [
        "\uFEFF",
        csvContent,
      ],
      {
        type: "text/csv;charset=utf-8;",
      },
    );

  const objectUrl =
    URL.createObjectURL(
      blob,
    );

  const link =
    document.createElement(
      "a",
    );

  const municipalityPart =
    sanitizeFilename(
      municipality ||
        "municipality",
    );

  const categoryPart =
    participantCategoryFilter ===
    "all"
      ? ""
      : `-${sanitizeFilename(
          categoryFilterLabel,
        )}`;

  const datePart =
    new Date()
      .toISOString()
      .slice(0, 10);

  link.href =
    objectUrl;

  link.download =
    `${municipalityPart}-municipal-report${categoryPart}-${datePart}.csv`;

  document.body.appendChild(
    link,
  );

  link.click();

  link.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        objectUrl,
      );
    },
    0,
  );
}