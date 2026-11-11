"use client";

/** Styled Excel workbook for Provincial Reports.
 * CSV remains available as the unformatted, machine-readable export.
 * ExcelJS is loaded only when the user clicks Export Excel.
 */

type ReportTab = "events" | "municipalities" | "participants";

type ExcelExportOptions = {
  tab: ReportTab;
  title: string;
  filters: string;
  refreshedAt: string;
  headers: string[];
  rows: string[][];
  summary: {
    events: number;
    registrations: number;
    attended: number;
    overallRate: number | null;
  };
};

const NAVY = "18254C";
const INDIGO = "4F46E5";
const DARK = "0F172A";
const MUTED = "64748B";
const LIGHT = "F1F5F9";
const BORDER = "E2E8F0";
const WHITE = "FFFFFF";

function excelSafeText(value: string) {
  // ExcelJS treats string values as text; explicitly escape formula-like input.
  return /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function toExcelValue(value: string, header: string): number | string {
  const text = value.trim();
  if (text === "—" || !text) return text || "—";
  if (/^(Registered|Attended|Assigned Events)$/i.test(header) && /^\d+$/.test(text)) {
    return Number(text);
  }
  if (header === "Overall Participation Rate" && /^\d+(?:\.\d+)?%$/.test(text)) {
    return Number(text.slice(0, -1)) / 100;
  }
  return excelSafeText(value);
}

export async function exportStyledReportExcel({
  tab,
  title,
  filters,
  refreshedAt,
  headers,
  rows,
  summary,
}: ExcelExportOptions): Promise<void> {
  if (!rows.length) return;

  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "PagTipon";
  workbook.subject = "Provincial attendance and event analytics";
  workbook.title = `PagTipon — ${title}`;
  workbook.created = new Date();

  // Event name and schedule are separate columns to prevent huge wrapped cells.
  const finalHeaders = tab === "events"
    ? ["Event", "Schedule (PH)", ...headers.slice(1)]
    : [...headers];
  const finalRows = rows.map((row) => {
    if (tab !== "events") return row;
    const [eventTitle, ...scheduleLines] = row[0].split("\n");
    return [eventTitle, scheduleLines.join(" "), ...row.slice(1)];
  });
  const widths = tab === "events"
    ? [32, 46, 17, 18, 28, 17, 16, 29, 33]
    : tab === "municipalities"
      ? [32, 20, 18, 18, 30, 36]
      : [30, 25, 27, 34, 18, 30, 30, 20];

  const worksheet = workbook.addWorksheet(title.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 12 }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 },
    },
  });
  worksheet.properties.defaultRowHeight = 21;
  worksheet.headerFooter.oddFooter = "&LPagTipon — Provincial Reports&RPage &P of &N";

  // Reserve the needed width for every exported column.
  const lastReportColumn = tab === "events" ? "I" : "H";
  for (let i = 1; i <= Math.max(8, finalHeaders.length); i++) {
    worksheet.getColumn(i).width = widths[i - 1] ?? 19;
  }

  worksheet.mergeCells(`A1:${lastReportColumn}2`);
  const heading = worksheet.getCell("A1");
  heading.value = "PAGTIPON  |  PROVINCIAL REPORTS";
  heading.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  heading.font = { name: "Aptos", size: 19, bold: true, color: { argb: WHITE } };
  heading.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  worksheet.getRow(1).height = 31;
  worksheet.getRow(2).height = 15;

  worksheet.mergeCells(`A3:${lastReportColumn}3`);
  const subtitle = worksheet.getCell("A3");
  subtitle.value = title.toUpperCase();
  subtitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E0E7FF" } };
  subtitle.font = { name: "Aptos", size: 12, bold: true, color: { argb: NAVY } };
  subtitle.alignment = { vertical: "middle", indent: 1 };
  worksheet.getRow(3).height = 28;

  worksheet.mergeCells(`A4:${lastReportColumn}4`);
  const filtersLabel = worksheet.getCell("A4");
  filtersLabel.value = "FILTERS APPLIED";
  filtersLabel.font = { name: "Aptos", size: 9, bold: true, color: { argb: INDIGO } };
  filtersLabel.alignment = { vertical: "middle" };
  worksheet.getRow(4).height = 18;

  worksheet.mergeCells(`A5:${lastReportColumn}6`);
  const filtersCell = worksheet.getCell("A5");
  filtersCell.value = excelSafeText(filters);
  filtersCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
  filtersCell.font = { name: "Aptos", size: 10, color: { argb: DARK } };
  filtersCell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
  worksheet.getRow(5).height = 22;
  worksheet.getRow(6).height = 22;

  worksheet.mergeCells(`A7:${lastReportColumn}7`);
  const refreshed = worksheet.getCell("A7");
  refreshed.value = `Data refreshed (PH): ${refreshedAt}    •    Exported: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`;
  refreshed.font = { name: "Aptos", size: 9, italic: true, color: { argb: MUTED } };
  worksheet.getRow(7).height = 23;

  const metrics: [string, number | string][] = [
    ["EVENTS", summary.events],
    ["REGISTERED", summary.registrations],
    ["ATTENDED", summary.attended],
    ["OVERALL RATE", summary.overallRate === null ? "—" : `${summary.overallRate}%`],
  ];
  for (const [index, [label, value]] of metrics.entries()) {
    const labelCell = worksheet.getCell(8, index * 2 + 1);
    const valueCell = worksheet.getCell(8, index * 2 + 2);
    labelCell.value = label;
    valueCell.value = value;
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EEF2FF" } };
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EEF2FF" } };
    labelCell.font = { name: "Aptos", size: 10, bold: true, color: { argb: MUTED } };
    valueCell.font = { name: "Aptos", size: 14, bold: true, color: { argb: NAVY } };
    labelCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    valueCell.alignment = { vertical: "middle", horizontal: "center" };
  }
  worksheet.getRow(8).height = 39;

  worksheet.mergeCells(`A10:${lastReportColumn}10`);
  const note = worksheet.getCell("A10");
  note.value = "Overall Rate = Attended ÷ Registered (provisional for unfinished events). Completed-Event Rate uses completed-event registrations only; — means no eligible denominator.";
  note.font = { name: "Aptos", size: 9, color: { argb: MUTED } };
  note.alignment = { vertical: "middle", wrapText: true };
  worksheet.getRow(10).height = 32;

  worksheet.mergeCells(`A11:${lastReportColumn}11`);
  const section = worksheet.getCell("A11");
  section.value = `DETAIL RECORDS  •  ${finalRows.length} ${finalRows.length === 1 ? "ROW" : "ROWS"}`;
  section.font = { name: "Aptos", size: 10, bold: true, color: { argb: NAVY } };
  section.alignment = { vertical: "middle" };
  worksheet.getRow(11).height = 24;

  const headerRow = worksheet.getRow(12);
  headerRow.height = 35;
  for (const [index, name] of finalHeaders.entries()) {
    const cell = headerRow.getCell(index + 1);
    cell.value = name;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INDIGO } };
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: WHITE } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }

  for (const [index, values] of finalRows.entries()) {
    const dataRow = worksheet.getRow(index + 13);
    dataRow.height = tab === "events" ? 43 : 29;
    values.forEach((value, columnIndex) => {
      const cell = dataRow.getCell(columnIndex + 1);
      const header = finalHeaders[columnIndex];
      cell.value = toExcelValue(value, header);
      cell.font = { name: "Aptos", size: 10, color: { argb: DARK } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? LIGHT : WHITE } };
      cell.alignment = { vertical: "middle", horizontal: typeof cell.value === "number" ? "center" : "left", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: BORDER } } };
      if (header === "Overall Participation Rate" && typeof cell.value === "number") {
        cell.numFmt = "0%";
      }
      if (header === "Status" || header === "Attendance") {
        const status = String(value).toLowerCase();
        if (status === "completed" || status === "present") {
          cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "047857" } };
        } else if (status === "late" || status === "ongoing" || status === "upcoming") {
          cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "92400E" } };
        } else if (status === "absent" || status === "cancelled") {
          cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "B91C1C" } };
        }
      }
    });
  }

  worksheet.autoFilter = {
    from: { row: 12, column: 1 },
    to: { row: finalRows.length + 12, column: finalHeaders.length },
  };
  worksheet.pageSetup.printTitlesRow = "1:12";

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `PagTipon-${tab}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
