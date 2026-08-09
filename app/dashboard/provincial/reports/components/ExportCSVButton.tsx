"use client";

import type {
  EventReport,
  MunicipalityReport,
} from "../types";

import type {
  ParticipantCategoryBreakdownItem,
} from "../hooks/useProvincialReports";

import { formatDate } from "../utils";

type ExportCSVButtonProps = {
  eventReports: EventReport[];
  municipalityReports: MunicipalityReport[];
  participantCategoryBreakdown: ParticipantCategoryBreakdownItem[];
};

function escapeCsvValue(
  value: string | number | null | undefined
) {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);

  // Prevent Excel / spreadsheet formula injection.
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  // Escape quotation marks.
  text = text.replace(/"/g, '""');

  // Wrap values containing commas, quotes, or line breaks.
  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text}"`;
  }

  return text;
}

export default function ExportCSVButton({
  eventReports,
  municipalityReports,
  participantCategoryBreakdown,
}: ExportCSVButtonProps) {
  const hasData =
    eventReports.length > 0 ||
    municipalityReports.length > 0 ||
    participantCategoryBreakdown.length > 0;

  const handleExport = () => {
    if (!hasData) {
      return;
    }

    const rows: Array<
      Array<string | number>
    > = [];

    // Report title
    rows.push([
      "PagTipon Provincial Report",
    ]);

    rows.push([
      "Generated",
      new Date().toLocaleString("en-PH"),
    ]);

    rows.push([]);

    /*
     * EVENT ATTENDANCE SECTION
     */
    rows.push([
      "EVENT ATTENDANCE SUMMARY",
    ]);

    rows.push([
      "Event",
      "Status",
      "Start Date",
      "Municipalities",
      "Registrations",
      "Present",
      "Absent",
      "Attendance Rate",
    ]);

    eventReports.forEach((report) => {
      rows.push([
        report.event.title ||
          "Untitled Event",
        report.event.status ||
          "No status",
        formatDate(
          report.event.start_at
        ),
        report.municipalities.join(", "),
        report.registrations,
        report.present,
        report.absent,
        `${report.attendanceRate}%`,
      ]);
    });

    rows.push([]);
    rows.push([]);

    /*
     * MUNICIPALITY PARTICIPATION SECTION
     */
    rows.push([
      "MUNICIPALITY PARTICIPATION",
    ]);

    rows.push([
      "Municipality",
      "Events Received",
      "Prepared",
      "Preparation Rate",
      "Registrations",
      "Present",
      "Attendance Rate",
    ]);

    municipalityReports.forEach(
      (report) => {
        rows.push([
          report.municipality,
          report.eventsReceived,
          report.prepared,
          `${report.preparationRate}%`,
          report.registrations,
          report.present,
          `${report.attendanceRate}%`,
        ]);
      }
    );

    rows.push([]);
    rows.push([]);

    /*
     * PARTICIPANT CATEGORY BREAKDOWN
     */
    rows.push([
      "PARTICIPANT CATEGORY BREAKDOWN",
    ]);

    rows.push([
      "Participant Category",
      "Registrations",
      "Share",
      "Present",
      "Absent",
      "Attendance Rate",
    ]);

    participantCategoryBreakdown.forEach(
      (item) => {
        rows.push([
          item.label,
          item.registrations,
          `${item.percentage}%`,
          item.present,
          item.absent,
          `${item.attendanceRate}%`,
        ]);
      }
    );

    /*
     * Convert rows to CSV
     */
    const csvContent = rows
      .map((row) =>
        row
          .map((value) =>
            escapeCsvValue(value)
          )
          .join(",")
      )
      .join("\n");

    /*
     * UTF-8 BOM makes Excel display special characters
     * such as ñ correctly.
     */
    const csvWithBom =
      `\uFEFF${csvContent}`;

    const blob = new Blob(
      [csvWithBom],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const date = new Date();

    const dateString = date
      .toISOString()
      .split("T")[0];

    link.href = url;

    link.download =
      `pagtipon-provincial-report-${dateString}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!hasData}
      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Export CSV
    </button>
  );
}