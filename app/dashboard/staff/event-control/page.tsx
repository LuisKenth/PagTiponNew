"use client";

import EventAttendanceControl from "../components/EventAttendanceControl";
import { useStaffAttendanceContext } from "../context/StaffAttendanceContext";

export default function StaffEventControlPage() {
  const dashboard = useStaffAttendanceContext();

  const blockedMessage =
    dashboard.getAttendanceBlockedMessage();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-emerald-700">
          Attendance Operations
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Event Attendance Control
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Select an assigned event, review its schedule, and manage the
          staff-controlled attendance check-in session.
        </p>
      </header>

      <EventAttendanceControl
        assignments={dashboard.eventAssignments}
        selectedId={dashboard.selectedEventMunicipalityId}
        selectedAssignment={dashboard.selectedAssignment}
        loading={dashboard.loading}
        controlLoading={dashboard.controlLoading}
        earliestOpeningTime={dashboard.earliestOpeningTime}
        isCheckInOpen={dashboard.isCheckInOpen}
        wasCheckInOpened={dashboard.wasCheckInOpened}
        wasCheckInClosed={dashboard.wasCheckInClosed}
        canOpenCheckIn={dashboard.canOpenCheckIn}
        canUseAttendanceTools={dashboard.canUseAttendanceTools}
        blockedMessage={blockedMessage}
        onSelect={dashboard.selectEvent}
        onOpen={dashboard.openCheckIn}
        onClose={dashboard.closeCheckIn}
        onRefresh={dashboard.refreshSelectedEvent}
      />
    </div>
  );
}