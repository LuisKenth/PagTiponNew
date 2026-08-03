"use client";

import AttendanceRecordsTable from "../components/AttendanceRecordsTable";
import { useStaffAttendanceContext } from "../context/StaffAttendanceContext";

export default function StaffAttendanceRecordsPage() {
  const dashboard = useStaffAttendanceContext();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-emerald-700">
          Attendance Operations
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Attendance Records
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Review participants, attendance status, check-in method, and
          recorded check-in time for the selected event.
        </p>
      </header>

      {dashboard.selectedAssignment && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Showing Records For
          </p>

          <p className="mt-1 text-sm font-semibold text-blue-950">
            {dashboard.selectedAssignment.event.title}
          </p>
        </div>
      )}

      <AttendanceRecordsTable
        records={dashboard.attendanceRecords}
        loading={
          dashboard.loading ||
          dashboard.attendanceLoading
        }
      />
    </div>
  );
}