"use client";

import { BarChart3, Download, FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import SearchableEventSelect from "../../provincial/reports/components/SearchableEventSelect";
import { csvText } from "../../provincial/reports/simpleReportData";
import { exportReportPdf } from "../../provincial/reports/utils/exportReportPdf";
import MunicipalPageHeader from "../../municipal/components/MunicipalPageHeader";

export type EventRow = {
  id: string;
  title: string;
  source: string;
  municipality: string;
  start: string | null;
  end: string | null;
  status: string;
  registered: number;
  present: number;
  late: number;
  absent: number;
  pending: number;
};
export type PersonRow = {
  id: string;
  eventId: string;
  name: string;
  municipality: string;
  category: string;
  status: string;
  timeIn: string | null;
  timeOut: string | null;
  method: string | null;
};
export type ParticipationRow = {
  name: string;
  events: number;
  registered: number;
  attended: number;
  finalRate: number | null;
};
export const formatPH = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const control =
  "min-h-11 min-w-0 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50";
const rate = (e: EventRow) =>
  !e.registered || !["completed", "ongoing"].includes(e.status)
    ? "—"
    : `${Math.round(((e.present + e.late) / e.registered) * 100)}%${e.status === "ongoing" ? " · Live" : ""}`;
const note =
  "Attended = Present + Late. Final attendance rate uses completed events only. A dash means no eligible registrations. Upcoming and ongoing results are not final. Drafts and cancelled events/registrations are excluded. Counts are registrations per event, not unique people.";

export default function ReportWorkspace({
  provincial,
  municipality,
  events,
  people,
  participation,
  loading,
  error,
  updatedAt,
  onRefresh,
  filters,
  filterDescription,
}: {
  provincial: boolean;
  municipality?: string | null;
  events: EventRow[];
  people: PersonRow[];
  participation: ParticipationRow[];
  loading: boolean;
  error?: string | null;
  updatedAt: number | null;
  onRefresh: () => void;
  filters: React.ReactNode;
  filterDescription: string;
}) {
  const [view, setView] = useState("events");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const eventId = parameters.get("eventMunicipalityId");

    if (parameters.get("view") === "attendance" && eventId) {
      setSelected(eventId);
      setView("attendance");
      setPage(1);

      requestAnimationFrame(() => {
        document.getElementById("report-records")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }, []);
  const scope = provincial
    ? "Province of Antique"
    : municipality || "Your municipality";
  const unavailable = loading || Boolean(error);
  const attended = events.reduce((n, e) => n + e.present + e.late, 0);
  const registered = events.reduce((n, e) => n + e.registered, 0);
  const completed = events.filter((e) => e.status === "completed");
  const finalRegistered = completed.reduce((n, e) => n + e.registered, 0);
  const finalAttended = completed.reduce((n, e) => n + e.present + e.late, 0);
  const finalRate = finalRegistered
    ? `${Math.round((finalAttended / finalRegistered) * 100)}%`
    : "—";
  const selectedEvent = events.find((e) => e.id === selected);
  const filteredPeople = selectedEvent
    ? people.filter(
        (p) =>
          p.eventId === selected &&
          (status === "all" ||
            (status === "pending"
              ? p.status === "Awaiting time-in"
              : p.status.toLowerCase() === status)) &&
          p.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : [];
  const eventHeaders = [
    "Event",
    "Source",
    "Municipality",
    "Starts (PH)",
    "Ends (PH)",
    "Status",
    "Registered",
    "Attended",
    "Attendance Rate",
  ];
  const eventCells = events.map((e) => [
    e.title,
    e.source,
    e.municipality,
    formatPH(e.start),
    formatPH(e.end),
    e.status,
    String(e.registered),
    String(e.present + e.late),
    rate(e),
  ]);
  const participationHeaders = [
    "Municipality",
    "Events",
    "Registered",
    "Attended",
    "Final Attendance Rate",
  ];
  const participationCells = participation.map((p) => [
    p.name,
    String(p.events),
    String(p.registered),
    String(p.attended),
    p.finalRate === null ? "—" : `${p.finalRate}%`,
  ]);
  const participantHeaders = [
    "Participant",
    "Municipality",
    "Category",
    "Status",
    "Time-in (PH)",
    "Time-out (PH)",
    "Method",
  ];
  const participantCells = filteredPeople.map((p) => [
    p.name,
    p.municipality,
    p.category,
    p.status,
    formatPH(p.timeIn),
    formatPH(p.timeOut),
    p.method || "—",
  ]);
  const activeHeaders =
    view === "attendance"
      ? participantHeaders
      : view === "municipalities"
        ? participationHeaders
        : eventHeaders;
  const activeCells =
    view === "attendance"
      ? participantCells
      : view === "municipalities"
        ? participationCells
        : eventCells;
  const pages = Math.max(1, Math.ceil(activeCells.length / 10));
  const current = Math.min(page, pages);
  const metrics: [string, string][] = [
    ["Events", String(events.length)],
    ["Registered", String(registered)],
    ["Attended", String(attended)],
    ["Final Attendance Rate", finalRate],
  ];
  async function download(pdf: boolean) {
    if (unavailable || busy || !activeCells.length) return;
    setBusy(true);
    setExportError("");
    const details: [string, string][] = [
      ["Scope", scope],
      ["Filters", filterDescription],
      [
        "Data refreshed (PH)",
        updatedAt ? formatPH(new Date(updatedAt).toISOString()) : "—",
      ],
    ];
    if (view === "attendance")
      details.push(
        ["Selected event", selectedEvent?.title || "—"],
        ["Participant search", query || "All"],
        ["Attendance status", status],
      );
    try {
      const title =
        view === "attendance"
          ? "Participant Attendance"
          : view === "municipalities"
            ? "Municipality Participation"
            : "Event Summary";
      if (pdf)
        await exportReportPdf({
          title: `${scope} — ${title}`,
          details,
          metrics: exportMetrics,
          headers: activeHeaders,
          rows: activeCells,
          filename: `PagTipon-${provincial ? "provincial" : "municipal"}-${view}.pdf`,
          note: exportNote,
        });
      else {
        const url = URL.createObjectURL(
          new Blob(
            [
              csvText([
                ["PagTipon", title],
                ...details,
                [],
                ...exportMetrics,
                [],
                [exportNote],
                [],
                activeHeaders,
                ...activeCells,
              ]),
            ],
            { type: "text/csv;charset=utf-8;" },
          ),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `PagTipon-${provincial ? "provincial" : "municipal"}-${view}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setExportError("Unable to generate the report. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Attendance exports summarize the selected event.
  // Name/status filters apply only to the participant list.
  const exportEvents =
    view === "attendance" ? (selectedEvent ? [selectedEvent] : []) : events;

  const exportRegistered = exportEvents.reduce(
    (total, event) => total + event.registered,
    0,
  );

  const exportAttended = exportEvents.reduce(
    (total, event) => total + event.present + event.late,
    0,
  );

  const exportCompleted = exportEvents.filter(
    (event) => event.status === "completed",
  );

  const exportCompletedRegistered = exportCompleted.reduce(
    (total, event) => total + event.registered,
    0,
  );

  const exportCompletedAttended = exportCompleted.reduce(
    (total, event) => total + event.present + event.late,
    0,
  );

  const exportFinalRate =
    exportCompletedRegistered > 0
      ? `${Math.round(
          (exportCompletedAttended / exportCompletedRegistered) * 100,
        )}%`
      : "—";

  const exportMetrics: [string, string][] = [
    ["Events", String(exportEvents.length)],
    ["Registered", String(exportRegistered)],
    ["Attended", String(exportAttended)],
    ["Final Attendance Rate", exportFinalRate],
  ];

  if (view === "attendance") {
    exportMetrics.push([
      "Matching participant records",
      String(filteredPeople.length),
    ]);
  }

  const exportNote =
    view === "attendance"
      ? `${note} Summary totals cover the selected event within the report filters. Participant name and attendance-status filters apply only to the list below. Final rate denominator: ${exportCompletedAttended}/${exportCompletedRegistered} completed-event registrations.`
      : note;

  const max = Math.max(
    1,
    ...(provincial
      ? participation.map((p) => p.registered)
      : events.map((e) => e.registered)),
  );
  const bars = provincial
    ? participation.map((p) => ({
        name: p.name,
        registered: p.registered,
        attended: p.attended,
      }))
    : events.map((e) => ({
        name: e.title,
        registered: e.registered,
        attended: e.present + e.late,
      }));
  return (
    <div className="min-w-0 space-y-5 pb-8">
      {provincial ? (
        <header className="rounded-2xl bg-slate-900 p-5 text-white sm:p-7">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">
            {scope}
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Provincial Reports
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Review events, registrations and attendance. Choose an event to see
            participant records.
          </p>
        </header>
      ) : (
        <MunicipalPageHeader
          icon={<BarChart3 className="h-6 w-6" />}
          title="Municipal Reports"
          description="Review events, registrations and attendance. Choose an event to see participant records."
          footer={
            <span>
              Municipality: <strong className="text-slate-900">{scope}</strong>
            </span>
          }
        />
      )}
      <details className="relative z-20 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-bold text-slate-900">
          Report filters{" "}
          <span className="ml-2 font-normal text-slate-500">Tap to change</span>
        </summary>
        <div className="mt-4">{filters}</div>
      </details>
      <p className="break-words text-xs leading-5 text-slate-600">
        {filterDescription}
      </p>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error} Automatic updates will retry when connected.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article
            key={label}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {unavailable ? "—" : value}
            </p>
            {label === "Final Attendance Rate" && (
              <p className="mt-2 text-xs text-slate-500">
                {unavailable
                  ? "Data unavailable"
                  : `${finalAttended}/${finalRegistered} in completed events`}
              </p>
            )}
          </article>
        ))}
      </div>
      <p className="text-xs leading-5 text-slate-500">{note}</p>
      <p role="status" className="text-xs text-slate-500">
        {loading
          ? "Loading reports…"
          : `Last refreshed: ${updatedAt ? formatPH(new Date(updatedAt).toISOString()) : "—"} (PH)`}
      </p>
      {!unavailable && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="font-bold text-slate-900">
            {provincial
              ? "Participation by Municipality"
              : "Attendance per Event"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {provincial
              ? "All 18 municipalities appear when no municipality filter is applied."
              : "Registered and attended counts for the selected events."}
          </p>
          <div className="mt-3 flex gap-4 text-xs">
            <span className="text-indigo-700">■ Registered</span>
            <span className="text-emerald-700">
              ■ Attended (Present + Late)
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {bars.map((b, i) => (
              <div key={`${b.name}-${i}`}>
                <div className="mb-1 flex flex-wrap justify-between gap-1 text-xs">
                  <span className="break-words font-medium text-slate-700">
                    {b.name}
                  </span>
                  <span>
                    {b.registered} registered · {b.attended} attended
                  </span>
                </div>
                <div aria-hidden="true" className="space-y-1">
                  <div className="h-2 rounded bg-slate-100">
                    <div
                      className="h-2 rounded bg-indigo-500"
                      style={{ width: `${(b.registered / max) * 100}%` }}
                    />
                  </div>
                  <div className="h-2 rounded bg-slate-100">
                    <div
                      className="h-2 rounded bg-emerald-500"
                      style={{ width: `${(b.attended / max) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {!bars.length && (
              <p className="text-sm text-slate-500">
                No events match these filters.
              </p>
            )}
          </div>
        </section>
      )}
      {!provincial && !unavailable && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="font-bold text-slate-900">
            Participation by Category
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Registration counts per event; participants may appear in more than
            one event.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[...new Set(people.map((p) => p.category))]
              .sort()
              .map((category) => {
                const rows = people.filter((p) => p.category === category);
                return (
                  <div key={category} className="rounded-xl bg-slate-50 p-3">
                    <p className="break-words text-sm font-semibold">
                      {category}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                      {rows.length} registered ·{" "}
                      {
                        rows.filter((p) =>
                          ["present", "late"].includes(p.status.toLowerCase()),
                        ).length
                      }{" "}
                      attended
                    </p>
                  </div>
                );
              })}
            {!people.length && (
              <p className="text-sm text-slate-500">
                No registered participants.
              </p>
            )}
          </div>
        </section>
      )}
      <section
        id="report-records"
        className="scroll-mt-24 overflow-visible rounded-2xl border border-slate-200 bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex flex-wrap gap-2">
            {[
              ["events", "Event Summary"],
              ...(provincial ? [["municipalities", "Municipalities"]] : []),
              ["attendance", "Attendance Details"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setView(id);
                  setPage(1);
                }}
                aria-pressed={view === id}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  view === id
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                {view === id && <span aria-hidden="true">✓</span>}
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              disabled={unavailable || busy || !activeCells.length}
              onClick={() => void download(false)}
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              className={button}
              disabled={unavailable || busy || !activeCells.length}
              onClick={() => void download(true)}
            >
              <FileDown className="h-4 w-4" />
              {busy ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        </div>
        {exportError && (
          <p role="alert" className="p-4 text-sm text-red-700">
            {exportError}
          </p>
        )}
        {view === "attendance" && (
          <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-3">
            <div className="relative z-30 min-w-0">
              <SearchableEventSelect
                events={events.map((event) => ({
                  id: event.id,
                  title: `${event.title} · ${event.source}`,
                  start_at: event.start,
                  status: event.status,
                }))}
                value={selectedEvent ? selected : "all"}
                onChange={(eventId) => {
                  setSelected(eventId === "all" ? "" : eventId);
                  setPage(1);
                }}
              />
            </div>
            <label className="text-xs font-semibold">
              Participant name
              <input
                type="search"
                className={`${control} mt-2`}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="text-xs font-semibold">
              Attendance status
              <select
                className={`${control} mt-2`}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {["all", "present", "late", "absent", "pending"].map((s) => (
                  <option key={s} value={s}>
                    {s === "pending" ? "Awaiting time-in" : s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {unavailable ? (
          <p className="p-6 text-sm text-slate-500">
            {loading ? "Loading reports…" : "Report data unavailable."}
          </p>
        ) : !activeCells.length ? (
          <p className="p-6 text-sm text-slate-500">
            {view === "attendance" && !selectedEvent
              ? "Select an event to view its participant attendance."
              : "No matching records."}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {activeHeaders.map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                    {view === "events" && (
                      <th className="px-4 py-3 text-xs">Details</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeCells
                    .slice((current - 1) * 10, current * 10)
                    .map((cells, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {cells.map((cell, j) => (
                          <td key={j} className="px-4 py-3 align-top">
                            {cell}
                          </td>
                        ))}
                        {view === "events" && (
                          <td className="px-4 py-3">
                            <button
                              className="text-sm font-semibold text-indigo-700"
                              onClick={() => {
                                setSelected(events[(current - 1) * 10 + i].id);
                                setView("attendance");
                                setPage(1);
                              }}
                            >
                              View Attendance
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-200 md:hidden">
              {activeCells
                .slice((current - 1) * 10, current * 10)
                .map((cells, i) => (
                  <article key={i} className="p-4">
                    <h3 className="break-words font-bold text-slate-900">
                      {cells[0]}
                    </h3>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      {cells.slice(1).map((cell, j) => (
                        <div key={j} className="min-w-0">
                          <dt className="text-xs text-slate-500">
                            {activeHeaders[j + 1]}
                          </dt>
                          <dd className="mt-1 break-words text-sm text-slate-800">
                            {cell}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {view === "events" && (
                      <button
                        className={`${button} mt-4 w-full`}
                        onClick={() => {
                          setSelected(events[(current - 1) * 10 + i].id);
                          setView("attendance");
                          setPage(1);
                        }}
                      >
                        View Attendance
                      </button>
                    )}
                  </article>
                ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-xs">
              <span>
                Showing {(current - 1) * 10 + 1}–
                {Math.min(current * 10, activeCells.length)} of{" "}
                {activeCells.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className={button}
                  disabled={current === 1}
                  onClick={() => setPage(current - 1)}
                >
                  Previous
                </button>
                <span>
                  {current}/{pages}
                </span>
                <button
                  className={button}
                  disabled={current === pages}
                  onClick={() => setPage(current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
