"use client";
import BackgroundDataSync from "@/app/components/live/BackgroundDataSync";
import ProvincialPageHeader from "@/app/dashboard/provincial/components/ProvincialPageHeader";

import { MUNICIPALITIES } from "@/lib/municipalities";
import {
  Activity,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  LayoutDashboard,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  dashboardMetrics,
  eventDate,
  eventStatus,
  monthlyCreated,
} from "./dashboardMetrics";
import { useProvincialDashboard } from "./hooks/useProvincialDashboard";

const statuses = [
  {
    key: "upcoming",
    label: "Upcoming",
    color: "#6366f1",
    badge: "bg-indigo-50 text-indigo-700",
  },
  {
    key: "ongoing",
    label: "Ongoing",
    color: "#10b981",
    badge: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "completed",
    label: "Completed",
    color: "#94a3b8",
    badge: "bg-slate-100 text-slate-600",
  },
  {
    key: "draft",
    label: "Draft",
    color: "#f59e0b",
    badge: "bg-amber-50 text-amber-700",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    color: "#f87171",
    badge: "bg-red-50 text-red-700",
  },
] as const;
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const card =
  "min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const linkStyle =
  "inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800";
function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={card}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm leading-6 text-slate-500">
      <CalendarDays
        aria-hidden="true"
        className="mb-3 h-8 w-8 text-slate-300"
      />
      {children}
    </div>
  );
}
function dateLabel(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      }).format(new Date(value))
    : "Schedule not set";
}
export default function ProvincialDashboardPage() {
  const {
    profile,
    events,
    eventMunicipalities,
    rsvps,
    attendance,
    loading,
    message,
    reload,
  } = useProvincialDashboard();
  const [now, setNow] = useState<Date | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);
  const currentYear = now
    ? Number(
        new Intl.DateTimeFormat("en", {
          year: "numeric",
          timeZone: "Asia/Manila",
        }).format(now),
      )
    : null;
  const selectedYear = year ?? currentYear;
  const years = Array.from(
    new Set([
      ...(currentYear ? [currentYear] : []),
      ...events.flatMap((event) =>
        event.created_at && Number.isFinite(Date.parse(event.created_at))
          ? [
              Number(
                new Intl.DateTimeFormat("en", {
                  year: "numeric",
                  timeZone: "Asia/Manila",
                }).format(new Date(event.created_at)),
              ),
            ]
          : [],
      ),
    ]),
  ).sort((a, b) => b - a);
  const data = dashboardMetrics(
    events,
    eventMunicipalities,
    rsvps,
    attendance,
    now ?? new Date(0),
  );
  const bars = selectedYear
    ? monthlyCreated(events, selectedYear)
    : Array<number>(12).fill(0);
  const chartTotal = bars.reduce((a, b) => a + b, 0),
    max = Math.max(1, ...bars);
  const busy = loading || !now;
  const upcoming = now
    ? events
        .filter((event) =>
          ["upcoming", "ongoing"].includes(eventStatus(event, now)),
        )
        .sort(
          (a, b) =>
            (Date.parse(eventDate(a) ?? "") || Infinity) -
            (Date.parse(eventDate(b) ?? "") || Infinity),
        )
        .slice(0, 5)
    : [];
  let cumulative = 0;
  const gradient = events.length
    ? `conic-gradient(${statuses
        .map((status) => {
          const from = cumulative;
          cumulative += (data.counts[status.key] / events.length) * 100;
          return `${status.color} ${from}% ${cumulative}%`;
        })
        .join(",")})`
    : "#e2e8f0";
  const summary = [
    {
      label: "Total Events",
      value: events.length,
      note: "All events you created",
      icon: CalendarDays,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Upcoming Events",
      value: data.counts.upcoming,
      note: `${data.counts.ongoing} ongoing events`,
      icon: Clock3,
      color: "bg-sky-50 text-sky-600",
    },
    {
      label: "Registrations",
      value: data.registered,
      note: "Across your events · excludes cancelled",
      icon: Users,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Attendance Rate",
      value: `${data.rate}%`,
      note: `${data.checkedIn} checked in · includes late`,
      icon: ClipboardCheck,
      color: "bg-violet-50 text-violet-600",
    },
  ];
  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError("");
    try {
      await reload(true);
    } catch {
      setRefreshError("Unable to refresh. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }
  const pending = data.activeAssignments.length - data.ready;
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-8 sm:space-y-6">
      <ProvincialPageHeader
        icon={<LayoutDashboard className="h-5 w-5" aria-hidden="true" />}
        eyebrow="Provincial Overview"
        title="Provincial Dashboard"
        description={
          <>
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}.
            Monitor your events and municipal preparations.
          </>
        }
        actions={
          <div className="grid shrink-0 grid-cols-2 gap-3 sm:flex">
            <BackgroundDataSync
              onUpdate={() => refresh()}
              disabled={busy || refreshing}
            />

            <Link
              href="/dashboard/provincial/events/create"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
              Create Event
            </Link>
          </div>
        }
        footer={
          <>
            {" "}
            {now && (
              <p
                className="flex items-center gap-2 text-xs"
                style={{ color: "#CBD5E1" }}
              >
                <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />

                {new Intl.DateTimeFormat("en-PH", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "Asia/Manila",
                }).format(now)}
              </p>
            )}
          </>
        }
      />
      {(message || refreshError) && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {message || refreshError}
        </p>
      )}
      <section
        aria-label="Dashboard summary"
        className="mobile-summary-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {summary.map(({ label, value, note, icon: Icon, color }) => (
          <div key={label} className={card}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {busy ? (
                <span
                  aria-label="Loading"
                  className="block h-9 w-20 animate-pulse rounded bg-slate-100"
                />
              ) : (
                value
              )}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
          </div>
        ))}
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] sm:gap-6">
        <Panel
          title="Event Activity"
          subtitle="Events created each month · Philippine time"
          action={
            <label className="text-xs text-slate-500">
              <span className="sr-only">Chart year</span>
              <select
                aria-label="Chart year"
                disabled={busy}
                value={selectedYear ?? ""}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
          }
        >
          {busy ? (
            <div
              aria-label="Loading chart"
              className="h-56 animate-pulse rounded-xl bg-slate-50"
            />
          ) : (
            <>
              <div className="mb-5 flex items-baseline gap-2">
                <strong className="text-2xl text-slate-900">
                  {chartTotal}
                </strong>
                <span className="text-xs text-slate-500">
                  events in {selectedYear}
                </span>
              </div>
              <figure aria-label={`Monthly events created in ${selectedYear}`}>
                <div className="flex h-40 items-end gap-1 border-b border-slate-200 sm:gap-3">
                  {bars.map((count, index) => (
                    <div
                      key={months[index]}
                      className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                      title={`${months[index]}: ${count} events`}
                    >
                      <span className="text-[10px] font-medium text-slate-600">
                        {count}
                      </span>
                      <div
                        aria-hidden="true"
                        className={`w-full max-w-8 rounded-t-md ${count ? "bg-indigo-500 group-hover:bg-indigo-600" : "bg-slate-100"}`}
                        style={{
                          height: count ? `${(count / max) * 78}%` : "3px",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <figcaption className="mt-2 flex gap-1 sm:gap-3">
                  {months.map((month) => (
                    <span
                      key={month}
                      className="min-w-0 flex-1 text-center text-[9px] text-slate-400 sm:text-[10px]"
                    >
                      {month}
                    </span>
                  ))}
                </figcaption>
              </figure>
              {chartTotal === 0 && (
                <p className="mt-4 text-xs text-slate-500">
                  No events created in this year yet. Create an event to start
                  tracking activity.
                </p>
              )}
            </>
          )}
        </Panel>
        <Panel
          title="Event Status"
          subtitle="Distribution across all your events"
        >
          {busy ? (
            <div className="h-56 animate-pulse rounded-xl bg-slate-50" />
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
              <div
                role="img"
                aria-label={`${events.length} events: ${statuses.map((s) => `${data.counts[s.key]} ${s.label}`).join(", ")}`}
                className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
                style={{ background: gradient }}
              >
                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                  <strong className="text-3xl text-slate-900">
                    {events.length}
                  </strong>
                  <span className="text-xs text-slate-500">Total events</span>
                </div>
              </div>
              <ul className="w-full flex-1 space-y-3">
                {statuses.map((status) => (
                  <li
                    key={status.key}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="flex items-center gap-2 text-slate-500">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: status.color }}
                      />
                      {status.label}
                    </span>
                    <strong className="text-slate-900">
                      {data.counts[status.key]}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] sm:gap-6">
        <Panel
          title="Upcoming & Ongoing Events"
          subtitle="Your next activities, ordered by start time"
          action={
            <Link className={linkStyle} href="/dashboard/provincial/events">
              View all
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {busy ? (
            <div className="h-48 animate-pulse rounded-xl bg-slate-50" />
          ) : upcoming.length ? (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((event) => {
                const status = statuses.find(
                  (s) => s.key === eventStatus(event, now!),
                )!;
                const assigned = eventMunicipalities.filter(
                  (row) => String(row.event_id) === String(event.id),
                ).length;
                return (
                  <li key={event.id}>
                    <Link
                      href={`/dashboard/provincial/events/${event.id}`}
                      className="group flex items-center gap-3 rounded-lg py-4 hover:bg-slate-50"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <CalendarDays aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {event.title || "Untitled event"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {dateLabel(eventDate(event))}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {assigned} municipal assignments
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${status.badge}`}
                      >
                        {status.label}
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="hidden h-4 w-4 text-slate-300 sm:block"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>
              <p>No upcoming events yet.</p>
              <Link
                className={`${linkStyle} mt-2`}
                href="/dashboard/provincial/events/create"
              >
                Create your first event
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Empty>
          )}
        </Panel>
        <Panel
          title="Municipal Preparation"
          subtitle="Assignments for upcoming and ongoing events"
          action={
            <Building2 aria-hidden="true" className="h-5 w-5 text-indigo-500" />
          }
        >
          {busy ? (
            <div className="h-48 animate-pulse rounded-xl bg-slate-50" />
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <strong className="text-3xl text-slate-900">
                    {data.ready}
                  </strong>
                  <span className="ml-2 text-sm text-slate-400">
                    / {data.activeAssignments.length} ready
                  </span>
                </div>
                <span className="text-sm font-semibold text-indigo-600">
                  {data.activeAssignments.length
                    ? Math.round(
                        (data.ready / data.activeAssignments.length) * 100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Ready municipal assignments"
                aria-valuenow={data.ready}
                aria-valuemin={0}
                aria-valuemax={Math.max(1, data.activeAssignments.length)}
                className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{
                    width: `${data.activeAssignments.length ? (data.ready / data.activeAssignments.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <p className="flex justify-between text-slate-500">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Ready
                  </span>
                  <strong className="text-slate-900">{data.ready}</strong>
                </p>
                <p className="flex justify-between text-slate-500">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-amber-500" />
                    Awaiting readiness
                  </span>
                  <strong className="text-slate-900">{pending}</strong>
                </p>
                <p className="flex justify-between text-slate-500">
                  <span>Registration open</span>
                  <strong className="text-slate-900">{data.open}</strong>
                </p>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Province-wide coverage: {MUNICIPALITIES.length} municipalities.
                Preparation totals above count only assigned upcoming and
                ongoing events.
              </p>
              {!data.activeAssignments.length && (
                <p className="mt-4 text-xs leading-5 text-slate-400">
                  No active event assignments yet.
                </p>
              )}
              <Link
                className={`${linkStyle} mt-5`}
                href="/dashboard/provincial/municipalities"
              >
                View municipalities
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] sm:gap-6">
        <Panel title="Quick Actions" subtitle="Frequently used tools">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Create Event",
                href: "events/create",
                icon: CalendarPlus,
              },
              { title: "Official Memos", href: "memos", icon: FileText },
              { title: "View Reports", href: "reports", icon: Activity },
            ].map(({ title, href, icon: Icon }) => (
              <Link
                key={title}
                href={`/dashboard/provincial/${href}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50"
              >
                <Icon
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-indigo-500"
                />
                {title}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Official memos are uploaded and managed through your events.
          </p>
        </Panel>
        <Panel
          title="Needs Attention"
          action={
            <Bell aria-hidden="true" className="h-5 w-5 text-amber-500" />
          }
        >
          {busy ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/dashboard/provincial/events"
                  className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-3 text-amber-800"
                >
                  <span>Unpublished draft events</span>
                  <strong>{data.counts.draft}</strong>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/provincial/municipalities"
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3 text-slate-600"
                >
                  <span>Assignments awaiting readiness</span>
                  <strong>{pending}</strong>
                </Link>
              </li>
            </ul>
          )}
        </Panel>
      </div>
      <p className="text-xs leading-5 text-slate-400">
        Overview covers events created by your account. Registrations and
        attendance are event totals, so a participant attending multiple events
        is counted for each registration.
      </p>
    </div>
  );
}
