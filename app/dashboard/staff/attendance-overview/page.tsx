"use client";

import AttendanceSummaryCards from "../components/AttendanceSummaryCards";
import { useStaffAttendanceContext } from "../context/StaffAttendanceContext";

export default function StaffAttendanceOverviewPage() {
    const dashboard = useStaffAttendanceContext();

    const selectedEventTitle =
        dashboard.selectedAssignment?.event.title ?? null;
    const totalRecords = dashboard.attendanceRecords.length;

    const totalPresent = dashboard.attendanceRecords.filter(
        (record) =>
            String(record.status).toLowerCase() === "present"
    ).length;

    const totalPending = dashboard.attendanceRecords.filter(
        (record) =>
            String(record.status).toLowerCase() === "pending"
    ).length;

    const totalAbsent = dashboard.attendanceRecords.filter(
        (record) =>
            String(record.status).toLowerCase() === "absent"
    ).length;

    const attendanceRate =
        totalRecords > 0
            ? Math.round((totalPresent / totalRecords) * 100)
            : 0;

    return (
        <div className="space-y-6">
            <header>
                <p className="text-sm font-semibold text-emerald-700">
                    Attendance Operations
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Attendance Overview
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Monitor the current attendance totals for the event selected in
                    Event Control.
                </p>
            </header>

            {dashboard.loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    Loading attendance overview...
                </div>
            ) : !dashboard.selectedAssignment ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-semibold text-slate-800">
                        No event selected
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        Open Event Control and select an assigned event first.
                    </p>
                </div>
            ) : (
                <>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                            Selected Event
                        </p>

                        <p className="mt-1 text-sm font-semibold text-blue-950">
                            {selectedEventTitle}
                        </p>
                    </div>
                    <AttendanceSummaryCards
                        totalRecords={totalRecords}
                        totalPresent={totalPresent}
                        totalPending={totalPending}
                        totalAbsent={totalAbsent}
                        attendanceRate={attendanceRate}
                        selectedEventTitle={selectedEventTitle}
                    />
                </>
            )}
        </div>
    );
}