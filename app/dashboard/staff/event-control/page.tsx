"use client";

import EventAttendanceControl from "../components/EventAttendanceControl";
import { useStaffAttendanceContext } from "../context/StaffAttendanceContext";

export default function StaffEventControlPage() {
  const dashboard =
    useStaffAttendanceContext();

  const checkInBlockedMessage =
    dashboard.getCheckInBlockedMessage();

  const checkOutBlockedMessage =
    dashboard.getCheckOutBlockedMessage();

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
          Select an assigned event and manage the
          staff-controlled Check-In and Check-Out
          sessions for participant Time In and Time Out.
        </p>
      </header>

      <EventAttendanceControl
        assignments={
          dashboard.eventAssignments
        }
        selectedId={
          dashboard.selectedEventMunicipalityId
        }
        selectedAssignment={
          dashboard.selectedAssignment
        }
        loading={
          dashboard.loading
        }

        /*
         * Check-In
         */
        controlLoading={
          dashboard.controlLoading
        }
        isCheckInOpen={
          dashboard.isCheckInOpen
        }
        wasCheckInOpened={
          dashboard.wasCheckInOpened
        }
        wasCheckInClosed={
          dashboard.wasCheckInClosed
        }
        canOpenCheckIn={
          dashboard.canOpenCheckIn
        }
        checkInBlockedMessage={
          checkInBlockedMessage
        }

        /*
         * Check-Out
         */
        checkOutControlLoading={
          dashboard.checkOutControlLoading
        }
        isCheckOutOpen={
          dashboard.isCheckOutOpen
        }
        wasCheckOutOpened={
          dashboard.wasCheckOutOpened
        }
        wasCheckOutClosed={
          dashboard.wasCheckOutClosed
        }
        canOpenCheckOut={
          dashboard.canOpenCheckOut
        }
        canCloseCheckOut={
          dashboard.canCloseCheckOut
        }
        checkOutBlockedMessage={
          checkOutBlockedMessage
        }

        /*
         * Actions
         */
        onSelect={
          dashboard.selectEvent
        }
        onOpenCheckIn={
          dashboard.openCheckIn
        }
        onCloseCheckIn={
          dashboard.closeCheckIn
        }
        onOpenCheckOut={
          dashboard.openCheckOut
        }
        onCloseCheckOut={
          dashboard.closeCheckOut
        }
        onRefresh={
          dashboard.refreshSelectedEvent
        }
      />
    </div>
  );
}