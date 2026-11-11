"use client";

import type { ParticipantReportRow } from "../simpleReportData";

const phDateTime = (value: string | null) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    }).format(new Date(value))
  : "—";

export default function EventAttendanceTable({
  rows,
  search,
  status,
  onSearch,
  onStatus,
}: {
  rows: ParticipantReportRow[];
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
}) {
  const query = search.trim().toLowerCase();
  const filtered = rows.filter((row) =>
    (!query || `${row.name} ${row.municipality} ${row.category}`.toLowerCase().includes(query)) &&
    (status === "all" || row.status.toLowerCase() === status),
  );
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-4 py-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Participant Attendance Records</h3>
          <p className="mt-1 text-xs text-slate-500">{filtered.length} of {rows.length} registered participant records</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="text-xs font-medium text-slate-600">Search participant
            <input type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Name or municipality" className="mt-1 block min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm" />
          </label>
          <label className="text-xs font-medium text-slate-600">Attendance status
            <select value={status} onChange={(e) => onStatus(e.target.value)} className="mt-1 block min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm">
              <option value="all">All statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="pending">Pending</option>
              <option value="absent">Absent</option>
            </select>
          </label>
        </div>
      </div>
      <div className="max-h-[370px] overflow-auto">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
            <tr>
              { ["Participant", "Municipality", "Category", "Attendance", "Time-In (PH)", "Time-Out (PH)", "Method"].map((header) => (
                <th key={header} scope="col" className="px-3 py-3 font-semibold">{header}</th>
              )) }
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-3 py-3 font-semibold text-slate-900">{row.name}</td>
                <td className="px-3 py-3 text-slate-600">{row.municipality}</td>
                <td className="px-3 py-3 text-slate-600">{row.category}</td>
                <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 font-semibold ${row.status === "Present" ? "bg-emerald-100 text-emerald-800" : row.status === "Late" ? "bg-amber-100 text-amber-800" : row.status === "Absent" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>{row.status}</span></td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{phDateTime(row.checkedInAt)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{phDateTime(row.checkedOutAt)}</td>
                <td className="px-3 py-3 text-slate-600">{row.method === "qr" ? "QR Scan" : row.method === "manual" ? "Manual" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No participants match these filters.</p>}
      </div>
      <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">Attendance records follow the current event and municipality report filters. Time-Out is independent of Present/Late status.</p>
    </div>
  );
}
