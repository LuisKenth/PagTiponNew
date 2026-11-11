import type { MunicipalAttendanceRecord } from "../types/municipalAttendance";

type AttendancePdfEvent = {
  title: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
};

type AttendancePdfFilters = {
  search: string;
  status: string;
  method: string;
};

type DownloadAttendancePdfOptions = {
  event: AttendancePdfEvent;
  municipality: string;
  allRecords: MunicipalAttendanceRecord[];
  filteredRecords: MunicipalAttendanceRecord[];
  filters: AttendancePdfFilters;
};

const dateTimePH = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

function safeText(value: unknown): string {
  return String(value ?? "-")
    .replace(/\r?\n/g, " ")
    .replace(/[\u2012-\u2015\u2212]/g, "-")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "-";
}

function formatPH(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dateTimePH.format(date) : "-";
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return "-";
  if (value === "qr") return "QR Scan";
  if (value === "manual") return "Manual";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Browser-only export: uses records already fetched by the secured municipal
 * attendance page. Never fetches extra data or changes attendance records.
 * Exports every filtered record, independent of on-screen pagination.
 */
export async function downloadAttendancePdf({
  event,
  municipality,
  allRecords,
  filteredRecords,
  filters,
}: DownloadAttendancePdfOptions): Promise<void> {
  if (filteredRecords.length === 0) {
    throw new Error("There are no matching attendance records to export.");
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 13.5;
  const contentWidth = pageWidth - left * 2;
  const bottomLimit = pageHeight - 17;
  const generatedAt = formatPH(new Date().toISOString());
  const title = safeText(event.title || "Untitled Event");
  let y = 38;

  const present = allRecords.filter((r) => r.attendance_status === "present").length;
  const late = allRecords.filter((r) => r.attendance_status === "late").length;
  const absent = allRecords.filter((r) => r.attendance_status === "absent").length;
  const pending = allRecords.filter((r) => r.attendance_status === "pending").length;

  doc.setProperties({
    title: `PagTipon - Event Attendance - ${title}`,
    subject: "Municipal Event Attendance Records",
    author: "PagTipon",
    creator: "PagTipon Municipal Attendance",
  });

  function drawPageHeader(isFirstPage: boolean): void {
    doc.setFillColor(23, 37, 84);
    doc.rect(0, 0, pageWidth, 26, "F");
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 26, pageWidth, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PagTipon", left, 12);
    doc.setFontSize(9);
    doc.text("EVENT ATTENDANCE REPORT", left, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(safeText(municipality), pageWidth - left, 17, {
      align: "right",
    });
    y = isFirstPage ? 36 : 36;
  }

  function nextPage(): void {
    doc.addPage();
    drawPageHeader(false);
  }

  const columnWidths = [38, 52, 25, 24, 22, 37, 37, 35];
  const columnHeaders = [
    "Participant", "Email", "Municipality", "Status", "Method",
    "Time In (PH)", "Time Out (PH)", "Checked In By",
  ];

  function drawColumnHeaders(): void {
    if (y + 11 > bottomLimit) nextPage();
    doc.setFillColor(79, 70, 229);
    doc.rect(left, y, contentWidth, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.3);
    doc.setTextColor(255, 255, 255);
    let x = left;
    columnHeaders.forEach((header, index) => {
      doc.text(header, x + 2, y + 6.2);
      x += columnWidths[index];
    });
    y += 10;
  }

  drawPageHeader(true);

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const eventTitleLines = doc.splitTextToSize(title, contentWidth) as string[];
  doc.text(eventTitleLines, left, y);
  y += Math.max(8, eventTitleLines.length * 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const eventDetails = `Status: ${formatLabel(event.status)}   |   Start: ${formatPH(event.start_at)}   |   End: ${formatPH(event.end_at)}`;
  doc.text(safeText(eventDetails), left, y);
  y += 6.5;

  const figures = [
    { label: "Registered", value: allRecords.length },
    { label: "Present", value: present },
    { label: "Late", value: late },
    { label: "Absent", value: absent },
    { label: "Pending", value: pending },
  ];
  const gap = 3;
  const cardWidth = (contentWidth - 4 * gap) / 5;
  figures.forEach((item, index) => {
    const x = left + index * (cardWidth + gap);
    doc.setFillColor(242, 245, 252);
    doc.roundedRect(x, y, cardWidth, 18, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.text(String(item.value), x + 3, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.text(item.label, x + 3, y + 14);
  });
  y += 25;

  const filterDescription = [
    filters.search.trim() ? `Name: ${filters.search.trim()}` : "All participants",
    filters.status !== "all" ? `Status: ${formatLabel(filters.status)}` : "All statuses",
    filters.method !== "all" ? `Method: ${formatLabel(filters.method)}` : "All methods",
  ].join("  |  ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Exported records: ${filteredRecords.length} of ${allRecords.length}`, left, y);
  y += 5;
  const filterLines = doc.splitTextToSize(safeText(filterDescription), contentWidth) as string[];
  doc.text(filterLines, left, y);
  y += filterLines.length * 4 + 4;

  drawColumnHeaders();

  filteredRecords.forEach((record, index) => {
    const cells = [
      safeText(record.participant_name),
      safeText(record.participant_email),
      safeText(record.participant_municipality || record.municipality || municipality),
      formatLabel(record.attendance_status),
      formatLabel(record.attendance_method),
      formatPH(record.checked_in_at),
      formatPH(record.checked_out_at),
      safeText(record.checked_in_by_name),
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const wrapped = cells.map((cell, col) =>
      doc.splitTextToSize(safeText(cell), columnWidths[col] - 4) as string[],
    );
    const maxLines = Math.max(...wrapped.map((parts) => parts.length));
    const rowHeight = Math.max(10, maxLines * 3.6 + 3.5);
    if (y + rowHeight > bottomLimit) {
      nextPage();
      drawColumnHeaders();
    }
    if (index % 2 === 0) {
      doc.setFillColor(246, 248, 252);
      doc.rect(left, y, contentWidth, rowHeight, "F");
    }
    doc.setTextColor(51, 65, 85);
    let x = left;
    wrapped.forEach((lines, col) => {
      doc.text(lines, x + 2, y + 4.4, { lineHeightFactor: 1.15 });
      x += columnWidths[col];
    });
    y += rowHeight;
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(left, pageHeight - 14, pageWidth - left, pageHeight - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated by PagTipon | ${generatedAt} (PH)`, left, pageHeight - 9);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - left, pageHeight - 9, {
      align: "right",
    });
  }

  const fileTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55) || "event";
  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`pagtipon-attendance-${fileTitle}-${dateStamp}.pdf`);
}
