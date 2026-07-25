"use client";

import type {
  EventReport,
  MunicipalityReport,
} from "../types";
import { formatDate } from "../utils";

type ExportCSVButtonProps = {
  eventReports: EventReport[];
  municipalityReports: MunicipalityReport[];
};

function escapeCsvValue(value: string | number | null | undefined) {
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
}: ExportCSVButtonProps) {
  const hasData =
    eventReports.length > 0 ||
    municipalityReports.length > 0;

  const handleExport = () => {
    if (!hasData) {
      return;
    }

    const rows: Array<Array<string | number>> = [];

    // Report title
    rows.push(["PagTipon Provincial Report"]);
    rows.push([
      "Generated",
      new Date().toLocaleString("en-PH"),
    ]);

    rows.push([]);

    /*
     * EVENT ATTENDANCE SECTION
     */
    rows.push(["EVENT ATTENDANCE SUMMARY"]);

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
        report.event.title || "Untitled Event",
        report.event.status || "No status",
        formatDate(report.event.start_at),
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
    rows.push(["MUNICIPALITY PARTICIPATION"]);

    rows.push([
      "Municipality",
      "Events Received",
      "Prepared",
      "Preparation Rate",
      "Registrations",
      "Present",
      "Attendance Rate",
    ]);

    municipalityReports.forEach((report) => {
      rows.push([
        report.municipality,
        report.eventsReceived,
        report.prepared,
        `${report.preparationRate}%`,
        report.registrations,
        report.present,
        `${report.attendanceRate}%`,
      ]);
    });

    /*
     * Convert rows to CSV
     */
    const csvContent = rows
      .map((row) =>
        row.map((value) => escapeCsvValue(value)).join(",")
      )
      .join("\n");

    /*
     * UTF-8 BOM makes Excel display special characters
     * such as ñ correctly.
     */
    const csvWithBom = `\uFEFF${csvContent}`;

    const blob = new Blob([csvWithBom], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    const date = new Date();

    const dateString = date
      .toISOString()
      .split("T")[0];

    link.href = url;
    link.download = `pagtipon-provincial-report-${dateString}.csv`;

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
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {/* Download Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line
          x1="12"
          x2="12"
          y1="15"
          y2="3"
        />
      </svg>

      Export CSV
    </button>
  );
}