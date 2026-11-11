import type { MunicipalReportEvent } from "../types/municipalReports";

export type ParticipationPdfFilters = {
  event: string;
  search: string;
  status: string;
  category: string;
  from: string;
  to: string;
};

type DownloadOptions = {
  events: MunicipalReportEvent[];
  municipality: string;
  filters: ParticipationPdfFilters;
};

const phDate = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

const r = (value: unknown): string =>
  String(value ?? "-")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/[^\x20-\x7e]/g, "-");

function schedule(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : phDate.format(date);
}

function finalRate(event: MunicipalReportEvent): string {
  if (event.eventStatus !== "completed" || event.totalRegistrations <= 0) return "-";
  return `${Math.round(((event.presentCount + event.lateCount) / event.totalRegistrations) * 100)}%`;
}

/**
 * Produces an official participation summary using the already-filtered,
 * municipality-restricted report events. This does not fetch any data or
 * modify existing attendance/registration records.
 */
export async function downloadMunicipalParticipationPdf({
  events,
  municipality,
  filters,
}: DownloadOptions): Promise<void> {
  if (!events.length) throw new Error("No matching events to include in the report.");

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const bottom = pageHeight - 20;
  let y = 38;

  const registered = events.reduce((n, e) => n + e.totalRegistrations, 0);
  const present = events.reduce((n, e) => n + e.presentCount, 0);
  const late = events.reduce((n, e) => n + e.lateCount, 0);
  const absent = events.reduce((n, e) => n + e.absentCount, 0);
  const pending = events.reduce((n, e) => n + e.pendingCount, 0);
  const attended = present + late;
  const completed = events.filter((e) => e.eventStatus === "completed");
  const completedRegistered = completed.reduce((n, e) => n + e.totalRegistrations, 0);
  const completedAttended = completed.reduce((n, e) => n + e.presentCount + e.lateCount, 0);
  const completedRate = completedRegistered
    ? `${Math.round((completedAttended / completedRegistered) * 100)}%`
    : "-";

  doc.setProperties({
    title: `PagTipon - Municipal Participation - ${r(municipality)}`,
    subject: "Municipality-scoped event attendance and participation summary",
    author: "PagTipon",
    creator: "PagTipon Municipal Reports",
  });

  function pageHeader() {
    doc.setFillColor(24, 37, 79);
    doc.rect(0, 0, pageWidth, 29, "F");
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 27, pageWidth, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.text("PagTipon", margin, 12.5);
    doc.setFontSize(10);
    doc.text("MUNICIPAL PARTICIPATION REPORT", margin, 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(r(municipality), pageWidth - margin, 18, { align: "right" });
    y = 38;
  }

  function nextPage() {
    doc.addPage();
    pageHeader();
  }

  function ensureSpace(requiredHeight: number) {
    if (y + requiredHeight > bottom) nextPage();
  }

  function sectionHeading(title: string, sub?: string) {
    ensureSpace(sub ? 18 : 13);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(r(title), margin, y);
    y += 6;
    if (sub) {
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(r(sub), contentWidth) as string[];
      for (const line of lines) {
        doc.text(line, margin, y);
        y += 4.5;
      }
    }
    y += 4;
  }

  function wrappedLine(label: string, value: string) {
    const prefix = `${label}: `;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(r(prefix + value), contentWidth) as string[];
    ensureSpace(lines.length * 4.6 + 2);
    for (const line of lines) {
      doc.text(line, margin, y);
      y += 4.6;
    }
  }

  function statCard(x: number, w: number, label: string, value: string, bg: [number, number, number]) {
    doc.setFillColor(...bg);
    doc.roundedRect(x, y, w, 23, 2.6, 2.6, "F");
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(label, x + 4, y + 7);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(value, x + 4, y + 17);
  }

  pageHeader();
  wrappedLine("Municipality", municipality);
  wrappedLine("Generated (PH)", phDate.format(new Date()));
  wrappedLine(
    "Report filters",
    `Event: ${filters.event || "All Events"} | Search: ${filters.search || "Any"} | Status: ${filters.status || "All"} | Category: ${filters.category || "All"} | Event start: ${filters.from || "Any"} to ${filters.to || "Any"}`,
  );
  y += 4;

  sectionHeading("Participation Overview");
  ensureSpace(29);
  const cardGap = 4;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  statCard(margin, cardWidth, "Assigned Events", String(events.length), [238, 242, 255]);
  statCard(margin + (cardWidth + cardGap), cardWidth, "Registered", String(registered), [243, 240, 255]);
  statCard(margin + 2 * (cardWidth + cardGap), cardWidth, "Attended (Present + Late)", String(attended), [236, 253, 245]);
  statCard(margin + 3 * (cardWidth + cardGap), cardWidth, "Completed-Event Rate", completedRate, [255, 247, 237]);
  y += 29;

  sectionHeading("Attendance Status Breakdown");
  ensureSpace(27);
  const boxes = [
    { label: "Present", value: present, color: [236, 253, 245] as [number, number, number] },
    { label: "Late", value: late, color: [255, 251, 235] as [number, number, number] },
    { label: "Absent", value: absent, color: [254, 242, 242] as [number, number, number] },
    { label: "Pending", value: pending, color: [241, 245, 249] as [number, number, number] },
  ];
  boxes.forEach((box, index) => statCard(margin + index * (cardWidth + cardGap), cardWidth, box.label, String(box.value), box.color));
  y += 28;
  wrappedLine("Completed events", String(completed.length));
  wrappedLine("Final attendance calculation", `${completedAttended} attended / ${completedRegistered} registered in completed events (${completedRate}).`);
  wrappedLine("Interpretation", "Present and Late count as attended. Pending does not mean Absent. Final rate is undefined when no completed-event registrations exist.");

  // Chart pages are intentionally separate, keeping all filtered events in
  // the PDF even though the on-screen chart shows only five per page.
  const chartPageSize = 5;
  const peak = Math.max(1, ...events.map((e) => Math.max(e.totalRegistrations, e.presentCount + e.lateCount)));
  for (let offset = 0; offset < events.length; offset += chartPageSize) {
    nextPage();
    sectionHeading(
      "Registered vs Attended by Event",
      `Events ${offset + 1}-${Math.min(offset + chartPageSize, events.length)} of ${events.length}. Same scale on every page; all matching events are included.`,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFillColor(99, 102, 241); doc.rect(margin, y, 4, 3, "F");
    doc.text("Registered", margin + 6, y + 2.8);
    doc.setFillColor(16, 185, 129); doc.rect(margin + 33, y, 4, 3, "F");
    doc.text("Attended (Present + Late)", margin + 39, y + 2.8);
    y += 12;

    for (const event of events.slice(offset, offset + chartPageSize)) {
      ensureSpace(23);
      const titleLines = (doc.splitTextToSize(r(event.eventTitle), 78) as string[]).slice(0, 2);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      titleLines.forEach((line, i) => doc.text(line, margin, y + i * 4));
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(r(event.eventStatus), margin, y + 10);

      const barX = margin + 87;
      const barMaxWidth = contentWidth - 102;
      const regWidth = Math.max(0, (event.totalRegistrations / peak) * barMaxWidth);
      const att = event.presentCount + event.lateCount;
      const attWidth = Math.max(0, (att / peak) * barMaxWidth);
      doc.setFillColor(238, 242, 255); doc.roundedRect(barX, y, barMaxWidth, 4.3, 1.2, 1.2, "F");
      doc.setFillColor(99, 102, 241);
      if (regWidth > 0) doc.roundedRect(barX, y, regWidth, 4.3, 1.2, 1.2, "F");
      doc.setFillColor(236, 253, 245); doc.roundedRect(barX, y + 8, barMaxWidth, 4.3, 1.2, 1.2, "F");
      doc.setFillColor(16, 185, 129);
      if (attWidth > 0) doc.roundedRect(barX, y + 8, attWidth, 4.3, 1.2, 1.2, "F");
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text(String(event.totalRegistrations), barX + barMaxWidth + 4, y + 3.5);
      doc.text(String(att), barX + barMaxWidth + 4, y + 11.5);
      y += 23;
    }
  }

  nextPage();
  sectionHeading("Detailed Event Participation", "Every matching event is included, regardless of on-screen graph or table pagination.");
  const cols = [75, 31, 22, 19, 18, 19, 20, 24, 41];
  const labels = ["Event / Schedule", "Status", "Registered", "Present", "Late", "Absent", "Pending", "Attended", "Final Rate"];
  // Scale to exactly the page's drawable width.
  const totalWidth = cols.reduce((a, b) => a + b, 0);
  const widths = cols.map((width) => (width / totalWidth) * contentWidth);

  function tableHead() {
    ensureSpace(14);
    doc.setFillColor(79, 70, 229);
    doc.rect(margin, y - 4, contentWidth, 11, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    let left = margin;
    labels.forEach((label, index) => {
      const split = doc.splitTextToSize(label, widths[index] - 3) as string[];
      split.slice(0, 2).forEach((part, i) => doc.text(part, left + 1.5, y + i * 3.3));
      left += widths[index];
    });
    y += 12;
  }

  tableHead();
  events.forEach((event, index) => {
    const eventLines = (doc.splitTextToSize(r(event.eventTitle), widths[0] - 4) as string[]).slice(0, 5);
    const dateLines = (doc.splitTextToSize(r(schedule(event.startAt)), widths[0] - 4) as string[]).slice(0, 3);
    const statusLines = doc.splitTextToSize(r(event.eventStatus), widths[1] - 3) as string[];
    const rowHeight = Math.max(13, 3.7 * (eventLines.length + dateLines.length) + 4, 3.7 * statusLines.length + 4);
    if (y + rowHeight > bottom) { nextPage(); tableHead(); }
    if (index % 2 === 0) {
      doc.setFillColor(245, 247, 252);
      doc.rect(margin, y - 4, contentWidth, rowHeight, "F");
    }
    let x = margin;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    const numeric = [
      r(event.eventStatus),
      String(event.totalRegistrations),
      String(event.presentCount),
      String(event.lateCount),
      String(event.absentCount),
      String(event.pendingCount),
      String(event.presentCount + event.lateCount),
      finalRate(event),
    ];
    doc.setFont("helvetica", "bold");
    eventLines.forEach((line, i) => doc.text(line, x + 1.5, y + i * 3.7));
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    dateLines.forEach((line, i) => doc.text(line, x + 1.5, y + (eventLines.length + i) * 3.7));
    x += widths[0];
    doc.setTextColor(30, 41, 59);
    numeric.forEach((value, i) => {
      const texts = doc.splitTextToSize(r(value), widths[i + 1] - 3) as string[];
      texts.forEach((text, j) => doc.text(text, x + 1.5, y + j * 3.7));
      x += widths[i + 1];
    });
    y += rowHeight;
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 17, pageWidth - margin, pageHeight - 17);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Generated by PagTipon | Times in Philippine Standard Time", margin, pageHeight - 10);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  const cleanMunicipality = r(municipality).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "municipal";
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const getPart = (name: string) => dateParts.find((part) => part.type === name)?.value || "00";
  const fileDate = `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
  doc.save(`pagtipon-${cleanMunicipality}-participation-${fileDate}.pdf`);
}
