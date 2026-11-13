"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarCheck, ClipboardList } from "lucide-react";

import EventAttendanceControl from "../components/EventAttendanceControl";
import InlineAttendanceWorkspace from "../components/InlineAttendanceWorkspace";
import DashboardMessage from "../components/DashboardMessage";
import { useStaffAttendanceContext } from "../context/StaffAttendanceContext";

/** One Event Staff workspace: event → session → scanner, without page changes. */
export default function StaffEventControlPage() {
  const dashboard = useStaffAttendanceContext();
  const [entryReady, setEntryReady] = useState(false);
  const { loading, prepareEventControl } = dashboard;
  useEffect(() => {
    if (loading) return;
    let current = true;
    void prepareEventControl().finally(() => {
      if (current) setEntryReady(true);
    });
    return () => {
      current = false;
    };
  }, [loading, prepareEventControl]);
  const activeSession =
    !dashboard.selectedEventIsReferenceOnly &&
    (dashboard.isCheckInOpen ||
      (dashboard.isCheckOutOpen && !dashboard.isCheckOutExpired));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Event Staff
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
              Event Control &amp; Attendance
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Choose an event, open Time-in or Time-out, and scan participants
              here.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/staff/attendance-records"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ClipboardList className="h-4 w-4" />
          Attendance Records
        </Link>
      </header>

      {!dashboard.loading &&
        (dashboard.selectionNotice ||
          dashboard.selectedEventIsReferenceOnly ||
          !dashboard.selectedAssignment) && (
          <div
            role="status"
            className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"
          >
            <p>
              {dashboard.selectionNotice ||
                (dashboard.selectedEventIsReferenceOnly
                  ? "This event is now reference-only. Attendance tools are stopped. Choose an active event to continue."
                  : dashboard.recommendedAssignment
                    ? "Choose an assigned event to continue."
                    : "No active events to manage. Past attendance remains available in Attendance Records.")}
            </p>
            {dashboard.recommendedAssignment &&
              String(dashboard.recommendedAssignment.id) !==
                dashboard.selectedEventMunicipalityId && (
                <button
                  type="button"
                  disabled={
                    dashboard.attendanceLoading ||
                    dashboard.controlLoading !== null ||
                    dashboard.checkOutControlLoading !== null
                  }
                  onClick={() =>
                    void dashboard.selectEvent(
                      String(dashboard.recommendedAssignment!.id),
                    )
                  }
                  className="min-h-11 rounded-xl border border-amber-400 bg-white px-4 py-2 font-semibold disabled:opacity-50"
                >
                  Select recommended event:{" "}
                  {dashboard.recommendedAssignment.event.title}
                </button>
              )}
          </div>
        )}

      <EventAttendanceControl
        assignments={dashboard.eventAssignments}
        selectedId={dashboard.selectedEventMunicipalityId}
        selectedAssignment={dashboard.selectedAssignment}
        loading={dashboard.loading || !entryReady}
        controlLoading={dashboard.controlLoading}
        isCheckInOpen={dashboard.isCheckInOpen}
        wasCheckInOpened={dashboard.wasCheckInOpened}
        wasCheckInClosed={dashboard.wasCheckInClosed}
        canOpenCheckIn={dashboard.canOpenCheckIn}
        checkInBlockedMessage={dashboard.getCheckInBlockedMessage()}
        checkOutControlLoading={dashboard.checkOutControlLoading}
        isCheckOutOpen={dashboard.isCheckOutOpen}
        wasCheckOutOpened={dashboard.wasCheckOutOpened}
        wasCheckOutClosed={dashboard.wasCheckOutClosed}
        canOpenCheckOut={dashboard.canOpenCheckOut}
        canCloseCheckOut={dashboard.canCloseCheckOut}
        checkOutBlockedMessage={dashboard.getCheckOutBlockedMessage()}
        isCheckOutExpired={dashboard.isCheckOutExpired}
        checkOutDeadlineAt={dashboard.checkOutDeadlineAt}
        onSelect={dashboard.selectEvent}
        onOpenCheckIn={dashboard.openCheckIn}
        onCloseCheckIn={dashboard.closeCheckIn}
        onOpenCheckOut={dashboard.openCheckOut}
        onCloseCheckOut={dashboard.closeCheckOut}
        onRefresh={dashboard.refreshSelectedEvent}
      />

      {/* When active, the workspace automatically scrolls into view after
          Open/Reopen Time-in or Time-out and remains on this route. */}
      {entryReady && <InlineAttendanceWorkspace />}

      {/* Display control errors or confirmations while no scanner is active;
          the QR component displays messages during active sessions. */}
      {!activeSession && dashboard.message && (
        <DashboardMessage message={dashboard.message} />
      )}
    </div>
  );
}
