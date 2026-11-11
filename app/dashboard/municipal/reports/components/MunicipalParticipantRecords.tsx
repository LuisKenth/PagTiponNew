"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileDown, Search, Users, X } from "lucide-react";
import type { MunicipalReportEvent, MunicipalReportParticipantRow } from "../types/municipalReports";
import { downloadMunicipalEventPdf } from "../utils/downloadMunicipalEventPdf";
import MunicipalSearchableEventSelect from "./MunicipalSearchableEventSelect";

type Props = {
  events: MunicipalReportEvent[];
  participants: MunicipalReportParticipantRow[];
  municipality: string;
  loading: boolean;
};
const formatPH = (iso: string | null) => {
  if (!iso) return "—";
  const dt = new Date(iso);
  return Number.isFinite(dt.getTime()) ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(dt) : "—";
};
const csvValue = (v: string) => `"${v.replace(/"/g, '""')}"`;

export default function MunicipalParticipantRecords({ events, participants, municipality, loading }: Props) {
  const [eventId, setEventId] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const effectiveEventId = events.some((e) => e.eventMunicipalityId === eventId) ? eventId : "all";
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return participants.filter((r) =>
      (effectiveEventId === "all" || r.eventMunicipalityId === effectiveEventId) &&
      (status === "all" || r.attendanceStatus === status) &&
      (!q || r.participantName.toLowerCase().includes(q) || r.eventTitle.toLowerCase().includes(q))
    );
  }, [participants, effectiveEventId, search, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const visible = filtered.slice((Math.min(page, pages) - 1) * 10, Math.min(page, pages) * 10);
  const selectedEvent = events.find((e) => e.eventMunicipalityId === effectiveEventId);
  const resetPage = () => setPage(1);

  const downloadCsv = () => {
    const rows = [
      ["Participant", "Event", "Municipality", "Category", "Attendance", "Check-in method", "Time-in (PH)", "Time-out (PH)"],
      ...filtered.map((r) => [r.participantName, r.eventTitle, municipality, r.categoryLabel, r.attendanceStatus, r.method ?? "", formatPH(r.checkedInAt), formatPH(r.checkedOutAt)]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map((x) => csvValue(String(x))).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8;"}));
    const a = document.createElement("a"); a.href = url; a.download = "pagtipon-municipal-participant-attendance.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadPdf = async () => {
    if (pdfBusy || loading || events.length === 0) return;
    setPdfError("");
    setPdfBusy(true);
    try {
      // With All Events selected, generate a combined report. One event = single-event report.
      const selectedEvents = selectedEvent ? [selectedEvent] : events;
      const allowedIds = new Set(selectedEvents.map((e) => e.eventMunicipalityId));
      await downloadMunicipalEventPdf({
        events: selectedEvents,
        municipality,
        participants: participants.filter((r) => allowedIds.has(r.eventMunicipalityId)),
      });
    } catch (error) {
      console.error("Municipal PDF export failed:", error);
      setPdfError(error instanceof Error ? error.message : "Unable to generate PDF. Please try again.");
    } finally { setPdfBusy(false); }
  };

  return <section id="municipal-participant-records" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Users className="h-5 w-5"/></span>
          <div><h2 className="text-lg font-bold text-slate-900">Participant Attendance — Detailed Records</h2>
            <p className="mt-1 text-sm text-slate-500">Search names and see each participant’s status, Time-In, Time-Out, and method for your municipality.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadCsv} disabled={loading || filtered.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download className="h-4 w-4"/>Export CSV</button>
          <button type="button" onClick={() => void downloadPdf()} disabled={loading || events.length === 0 || pdfBusy} title={selectedEvent ? "Download this event’s complete attendance" : "Download a combined PDF for all listed events"} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><FileDown className="h-4 w-4"/>{pdfBusy ? "Creating PDF..." : selectedEvent ? "Download Event PDF" : "Download PDF"}</button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5"><span className="block text-xs font-bold uppercase tracking-wide text-slate-500">Event</span>
          <MunicipalSearchableEventSelect events={events} value={effectiveEventId} onChange={(id) => { setEventId(id); resetPage(); setPdfError(""); }} />
        </div>
        <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Search participant</span>
          <span className="relative block"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input value={search} onChange={(e) => {setSearch(e.target.value); resetPage();}} placeholder="Type participant name..." className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-9 text-sm"/>
            {search && <button type="button" onClick={() => {setSearch("");resetPage();}} title="Clear name search" className="absolute right-3 top-3 text-slate-400"><X className="h-4 w-4"/></button>}</span>
        </label>
        <label className="space-y-1.5"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Attendance status</span>
          <select value={status} onChange={(e) => {setStatus(e.target.value);resetPage();}} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"><option value="all">All statuses</option>{["present","late","absent","pending"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select>
        </label>
      </div>
      <p aria-live="polite" className="mt-3 text-xs text-slate-500">{filtered.length} matching attendance records. Participant search and attendance status filter this table and CSV only; summary metrics above use the main report filters. PDF includes all attendee records for the selected event, or a combined report for All Events in the current main report filters.</p>
      {pdfError && <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">PDF download failed: {pdfError}</div>}
    </div>
    <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr>{["Participant", "Event", "Category", "Status", "Time-In (PH)", "Time-Out (PH)", "Method", "Attendance"].map((x) => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{visible.map((r, i) => <tr key={`${r.eventMunicipalityId}-${r.rsvpId || i}`} className="text-slate-700 hover:bg-slate-50">
        <td className="px-4 py-3 font-semibold text-slate-900">{r.participantName}</td><td className="px-4 py-3">{r.eventTitle}</td><td className="px-4 py-3">{r.categoryLabel}</td>
        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${r.attendanceStatus === "present" ? "bg-emerald-50 text-emerald-700" : r.attendanceStatus === "late" ? "bg-amber-50 text-amber-700" : r.attendanceStatus === "absent" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{r.attendanceStatus}</span></td>
        <td className="px-4 py-3">{formatPH(r.checkedInAt)}</td><td className="px-4 py-3">{formatPH(r.checkedOutAt)}</td><td className="px-4 py-3">{r.method === "qr" ? "QR Scan" : r.method === "manual" ? "Manual" : "—"}</td>
        <td className="px-4 py-3"><Link className="font-semibold text-indigo-600 hover:underline" href={`/dashboard/municipal/attendance/${encodeURIComponent(r.eventMunicipalityId)}`}>View</Link></td>
      </tr>)}</tbody></table></div>
    {!loading && filtered.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No participant attendance records match the filters.</p>}
    {filtered.length > 10 && <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm text-slate-600"><span>Showing {(Math.min(page,pages)-1)*10+1}–{Math.min(Math.min(page,pages)*10, filtered.length)} of {filtered.length}</span>
      <div className="flex items-center gap-3"><button type="button" disabled={page <= 1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Previous</button><span>{Math.min(page,pages)}/{pages}</span><button type="button" disabled={page >= pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Next</button></div>
    </div>}
  </section>;
}
