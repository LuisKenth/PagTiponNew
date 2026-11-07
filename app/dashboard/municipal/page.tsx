"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  MapPin,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { useMunicipalOverview } from "./overview/useMunicipalOverview";
import {
  MUNICIPAL_EVENT_STATES,
  municipalDate,
  municipalNotificationDestination,
  municipalOverviewMetrics,
  preparationLabel,
} from "./overview/model";
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
      <header
        className="min-w-0 rounded-2xl border p-5 shadow-sm sm:p-7"
        style={{ backgroundColor: "#172554", borderColor: "#1e3a8a" }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
            minWidth: 0,
          }}
        >
          <div style={{ flex: "1 1 380px", minWidth: 0 }}>
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "#263869", color: "white" }}
              >
                <LayoutDashboard size={22} aria-hidden="true" />
              </span>
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#bfdbfe" }}
              >
                Municipal Overview
              </span>
            </div>
            <h1
              className="mt-4 break-words text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ color: "white" }}
            >
              Municipal Dashboard
            </h1>
            <p className="mt-2 text-sm leading-6" style={{ color: "#e2e8f0" }}>
              {data.fullName ? `Welcome back, ${data.fullName}. ` : ""}Here’s
              your municipal event overview.
            </p>
            <p
              className="mt-3 flex items-center gap-2 text-xs font-medium"
              style={{ color: "#bfdbfe" }}
            >
              <MapPin size={15} aria-hidden="true" />
              {data.municipality || "Your municipality"}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className={button}
            >
              <RefreshCw
                size={17}
                aria-hidden="true"
                className={loading ? "animate-spin" : ""}
              />{" "}
              Refresh
            </button>
            <Link
              href="/dashboard/municipal/preparations"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              View Events <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>
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
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2 sm:gap-6">
            <section className={card} aria-busy={loading}>
              <h2 className="text-base font-bold text-slate-900">
                Event Status
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                All events received by your municipality
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
