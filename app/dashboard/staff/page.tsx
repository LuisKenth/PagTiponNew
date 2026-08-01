"use client";

import AttendanceRecordsTable from "./components/AttendanceRecordsTable";
import AttendanceSummaryCards from "./components/AttendanceSummaryCards";
import EventAttendanceControl from "./components/EventAttendanceControl";
import ManualQrTokenEntry from "./components/ManualQrTokenEntry";
import QrAttendanceScanner from "./components/QrAttendanceScanner";
import StaffDashboardHeader from "./components/StaffDashboardHeader";
import { useStaffAttendanceDashboard } from "./hooks/useStaffAttendanceDashboard";

export default function StaffDashboardPage() {
  const dashboard = useStaffAttendanceDashboard();
  const blockedMessage = dashboard.getAttendanceBlockedMessage();

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <StaffDashboardHeader municipality={dashboard.municipality} />

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

        <AttendanceSummaryCards
          totalRecords={dashboard.attendanceRecords.length}
          totalPresent={dashboard.totalPresent}
          selectedEventTitle={dashboard.selectedAssignment?.event.title ?? null}
        />

        <section className="grid gap-6 lg:grid-cols-2">
          <QrAttendanceScanner
            eventKey={dashboard.selectedEventMunicipalityId}
            canUseAttendanceTools={dashboard.canUseAttendanceTools}
            blockedMessage={blockedMessage}
            message={dashboard.message}
            onProcessToken={dashboard.processQrToken}
            onShowMessage={dashboard.showMessage}
          />

          <ManualQrTokenEntry
            canUseAttendanceTools={dashboard.canUseAttendanceTools}
            blockedMessage={blockedMessage}
            onProcessToken={dashboard.processQrToken}
            onShowMessage={dashboard.showMessage}
          />
        </section>

        <AttendanceRecordsTable
          records={dashboard.attendanceRecords}
          loading={dashboard.attendanceLoading}
        />
      </div>
    </main>
  );
}
