"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, CalendarRange, ChevronLeft, ChevronRight, Clock3, QrCode, UsersRound } from "lucide-react";
import type { MunicipalParticipantCategoryBreakdownItem, MunicipalReportEvent, MunicipalReportParticipantRow } from "../types/municipalReports";

type Props = {
  events: MunicipalReportEvent[];
  participants: MunicipalReportParticipantRow[];
  categoryBreakdown?: MunicipalParticipantCategoryBreakdownItem[];
};

function niceMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function eventMonth(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const components = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit",
  }).formatToParts(date);
  return `${components.find((x) => x.type === "year")?.value}-${components.find((x) => x.type === "month")?.value}`;
}

function GroupedBars({
  items, labelA, labelB, empty = "No matching records yet.", maxValue,
}: {
  items: { label: string; a: number; b: number }[];
  labelA: string;
  labelB: string;
  empty?: string;
  maxValue?: number;
}) {
  const peak = Math.max(1, maxValue ?? 0, ...items.map((x) => Math.max(x.a, x.b)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded bg-indigo-500" />{labelA}</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded bg-emerald-500" />{labelB}</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">{empty}</div>
      ) : items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="grid gap-2 sm:grid-cols-[minmax(140px,220px)_1fr] sm:items-center">
          <p className="min-w-0 break-words text-sm font-medium text-slate-700" title={item.label}>{item.label}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-indigo-50"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, (item.a / peak) * 100)}%` }} /></div>
              <span className="w-7 text-right text-xs font-semibold tabular-nums text-indigo-700">{item.a}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-emerald-50"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (item.b / peak) * 100)}%` }} /></div>
              <span className="w-7 text-right text-xs font-semibold tabular-nums text-emerald-700">{item.b}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const GRAPH_PAGE_SIZE = 5;

/** Separate from the Event Performance detailed table's pagination. */
function PaginatedGroupedBars({
  items,
  labelA,
  labelB,
}: {
  items: { label: string; a: number; b: number }[];
  labelA: string;
  labelB: string;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / GRAPH_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  useEffect(() => {
    setPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);
  const firstIndex = (currentPage - 1) * GRAPH_PAGE_SIZE;
  const visibleItems = items.slice(firstIndex, firstIndex + GRAPH_PAGE_SIZE);
  // Keep the bar scale consistent across graph pages.
  const maxValue = Math.max(1, ...items.map((item) => Math.max(item.a, item.b)));

  return (
    <div className="space-y-5">
      <GroupedBars
        items={visibleItems}
        labelA={labelA}
        labelB={labelB}
        maxValue={maxValue}
        empty="No matching events to display."
      />
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-500" aria-live="polite">
            Showing {firstIndex + 1}–{Math.min(firstIndex + GRAPH_PAGE_SIZE, items.length)} of {items.length} events
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartPanel({ title, description, children, icon: Icon }: {
  title: string; description: string; children: ReactNode;
  icon: typeof Activity;
}) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5" /></span>
      <div><h2 className="text-base font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div>
    </div>
    {children}
  </section>;
}

export function MunicipalParticipationCharts({ events }: Pick<Props, "events">) {
  const eventBars = useMemo(() => [...events].sort((a,b) => b.totalRegistrations - a.totalRegistrations).map((e) => ({
    label: e.eventTitle,
    a: e.totalRegistrations,
    b: e.presentCount + e.lateCount,
  })), [events]);
  return <ChartPanel icon={UsersRound} title="Registered vs Attended by Event" description="Participation within your municipality. Present and Late both count as attended; upcoming events can still have pending attendance.">
    <PaginatedGroupedBars items={eventBars} labelA="Registered" labelB="Attended" />
  </ChartPanel>;
}

export function MunicipalEventCharts({ events }: Pick<Props, "events">) {
  const rows = useMemo(() => [...events].sort((a,b) => b.totalRegistrations - a.totalRegistrations).map((e) => ({
    label: e.eventTitle,
    a: e.totalRegistrations,
    b: e.presentCount + e.lateCount,
  })), [events]);
  return <ChartPanel icon={Activity} title="Event Performance Comparison" description="Registered vs actual attendees per assigned event. The completed-event attendance rate is final only after an event ends.">
    <PaginatedGroupedBars items={rows} labelA="Registered" labelB="Attended" />
  </ChartPanel>;
}

export function MunicipalEngagementCharts({ events, participants, categoryBreakdown = [] }: Props) {
  const monthRows = useMemo(() => {
    const map = new Map<string, { a: number; b: number }>();
    for (const e of events) {
      const m = eventMonth(e.startAt);
      if (!m) continue;
      const next = map.get(m) ?? { a: 0, b: 0 };
      next.a += e.totalRegistrations;
      next.b += e.presentCount + e.lateCount;
      map.set(m, next);
    }
    return [...map.entries()].sort(([a],[b]) => a.localeCompare(b)).slice(-12).map(([m, v]) => ({ label: niceMonth(m), ...v }));
  }, [events]);
  const categoryRows = useMemo(() => categoryBreakdown.map((item) => ({
    label: item.label,
    a: item.count,
    b: participants.filter((p) => p.category === item.value && (p.attendanceStatus === "present" || p.attendanceStatus === "late")).length,
  })), [categoryBreakdown, participants]);
  const methods = useMemo(() => {
    const checkedIn = participants.filter((r) => r.attendanceStatus === "present" || r.attendanceStatus === "late");
    const qr = checkedIn.filter((r) => r.method === "qr").length;
    const manual = checkedIn.filter((r) => r.method === "manual").length;
    return { qr, manual, total: qr + manual };
  }, [participants]);
  const hourly = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of participants) {
      if (!p.checkedInAt) continue;
      const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Manila" }).formatToParts(new Date(p.checkedInAt));
      const h = Number(parts.find((x) => x.type === "hour")?.value);
      if (!Number.isFinite(h)) continue;
      map.set(h, (map.get(h) ?? 0) + 1);
    }
    return [...map.entries()].sort(([a],[b]) => a - b).map(([hour, count]) => ({ hour, count }));
  }, [participants]);
  const peak = Math.max(1, ...hourly.map((x) => x.count));
  return <div className="grid gap-5 lg:grid-cols-2">
    <div className="lg:col-span-2"><ChartPanel icon={UsersRound} title="Category Participation" description="Registered vs attended by participant category for the selected municipal events.">
      <GroupedBars items={categoryRows} labelA="Registered" labelB="Attended" />
    </ChartPanel></div>
    <ChartPanel icon={CalendarRange} title="Monthly Engagement Trend" description="Registrations and attendance grouped by event start month (Philippine time).">
      <GroupedBars items={monthRows} labelA="Registered" labelB="Attended" />
    </ChartPanel>
    <ChartPanel icon={QrCode} title="QR vs Manual Check-In" description="Recorded methods among confirmed attendees only.">
      {methods.total === 0 ? <p className="text-sm text-slate-500">No recorded check-ins yet.</p> : <div className="space-y-5">
        {[{ label: "QR Scan", count: methods.qr, color: "bg-indigo-500" }, { label: "Manual Entry", count: methods.manual, color: "bg-emerald-500" }].map((x) => (
          <div key={x.label}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{x.label}</span><span className="font-bold text-slate-900">{x.count} · {Math.round(x.count / methods.total * 100)}%</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${x.color}`} style={{width: `${x.count/methods.total*100}%`}} /></div>
          </div>
        ))}
      </div>}
    </ChartPanel>
    <div className="lg:col-span-2"><ChartPanel icon={Clock3} title="Check-In Time Patterns" description="When participants were checked in, grouped by Philippine local hour. This shows check-in volume, not whether they were marked Late.">
      {hourly.length === 0 ? <p className="text-sm text-slate-500">No recorded check-in times yet.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hourly.map((x) => <div key={x.hour} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">{new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: true, timeZone: "UTC" }).format(new Date(Date.UTC(2020, 0, 1, x.hour)))} – next hour</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${x.count / peak * 100}%` }} /></div>
          <p className="mt-2 text-lg font-bold text-slate-900">{x.count}</p>
        </div>)}
      </div>}
    </ChartPanel></div>
  </div>;
}
