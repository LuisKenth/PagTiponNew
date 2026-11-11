"use client";

import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  Eye,
  LogIn,
  LogOut,
  MapPin,
  ScanLine,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";

import StaffDashboardHeader from "./components/StaffDashboardHeader";
import { useStaffAttendanceContext } from "./context/StaffAttendanceContext";
import type { EventAssignment } from "./types";
import { formatDateTime } from "./utils";

type StatusDisplay = {
  label: string;
  classes: string;
};

function eventStatusBadge(status: string | null | undefined): StatusDisplay {
  switch (status?.trim().toLowerCase()) {
    case "ongoing":
      return {
        label: "Ongoing",
        classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "upcoming":
    case "published":
      return {
        label: "Upcoming",
        classes: "border-blue-200 bg-blue-50 text-blue-700",
      };
    case "completed":
      return {
        label: "Completed",
        classes: "border-slate-200 bg-slate-100 text-slate-600",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        classes: "border-rose-200 bg-rose-50 text-rose-700",
      };
    default:
      return {
        label: status || "Unknown",
        classes: "border-amber-200 bg-amber-50 text-amber-700",
      };
  }
}

function sessionBadge(
  kind: "check_in" | "check_out",
  data: ReturnType<typeof useStaffAttendanceContext>,
): StatusDisplay {
  const selected = data.selectedAssignment;
  if (!selected)
    return {
      label: "No event",
      classes: "border-slate-200 bg-slate-100 text-slate-600",
    };

  const status = selected.event.status?.toLowerCase() ?? "";
  const eventIsInactive = status === "cancelled" || status === "draft";

  if (kind === "check_in") {
    if (data.isCheckInOpen)
      return {
        label: "Open",
        classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    if (data.wasCheckInClosed || status === "completed")
      return {
        label: "Closed",
        classes: "border-slate-200 bg-slate-100 text-slate-600",
      };
    if (eventIsInactive)
      return {
        label: "Unavailable",
        classes: "border-slate-200 bg-slate-100 text-slate-600",
      };
    if (data.canOpenCheckIn)
      return {
        label: "Ready to open",
        classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    return {
      label: "Not started",
      classes: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (data.isCheckOutExpired)
    return {
      label: "Window expired",
      classes: "border-rose-200 bg-rose-50 text-rose-700",
    };
  if (data.isCheckOutOpen)
    return {
      label: "Open",
      classes: "border-blue-200 bg-blue-50 text-blue-700",
    };
  if (eventIsInactive)
    return {
      label: "Unavailable",
      classes: "border-slate-200 bg-slate-100 text-slate-600",
    };
  if (data.canOpenCheckOut) {
    return data.wasCheckOutClosed
      ? {
          label: "Can reopen",
          classes: "border-blue-200 bg-blue-50 text-blue-700",
        }
      : {
          label: "Ready to open",
          classes: "border-blue-200 bg-blue-50 text-blue-700",
        };
  }
  if (data.wasCheckOutClosed)
    return {
      label: "Closed",
      classes: "border-slate-200 bg-slate-100 text-slate-600",
    };
  return {
    label: "Not started",
    classes: "border-slate-200 bg-slate-50 text-slate-600",
  };
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconClasses,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  iconClasses: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClasses}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span
          className="text-2xl font-extrabold tabular-nums text-slate-950 sm:text-3xl"
          aria-live="polite"
        >
          {value}
        </span>
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

function DashboardEventDetailsModal({
  assignment,
  onClose,
}: {
  assignment: EventAssignment;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const event = assignment.event;
  const badge = eventStatusBadge(event.status);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 sm:p-5"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-dashboard-event-details-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]"
      >
        {/* Header and footer stay visible while the details scroll. */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Assigned Event Details
            </p>
            <h2
              id="staff-dashboard-event-details-title"
              className="mt-1 break-words text-xl font-extrabold leading-tight text-slate-950 sm:text-2xl"
            >
              {event.title}
            </h2>
            <span
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${badge.classes}`}
            >
              {badge.label}
            </span>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="Close event details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <CalendarDays className="h-4 w-4" /> Event Starts
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {formatDateTime(event.start_at)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Clock3 className="h-4 w-4" /> Event Ends
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {formatDateTime(event.end_at)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <MapPin className="h-4 w-4" /> Assigned Municipality
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {assignment.municipality || "Not specified"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <MapPin className="h-4 w-4" /> Event Venue
            </p>
            <p className="mt-2 break-words text-sm font-semibold text-slate-900">
              {assignment.venue_name?.trim() || "No venue assigned"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <ClipboardList className="h-4 w-4" /> Event Description
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
              {event.description?.trim() || "No event description provided."}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <ClipboardList className="h-4 w-4" /> Local Instructions
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
              {assignment.local_instructions?.trim() ||
                "No local instructions provided."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

export default function StaffDashboardPage() {
  const dashboard = useStaffAttendanceContext();
  const selected = dashboard.selectedAssignment;
  const eventMunicipalityId = selected ? String(selected.id) : "";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [registrationCount, setRegistrationCount] = useState<number | null>(
    null,
  );
  const [registrationForId, setRegistrationForId] = useState("");
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState(false);
  const [registrationReloadKey, setRegistrationReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const closeDetails = useCallback(() => setDetailsOpen(false), []);

  // This is a distinct, read-only RSVP count: attendance rows are NOT the
  // same as registered participants. RLS may restrict staff access to RSVPs.
  useEffect(() => {
    let cancelled = false;
    if (!eventMunicipalityId) {
      setRegistrationCount(null);
      setRegistrationForId("");
      setRegistrationLoading(false);
      setRegistrationError(false);
      return;
    }

    setRegistrationCount(null);
    setRegistrationForId("");
    setRegistrationLoading(true);
    setRegistrationError(false);

    void (async () => {
      try {
        const { count, error } = await supabase
          .from("rsvps")
          .select("id", { count: "exact", head: true })
          .eq("event_municipality_id", eventMunicipalityId);

        if (cancelled) return;
        setRegistrationForId(eventMunicipalityId);
        setRegistrationError(Boolean(error) || count === null);
        setRegistrationCount(error ? null : count);
      } catch (error) {
        if (cancelled) return;
        console.error("Unable to load Event Staff registration count:", error);
        setRegistrationForId(eventMunicipalityId);
        setRegistrationError(true);
        setRegistrationCount(null);
      } finally {
        if (!cancelled) setRegistrationLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventMunicipalityId, registrationReloadKey]);

  const refreshDashboard = useCallback(async () => {
    if (!eventMunicipalityId || refreshing) return;
    setRefreshing(true);
    try {
      await dashboard.refreshSelectedEvent();
      setRegistrationReloadKey((value) => value + 1);
    } catch (error) {
      console.error("Unable to refresh Event Staff dashboard:", error);
    } finally {
      setRefreshing(false);
    }
  }, [dashboard, eventMunicipalityId, refreshing]);

  const records = dashboard.attendanceRecords;
  const timeInCount = records.filter((record) =>
    Boolean(record.checked_in_at),
  ).length;
  const timeOutCount = records.filter(
    (record) => Boolean(record.checked_in_at) && Boolean(record.checked_out_at),
  ).length;
  const withoutTimeOut = Math.max(0, timeInCount - timeOutCount);
  const recordsLoading = dashboard.loading || dashboard.attendanceLoading;
  const noAssignment = !dashboard.loading && !selected;
  const badge = eventStatusBadge(selected?.event.status);
  const checkIn = sessionBadge("check_in", dashboard);
  const checkOut = sessionBadge("check_out", dashboard);
  const selectedEventCompleted = ["completed", "cancelled"].includes(
    selected?.event.status?.toLowerCase() ?? "",
  );

  return (
    <div className="space-y-5">
      <StaffDashboardHeader municipality={dashboard.municipality} />

      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        aria-label="Selected assigned event"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white sm:h-12 sm:w-12">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Selected Event
                </p>
                {selected && (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badge.classes}`}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
              <h2 className="mt-1 break-words text-xl font-extrabold leading-tight text-slate-950 sm:text-2xl">
                {dashboard.loading
                  ? "Loading assigned event..."
                  : selected?.event.title || "No event selected"}
              </h2>
              {selected ? (
                <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                  <p className="flex items-start gap-2">
                    <Clock3
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />{" "}
                    <span>
                      {formatDateTime(selected.event.start_at)} –{" "}
                      {formatDateTime(selected.event.end_at)}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />{" "}
                    <span>
                      {selected.venue_name?.trim() || "Venue not assigned"} ·{" "}
                      {selected.municipality}
                    </span>
                  </p>
                </div>
              ) : (
                !dashboard.loading && (
                  <p className="mt-2 text-sm text-slate-500">
                    No assigned event is available. Contact your Municipal Admin
                    if an assignment is expected.
                  </p>
                )
              )}
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              disabled={!selected}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              <Eye className="h-4 w-4" /> View Details
            </button>
            <Link
              href="/dashboard/staff/event-control"
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 sm:flex-none"
            >
              <ScanLine className="h-4 w-4" />{" "}
              {selected ? "Event Control" : "Select Event"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Attendance statistics" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-950">
              Attendance Summary
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              For the selected municipal event.
            </p>
          </div>
          {null}
        </div>
        <div className="mobile-summary-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Registered"
            value={
              !selected ||
              registrationForId !== eventMunicipalityId ||
              registrationLoading ||
              registrationError
                ? "—"
                : (registrationCount ?? "—")
            }
            description={
              registrationError
                ? "Count unavailable; check read access"
                : "Event registrations"
            }
            icon={Users}
            iconClasses="bg-slate-100 text-slate-700"
          />
          <MetricCard
            label="Time-in"
            value={noAssignment || recordsLoading ? "—" : timeInCount}
            description="Recorded participant Time-in"
            icon={LogIn}
            iconClasses="bg-emerald-50 text-emerald-700"
          />
          <MetricCard
            label="Time-out"
            value={noAssignment || recordsLoading ? "—" : timeOutCount}
            description="Recorded participant Time-out"
            icon={LogOut}
            iconClasses="bg-blue-50 text-blue-700"
          />
          <MetricCard
            label={selectedEventCompleted ? "No Time-out" : "Still Inside"}
            value={noAssignment || recordsLoading ? "—" : withoutTimeOut}
            description="Completed Time-in with no Time-out record"
            icon={Users}
            iconClasses="bg-amber-50 text-amber-700"
          />
        </div>
      </section>

      <section
        aria-label="Attendance session monitoring"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-950">
              Attendance Sessions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Live session state from the current staff workspace.
            </p>
          </div>
          <Link
            href="/dashboard/staff/event-control"
            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800"
          >
            Manage sessions <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 sm:p-4">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <LogIn className="h-4 w-4 text-emerald-700" /> Time-in · Time-in
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${checkIn.classes}`}
            >
              {checkIn.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 sm:p-4">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <LogOut className="h-4 w-4 text-blue-700" /> Time-out · Time-out
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${checkOut.classes}`}
            >
              {checkOut.label}
            </span>
          </div>
        </div>
        {selected && dashboard.checkOutDeadlineAt && (
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" /> Time-out
            deadline: {formatDateTime(dashboard.checkOutDeadlineAt)}
            {dashboard.isCheckOutExpired && (
              <span className="font-semibold text-rose-600">(Expired)</span>
            )}
          </p>
        )}
      </section>

      <section aria-label="Quick actions" className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-950">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard/staff/event-control"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ScanLine className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">
                Event Control & Scanner
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Scan QR or enter attendance codes
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
          </Link>
          <Link
            href="/dashboard/staff/attendance-records"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ClipboardList className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">
                Attendance Records
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Review Time-in and Time-out logs
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
          </Link>
        </div>
      </section>

      {detailsOpen && selected && (
        <DashboardEventDetailsModal
          assignment={selected}
          onClose={closeDetails}
        />
      )}
    </div>
  );
}
