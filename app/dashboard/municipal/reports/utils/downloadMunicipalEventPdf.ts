import type { MunicipalReportEvent, MunicipalReportParticipantRow } from "../types/municipalReports";

function pdfText(value: string | number | null | undefined): string {
  return String(value ?? "-")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/[^\x20-\x7e]/g, "-");
}

function formatPH(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila",
      }).format(date)
    : "-";
}

/** Downloads either one event or a combined report for all listed municipality events. */
export async function downloadMunicipalEventPdf({
  events,
  municipality,
  participants,
}: {
  events: MunicipalReportEvent[];
  municipality: string;
  participants: MunicipalReportParticipantRow[];
}): Promise<void> {
  if (events.length === 0) throw new Error("No events to export.");

  // Existing PagTipon dependency. Imported only on download.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = width - margin * 2;
  let y = 35;

  function pageHeader() {
    doc.setFillColor(25, 45, 96);
    doc.rect(0, 0, width, 27, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("PagTipon | Municipal Attendance Report", margin, 16);
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    y = 35;
  }

  function newPage() {
    doc.addPage();
    pageHeader();
  }

  function space(required: number) {
    if (y + required > height - 18) newPage();
  }

  function line(text: string, indent = 0, fontSize = 9, bold = false) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 41, 59);
    const parts = doc.splitTextToSize(pdfText(text), contentWidth - indent) as string[];
    for (const part of parts) {
      space(6);
      doc.text(part, margin + indent, y);
      y += 5;
    }
  }

  const widths = [10, 72, 25, 28, 64, 70];
  const headings = ["#", "Participant", "Status", "Method", "Time-In (PH)", "Time-Out (PH)"];
  const tableHeader = () => {
    space(13);
    doc.setFillColor(79, 70, 229);
    doc.rect(margin, y - 4, contentWidth, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let left = margin;
    headings.forEach((h, i) => { doc.text(h, left + 2, y + 1); left += widths[i]; });
    y += 10;
  };

  const renderParticipant = (row: MunicipalReportParticipantRow, idx: number) => {
    const cells = [
      String(idx + 1),
      pdfText(row.participantName),
      pdfText(row.attendanceStatus),
      row.method === "qr" ? "QR Scan" : row.method === "manual" ? "Manual" : "-",
      formatPH(row.checkedInAt),
      formatPH(row.checkedOutAt),
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const wrapped = cells.map((v, i) => doc.splitTextToSize(v, widths[i] - 4) as string[]);
    const rowHeight = Math.max(9, Math.max(...wrapped.map((v) => v.length)) * 4 + 4);
    if (y + rowHeight > height - 18) { newPage(); tableHeader(); }
    if (idx % 2 === 0) {
      doc.setFillColor(244, 246, 251);
      doc.rect(margin, y - 4, contentWidth, rowHeight, "F");
    }
    doc.setTextColor(30, 41, 59);
    let left = margin;
    wrapped.forEach((texts, i) => {
      texts.forEach((value, j) => doc.text(value, left + 2, y + j * 4));
      left += widths[i];
    });
    y += rowHeight;
  };

  const byEvent = new Map<string, MunicipalReportParticipantRow[]>();
  for (const event of events) byEvent.set(event.eventMunicipalityId, []);
  for (const participant of participants) {
    byEvent.get(participant.eventMunicipalityId)?.push(participant);
  }

  pageHeader();
  line(`Municipality: ${municipality || "Unknown"}`, 0, 11, true);
  line(`Report scope: ${events.length === 1 ? "Selected Event" : `All ${events.length} Matching Events`}`);
  line(`Generated (PH): ${new Intl.DateTimeFormat("en-PH", {dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila"}).format(new Date())}`);
  y += 4;

  for (let eventIdx = 0; eventIdx < events.length; eventIdx++) {
    const event = events[eventIdx];
    const rows = byEvent.get(event.eventMunicipalityId) ?? [];
    space(37);
    doc.setFillColor(237, 242, 255);
    doc.rect(margin, y - 5, contentWidth, 9, "F");
    line(`${eventIdx + 1}. ${event.eventTitle}`, 2, 10, true);
    line(`Status: ${event.eventStatus}  |  Schedule: ${formatPH(event.startAt)} - ${formatPH(event.endAt)}`);
    const attended = event.presentCount + event.lateCount;
    const finalRate = event.eventStatus === "completed" && event.totalRegistrations > 0
      ? `${Math.round(attended / event.totalRegistrations * 100)}%`
      : "-";
    line(`Registered: ${event.totalRegistrations}  |  Present: ${event.presentCount}  |  Late: ${event.lateCount}  |  Absent: ${event.absentCount}  |  Pending: ${event.pendingCount}  |  Final Attendance Rate: ${finalRate}`);
    y += 3;
    tableHeader();
    if (rows.length === 0) {
      line("No participant attendance records for this event.", 2);
      y += 4;
    } else {
      rows.forEach((row, idx) => renderParticipant(row, idx));
      y += 5;
    }
  }

  // Final page numbers are added after pages have been generated.
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Generated by PagTipon | Times in Philippine Standard Time", margin, height - 8);
    doc.text(`Page ${page} of ${totalPages}`, width - margin, height - 8, {align:"right"});
  }

  const sourceName = events.length === 1 ? events[0].eventTitle : `${municipality}-all-events`;
  const filename = pdfText(sourceName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 58) || "events";
  doc.save(`pagtipon-${filename}-attendance.pdf`);
}
