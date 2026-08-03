"use client";

import ManualQrTokenEntry from "../components/ManualQrTokenEntry";
import QrAttendanceScanner from "../components/QrAttendanceScanner";
import { useStaffAttendanceContext } from "../context/StaffAttendanceContext";

export default function StaffParticipantCheckInPage() {
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
          Participant Check-In
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Scan a participant QR code or enter the manual attendance code
          displayed on the participant dashboard.
        </p>
      </header>

      {dashboard.selectedAssignment && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Selected Event
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {dashboard.selectedAssignment.event.title}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
              dashboard.isCheckInOpen
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {dashboard.isCheckInOpen
              ? "Check-in Open"
              : "Check-in Not Open"}
          </span>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-2">
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
      </div>
    </div>
  );
}