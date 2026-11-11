"use client";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  ScanLine,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  MUNICIPAL_EVENT_STATES,
  municipalDate,
  municipalNotificationDestination,
  municipalOverviewMetrics,
  preparationLabel,
} from "./overview/model";
import { useMunicipalOverview } from "./overview/useMunicipalOverview";
const card =
  "min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50";
function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  href,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={
        card +
        " block transition hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-slate-600">{title}</h2>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-500">{subtitle}</p>
    </Link>
  );
}
export default function MunicipalDashboardPage() {
  const router = useRouter();
  const { data, loading, error, refresh } = useMunicipalOverview();
  const [notice, setNotice] = useState("");
  const handled = useRef(false);
  const metrics = useMemo(
    () =>
      municipalOverviewMetrics(
        data,
        data.loadedAt ? Date.parse(data.loadedAt) : 0,
      ),
    [data],
  );
  // Existing notification URLs still open the exact preparation workspace.
  useEffect(() => {
    if (loading || error || !data.loadedAt || handled.current) return;
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const assignmentId = params.get("assignmentId")?.trim() || "",
        eventId = params.get("eventId")?.trim() || "";
      if (!assignmentId && !eventId) return;
      handled.current = true;
      const destination = municipalNotificationDestination(
        metrics.assignments,
        assignmentId,
        eventId,
        params.get("notificationType") || "",
      );
      if (destination) router.replace(destination);
      else {
        window.history.replaceState({}, "", "/dashboard/municipal");
        setNotice(
          "The event linked to this notification is no longer available in your municipality.",
        );
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [data.loadedAt, loading, error, metrics.assignments, router]);
  const segments: string[] = [];
  let offset = 0;
  for (const state of MUNICIPAL_EVENT_STATES) {
    const next =
      offset +
      (metrics.received
        ? (metrics.counts[state.key] / metrics.received) * 100
        : 0);
    if (next > offset) segments.push(`${state.color} ${offset}% ${next}%`);
    offset = next;
  }
  const chartLabel = MUNICIPAL_EVENT_STATES.map(
    (state) => `${state.label}: ${metrics.counts[state.key]}`,
  ).join(", ");
  return (
    <div className="min-w-0 space-y-5 pb-6 sm:space-y-6">
      <MunicipalPageHeader
        icon={<LayoutDashboard className="h-6 w-6" />}
        eyebrow="Municipal Administration · Overview"
        title="Municipal Dashboard"
        description={
          <>
            {data.fullName ? `Welcome back, ${data.fullName}. ` : ""}
            Review events and attendance in{" "}
            <strong>{data.municipality || "your municipality"}</strong>.
          </>
        }
        actions={
          <>
            {null}
            <Link
              href="/dashboard/municipal/preparations"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Manage Preparations <ArrowRight size={17} />
            </Link>
          </>
        }
      />
      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          <p>{notice}</p>
          <button
            type="button"
            aria-label="Dismiss notification notice"
            onClick={() => setNotice("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {error && !loading ? (
        <section
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
        >
          <h2 className="font-semibold">Dashboard unavailable</h2>
          <p className="mt-2">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </section>
      ) : (
        <>
          <section
            aria-label="Municipal summary"
            aria-busy={loading}
            className="mobile-summary-grid grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <SummaryCard
              title="Total Events"
              value={loading ? "…" : String(metrics.received)}
              subtitle="Provincial and municipal events in your municipality"
              icon={<CalendarDays size={21} aria-hidden="true" />}
              href="/dashboard/municipal/preparations"
            />
            <SummaryCard
              title="Needs Preparation"
              value={loading ? "…" : String(metrics.needsPreparation)}
              subtitle="Upcoming events not yet prepared"
              icon={<ClipboardList size={21} aria-hidden="true" />}
              href="/dashboard/municipal/preparations"
            />
            <SummaryCard
              title="Registrations"
              value={loading ? "…" : String(metrics.registrations)}
              subtitle="Active registrations · excludes cancelled events"
              icon={<Users size={21} aria-hidden="true" />}
              href="/dashboard/municipal/registrations/events"
            />
            <SummaryCard
              title="Attendance Rate"
              value={
                loading
                  ? "…"
                  : metrics.attendanceRate === null
                    ? "—"
                    : `${metrics.attendanceRate}%`
              }
              subtitle={
                loading
                  ? "Present + late in completed events"
                  : metrics.completedRegistrations
                    ? `${metrics.attended} of ${metrics.completedRegistrations} registrations in completed events`
                    : "No registrations in completed events yet"
              }
              icon={<ClipboardCheck size={21} aria-hidden="true" />}
              href="/dashboard/municipal/attendance"
            />
          </section>
          {/* Prioritized operational alerts. Counts are derived from the already loaded
              municipality-scoped overview; no additional privileged query is made. */}
          <section aria-labelledby="municipal-alerts-heading" className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    size={19}
                    className="text-indigo-600"
                    aria-hidden="true"
                  />
                  <h2
                    id="municipal-alerts-heading"
                    className="text-base font-bold text-slate-900"
                  >
                    Important Alerts
                  </h2>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Operational items that may need attention in{" "}
                  {data.municipality || "your municipality"}.
                </p>
              </div>
              <Link
                href="/dashboard/municipal/notifications"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline"
              >
                Notifications <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            {loading ? (
              <div
                className="mt-4 h-14 animate-pulse rounded-xl bg-slate-100"
                aria-label="Loading alerts"
              />
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {metrics.needsPreparation > 0 && (
                  <Link
                    href="/dashboard/municipal/preparations"
                    className="group flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <ClipboardList
                      className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900">
                        {metrics.needsPreparation} event
                        {metrics.needsPreparation === 1 ? "" : "s"} need
                        preparation
                      </p>
                      <p className="mt-1 text-xs leading-5 text-amber-800">
                        Assign venue, instructions, and registration settings.
                      </p>
                    </div>
                  </Link>
                )}
                {metrics.counts.ongoing > 0 && (
                  <Link
                    href="/dashboard/municipal/attendance"
                    className="group flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <ScanLine
                      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-emerald-900">
                        {metrics.counts.ongoing} ongoing event
                        {metrics.counts.ongoing === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-emerald-800">
                        View live attendance and event details.
                      </p>
                    </div>
                  </Link>
                )}
                {metrics.counts.unscheduled > 0 && (
                  <Link
                    href="/dashboard/municipal/preparations"
                    className="group flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 transition hover:border-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-5 w-5 shrink-0 text-orange-700"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-orange-900">
                        {metrics.counts.unscheduled} event
                        {metrics.counts.unscheduled === 1 ? "" : "s"} need
                        schedule review
                      </p>
                      <p className="mt-1 text-xs leading-5 text-orange-800">
                        Check events with an incomplete or invalid schedule.
                      </p>
                    </div>
                  </Link>
                )}
                {metrics.needsPreparation === 0 &&
                  metrics.counts.ongoing === 0 &&
                  metrics.counts.unscheduled === 0 && (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:col-span-2 xl:col-span-3">
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-semibold text-emerald-900">
                          No urgent event-operation alerts
                        </p>
                        <p className="mt-1 text-xs leading-5 text-emerald-800">
                          Review Notifications for new invitations and
                          administrative updates.
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </section>
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2 sm:gap-6">
            <section className={card} aria-busy={loading}>
              <h2 className="text-base font-bold text-slate-900">
                Event Status
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Provincial and municipal events for your municipality
              </p>
              {loading ? (
                <div
                  role="status"
                  className="flex min-h-60 items-center justify-center gap-2 text-sm text-slate-500"
                >
                  <Loader2 size={19} className="animate-spin" /> Loading
                  overview…
                </div>
              ) : (
                <>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-7">
                    <div
                      role="img"
                      aria-label={chartLabel}
                      style={{
                        position: "relative",
                        width: 150,
                        height: 150,
                        flexShrink: 0,
                        borderRadius: "50%",
                        background: segments.length
                          ? `conic-gradient(${segments.join(",")})`
                          : "#e2e8f0",
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          inset: 24,
                          borderRadius: "50%",
                          background: "white",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span className="text-3xl font-bold text-slate-950">
                          {metrics.received}
                        </span>
                        <span className="mt-1 text-xs text-slate-500">
                          Received events
                        </span>
                      </div>
                    </div>
                    <ul className="min-w-36 space-y-3 text-sm">
                      {MUNICIPAL_EVENT_STATES.filter(
                        (state) =>
                          state.key !== "unscheduled" ||
                          metrics.counts.unscheduled > 0,
                      ).map((state) => (
                        <li
                          key={state.key}
                          className="flex items-center justify-between gap-6"
                        >
                          <span className="flex items-center gap-2 text-slate-600">
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: state.color }}
                            />
                            {state.label}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {metrics.counts[state.key]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {metrics.received === 0 && (
                    <p className="mt-5 text-center text-sm text-slate-500">
                      No events available yet.
                    </p>
                  )}
                </>
              )}
            </section>
            <section className={card} aria-busy={loading}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Upcoming &amp; Ongoing Events
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Your next events · Philippine time
                  </p>
                </div>
                <Link
                  href="/dashboard/municipal/preparations"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              {loading ? (
                <div className="flex min-h-60 items-center justify-center text-sm text-slate-500">
                  Loading events…
                </div>
              ) : metrics.preview.length === 0 ? (
                <div className="mt-5 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <CalendarDays
                    size={30}
                    className="text-slate-300"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    No upcoming or ongoing events
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Upcoming provincial and municipal events will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <ul className="mt-4 divide-y divide-slate-100">
                    {metrics.preview.map((row) => (
                      <li
                        key={row.assignment.id}
                        className="py-4 first:pt-1 last:pb-0"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="min-w-0 break-words text-sm font-semibold text-slate-900">
                            {row.event.title || "Untitled event"}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.state === "ongoing" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}
                          >
                            {row.state === "ongoing" ? "Ongoing" : "Upcoming"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {municipalDate(row.event.start_at)} –{" "}
                          {municipalDate(row.event.end_at)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-slate-500">
                            Preparation:{" "}
                            <span className="font-medium text-slate-700">
                              {preparationLabel(
                                row.assignment.municipal_status,
                              )}
                            </span>
                          </p>
                          <Link
                            href={`/dashboard/municipal/preparations?assignmentId=${encodeURIComponent(row.assignment.id)}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            {row.state === "ongoing"
                              ? "View details"
                              : "View preparation"}
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {metrics.active.length > 5 && (
                    <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      Showing 5 of {metrics.active.length} upcoming and ongoing
                      events.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2 sm:gap-6">
            <section
              className={card}
              aria-labelledby="municipal-attendance-heading"
              aria-busy={loading}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    id="municipal-attendance-heading"
                    className="text-base font-bold text-slate-900"
                  >
                    Attendance Snapshot
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Final attendance for completed events only.
                  </p>
                </div>
                <Link
                  href="/dashboard/municipal/attendance"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline"
                >
                  View attendance <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-600">
                    Completed-event registrations
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {loading ? "…" : metrics.completedRegistrations}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-emerald-800">
                    Attended (Present + Late)
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-900">
                    {loading ? "…" : metrics.attended}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                  <span>Completed-event attendance rate</span>
                  <span>
                    {loading
                      ? "…"
                      : metrics.attendanceRate === null
                        ? "—"
                        : `${metrics.attendanceRate}%`}
                  </span>
                </div>
                <div
                  className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Completed-event attendance rate"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={metrics.attendanceRate ?? 0}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, metrics.attendanceRate ?? 0))}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  — means no registered participants in completed events.
                  Upcoming registrations are excluded from this rate.
                </p>
              </div>
            </section>
            <section
              className={card}
              aria-labelledby="municipal-quick-actions-heading"
            >
              <h2
                id="municipal-quick-actions-heading"
                className="text-base font-bold text-slate-900"
              >
                Quick Actions
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Open frequently used municipal workspaces.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Create Event",
                    href: "/dashboard/municipal/events/create",
                    icon: CalendarPlus,
                  },
                  {
                    label: "Prepare Events",
                    href: "/dashboard/municipal/preparations",
                    icon: ClipboardList,
                  },
                  {
                    label: "Registrations",
                    href: "/dashboard/municipal/registrations/events",
                    icon: Users,
                  },
                  {
                    label: "Attendance",
                    href: "/dashboard/municipal/attendance",
                    icon: ScanLine,
                  },
                  {
                    label: "Verify Participants",
                    href: "/dashboard/municipal/participant-verifications",
                    icon: ShieldCheck,
                  },
                  {
                    label: "Reports",
                    href: "/dashboard/municipal/reports",
                    icon: BarChart3,
                  },
                ].map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group flex min-h-20 min-w-0 flex-col items-start justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:flex-row sm:items-center sm:px-4"
                    >
                      <ActionIcon
                        size={19}
                        aria-hidden="true"
                        className="shrink-0 text-indigo-600"
                      />
                      <span className="min-w-0 text-xs font-semibold text-slate-800 group-hover:text-indigo-800 sm:text-sm">
                        {action.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
          {data.loadedAt && !loading && (
            <p className="text-xs text-slate-400">
              Updated {municipalDate(data.loadedAt)} (PH) · Refreshes every
              minute while this page is visible.
            </p>
          )}
        </>
      )}
    </div>
  );
}
