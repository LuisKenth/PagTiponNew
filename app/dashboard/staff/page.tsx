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
  const blockedMessage =
    dashboard.getAttendanceBlockedMessage();

  return (
    <div className="space-y-7">
      {/* Dashboard heading */}
      <StaffDashboardHeader
        municipality={dashboard.municipality}
      />

      {/* Event selection and attendance controls */}
      <section
        id="event-control"
        aria-labelledby="event-control-heading"
        className="scroll-mt-24 space-y-4 lg:scroll-mt-6"
      >
        <div>
          <h2
            id="event-control-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Event Attendance Control
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select an assigned event and manage its attendance
            check-in session.
          </p>
        </div>

        <EventAttendanceControl
          assignments={dashboard.eventAssignments}
          selectedId={
            dashboard.selectedEventMunicipalityId
          }
          selectedAssignment={
            dashboard.selectedAssignment
          }
          loading={dashboard.loading}
          controlLoading={dashboard.controlLoading}
          earliestOpeningTime={
            dashboard.earliestOpeningTime
          }
          isCheckInOpen={dashboard.isCheckInOpen}
          wasCheckInOpened={
            dashboard.wasCheckInOpened
          }
          wasCheckInClosed={
            dashboard.wasCheckInClosed
          }
          canOpenCheckIn={dashboard.canOpenCheckIn}
          canUseAttendanceTools={
            dashboard.canUseAttendanceTools
          }
          blockedMessage={blockedMessage}
          onSelect={dashboard.selectEvent}
          onOpen={dashboard.openCheckIn}
          onClose={dashboard.closeCheckIn}
          onRefresh={dashboard.refreshSelectedEvent}
        />
      </section>

      {/* Attendance summary */}
      <section
        id="attendance-overview"
        aria-labelledby="attendance-overview-heading"
        className="scroll-mt-24 space-y-4 lg:scroll-mt-6"
      >
        <div>
          <h2
            id="attendance-overview-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Attendance Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            View the current attendance totals for the selected
            event.
          </p>
        </div>

        <AttendanceSummaryCards
          totalRecords={
            dashboard.attendanceRecords.length
          }
          totalPresent={dashboard.totalPresent}
          selectedEventTitle={
            dashboard.selectedAssignment?.event.title ??
            null
          }
        />
      </section>

      {/* Attendance tools */}
      <section
        id="participant-check-in"
        aria-labelledby="attendance-tools-heading"
        className="scroll-mt-24 space-y-4 lg:scroll-mt-6"
      >
        <div>
          <h2
            id="attendance-tools-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Participant Check-In
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Scan a participant QR code or enter the QR token
            manually.
          </p>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-2">
          <QrAttendanceScanner
            eventKey={
              dashboard.selectedEventMunicipalityId
            }
            canUseAttendanceTools={
              dashboard.canUseAttendanceTools
            }
            blockedMessage={blockedMessage}
            message={dashboard.message}
            onProcessToken={dashboard.processQrToken}
            onShowMessage={dashboard.showMessage}
          />

          <ManualQrTokenEntry
            canUseAttendanceTools={
              dashboard.canUseAttendanceTools
            }
            blockedMessage={blockedMessage}
            onProcessToken={dashboard.processQrToken}
            onShowMessage={dashboard.showMessage}
          />
        </div>
      </section>

      {/* Attendance roster */}
      <section
        id="attendance-records"
        aria-labelledby="attendance-records-heading"
        className="scroll-mt-24 space-y-4 pb-4 lg:scroll-mt-6"
      >
        <div>
          <h2
            id="attendance-records-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Attendance Records
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review the participants and their latest attendance
            status.
          </p>
        </div>

        <AttendanceRecordsTable
          records={dashboard.attendanceRecords}
          loading={dashboard.attendanceLoading}
        />
      </section>
    </div>
  );
}