"use client";

import { useMemo, useState } from "react";
import { Download, Printer, RotateCcw } from "lucide-react";
import styles from "./reports.module.css";
import ReportsHeader from "./components/ReportsHeader";
import useSimpleReports from "./hooks/useSimpleReports";
import {
  buildSimpleReports,
  categoryKey,
  csvText,
  emptyReportFilters,
  reportCategories,
  reportMunicipalities,
  type ReportFilters,
} from "./simpleReportData";

type Tab = "events" | "municipalities" | "participants";
const tabs: { key: Tab; label: string }[] = [
  { key: "events", label: "Event Summary" },
  { key: "municipalities", label: "Municipality Participation" },
  { key: "participants", label: "Participant Attendance" },
];
const control =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const rate = (value: number | null) => (value === null ? "—" : `${value}%`);
function dateTime(value: string | null) {
  return value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "Not scheduled";
}

export default function ProvincialReportsPage() {
  const { data, loading, error, loadedAt, refresh } = useSimpleReports();
  const [tab, setTab] = useState<Tab>("events");
  const [filters, setFilters] = useState<ReportFilters>(emptyReportFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const invalidDates = Boolean(
    filters.from && filters.to && filters.from > filters.to,
  );
  const result = useMemo(
    () =>
      buildSimpleReports(data, filters, tab === "participants", loadedAt || 0),
    [data, filters, tab, loadedAt],
  );
  const update = (key: keyof ReportFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const municipalityOptions = [
    ...new Set([
      ...reportMunicipalities,
      ...data.targets.map((t) => t.municipality),
    ]),
  ].sort();
  const categoryOptions = [
    ...reportCategories,
    ...[
      ...new Set(data.profiles.map((p) => categoryKey(p.participant_category))),
    ]
      .filter((key) => !reportCategories.some(([value]) => value === key))
      .map((key) => [key, key.replaceAll("_", " ")]),
  ];
  const headers =
    tab === "events"
      ? [
          "Event / Schedule",
          "Status",
          "Municipalities",
          "Registered",
          "Attended",
          "Final Rate",
        ]
      : tab === "municipalities"
        ? [
            "Municipality",
            "Assigned Events",
            "Registered",
            "Attended",
            "Final Rate",
          ]
        : [
            "Participant",
            "Municipality",
            "Category",
            "Event",
            "Attendance",
            "Check-in (PH)",
          ];
  const rows: { key: string; cells: string[] }[] =
    tab === "events"
      ? result.eventRows.map((r) => ({
          key: r.id,
          cells: [
            `${r.title}\n${dateTime(r.start)}${r.end ? ` – ${dateTime(r.end)}` : ""}`,
            r.status,
            r.municipalities.join(", ") || "None",
            String(r.registrations),
            String(r.attended),
            rate(r.finalRate),
          ],
        }))
      : tab === "municipalities"
        ? result.municipalityRows.map((r) => ({
            key: r.municipality,
            cells: [
              r.municipality,
              String(r.assignedEvents),
              String(r.registrations),
              String(r.attended),
              rate(r.finalRate),
            ],
          }))
        : result.participants.map((r) => ({
            key: r.id,
            cells: [
              r.name,
              r.municipality,
              r.category,
              r.eventTitle,
              r.status,
              r.checkedInAt ? dateTime(r.checkedInAt) : "—",
            ],
          }));
  const total = loading || error || invalidDates ? 0 : rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const title = tabs.find((t) => t.key === tab)!.label;
  const eventLabel = filters.eventQuery.trim()
    ? `Event title contains: "${filters.eventQuery.trim()}"`
    : "All events";
  const filterDescription = `${eventLabel} · ${filters.municipality === "all" ? "All municipalities" : filters.municipality} · Event start date (PH): ${filters.from || "Any"} to ${filters.to || "Any"}${tab === "participants" ? ` · Participant name: ${filters.participantQuery.trim() || "All"} · Category: ${filters.category === "all" ? "All" : categoryOptions.find(([key]) => key === filters.category)?.[1] || filters.category}` : ""}`;
  const unavailable = loading || Boolean(error) || invalidDates;
  function download() {
    if (unavailable || !rows.length) return;
    const metadata = [
      ["PagTipon Provincial Report", title],
      ["Filters", filterDescription],
      [
        "Data refreshed (PH)",
        dateTime(loadedAt ? new Date(loadedAt).toISOString() : null),
      ],
      [],
      headers,
      ...rows.map((row) => row.cells),
    ];
    const url = URL.createObjectURL(
      new Blob([csvText(metadata)], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `PagTipon-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="min-w-0 space-y-6">
      <div className="print:hidden">
        <ReportsHeader loading={loading} onRefresh={() => void refresh()} />
      </div>
      <section
        aria-label="Report filters"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Filter Reports</h2>
          <button
            type="button"
            className={button}
            onClick={() => {
              setFilters({ ...emptyReportFilters });
              setPage(1);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset Filters
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="min-w-0 text-sm font-medium text-slate-700">
            Search Event
            <input
              aria-label="Search Event"
              type="search"
              autoComplete="off"
              placeholder="Type event title..."
              maxLength={150}
              className={`${control} mt-2`}
              value={filters.eventQuery}
              onChange={(e) => update("eventQuery", e.target.value)}
            />
          </label>
          <label className="min-w-0 text-sm font-medium text-slate-700">
            Municipality
            <select
              aria-label="Municipality"
              className={`${control} mt-2`}
              value={filters.municipality}
              onChange={(e) => update("municipality", e.target.value)}
            >
              <option value="all">All municipalities</option>
              {municipalityOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            From (PH)
            <input
              aria-label="From (PH)"
              className={`${control} mt-2`}
              type="date"
              value={filters.from}
              onChange={(e) => update("from", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            To (PH)
            <input
              aria-label="To (PH)"
              className={`${control} mt-2`}
              type="date"
              value={filters.to}
              onChange={(e) => update("to", e.target.value)}
            />
          </label>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Search matches any part of the event title. Leave it blank for all
          events. Date filters use the event start date in Philippine time.
          Draft events are excluded from all reports.
        </p>
        {invalidDates && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            From date must be on or before To date.
          </p>
        )}
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Unable to load reports: {error}. Use Refresh Reports to try again.
        </p>
      )}
      <div
        role="tablist"
        aria-label="Report type"
        className="flex flex-wrap gap-2 print:hidden"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            id={`tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls="report-panel"
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={`min-h-11 rounded-xl border px-4 py-3 text-sm font-semibold ${tab === t.key ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "participants" && (
        <div className="grid gap-4 sm:grid-cols-2 print:hidden">
          <label className="min-w-0 text-sm font-medium text-slate-700">
            Search Participant
            <input
              type="search"
              aria-label="Search Participant"
              autoComplete="off"
              placeholder="Type participant name..."
              maxLength={200}
              className={`${control} mt-2`}
              value={filters.participantQuery}
              onChange={(e) => update("participantQuery", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Participant Category
            <select
              aria-label="Participant Category"
              className={`${control} mt-2`}
              value={filters.category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="all">All categories</option>
              {categoryOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2 print:hidden">
        <button
          type="button"
          className={button}
          disabled={unavailable || total === 0}
          onClick={download}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </button>
        <button
          type="button"
          className={button}
          disabled={unavailable || total === 0}
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print Report
        </button>
      </div>
      <section
        id="report-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="min-w-0"
      >
        <div id="printable-report" className={`${styles.report} space-y-5`}>
          <div className="hidden border-b border-slate-300 pb-3 print:block">
            <h1 className="text-xl font-bold">PagTipon Provincial Report</h1>
            <p className="mt-1 font-semibold">{title}</p>
            <p className="mt-2 text-xs">{filterDescription}</p>
            <p className="mt-1 text-xs">
              Data refreshed:{" "}
              {loadedAt ? dateTime(new Date(loadedAt).toISOString()) : "—"} ·
              Philippine time
            </p>
          </div>
          <div className="mobile-summary-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Events",
                String(result.summary.events),
                "Matching filters; excludes drafts",
              ],
              [
                "Registrations",
                String(result.summary.registrations),
                "Active registrations; excludes drafts / cancelled events",
              ],
              [
                "Attended",
                String(result.summary.attended),
                "Present + late across selected events",
              ],
              [
                "Final Attendance Rate",
                rate(result.summary.finalRate),
                `${result.summary.completedRegistrations} registrations in completed events`,
              ],
            ].map(([label, value, note]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {unavailable ? "—" : value}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-bold text-slate-900">{title}</h2>
              <p className="mt-1 break-words text-xs leading-5 text-slate-500 print:hidden">
                {filterDescription}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {total} {total === 1 ? "record" : "records"} ·{" "}
                {loadedAt
                  ? `Refreshed ${dateTime(new Date(loadedAt).toISOString())} (PH)`
                  : "Awaiting report data"}
              </p>
            </div>
            {loading ? (
              <p
                role="status"
                className="p-8 text-center text-sm text-slate-500"
              >
                Loading reports…
              </p>
            ) : error || invalidDates ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Report unavailable. Resolve the message above to continue.
              </p>
            ) : total === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                No records match the selected filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm print:min-w-0">
                  <caption className="sr-only">{title}</caption>
                  <thead className="bg-slate-50 text-xs text-slate-600">
                    <tr>
                      {headers.map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-4 py-3 font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, index) => (
                      <tr
                        key={row.key}
                        className={
                          index >= start && index < start + pageSize
                            ? "table-row"
                            : "hidden print:table-row"
                        }
                      >
                        {row.cells.map((cell, i) => (
                          <td
                            key={i}
                            className={`whitespace-pre-line break-words px-4 py-4 align-top ${i === 0 ? "font-medium text-slate-900" : "text-slate-600"}`}
                            style={{
                              overflowWrap: "anywhere",
                              maxWidth: tab === "events" && i === 0 ? 320 : 240,
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm print:hidden">
              <span className="text-slate-500">
                Showing {total ? start + 1 : 0}–
                {Math.min(start + pageSize, total)} of {total}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="report-page-size">
                  Rows per page
                </label>
                <select
                  id="report-page-size"
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-2"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={button}
                  disabled={currentPage <= 1 || unavailable}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className={button}
                  disabled={currentPage >= totalPages || unavailable}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Attended includes Present and Late. Final Rate = attended
            registrations in completed events ÷ active registrations in
            completed events. “—” means no eligible registrations. Before
            completion, unchecked registrations are Pending; after completion,
            they are reported as Absent. Cancelled registrations and
            draft/cancelled events do not contribute to attendance counts. A
            person joining two events counts as two registrations. CSV and print
            include all filtered rows, across all pages.
          </p>
        </div>
      </section>
    </div>
  );
}
