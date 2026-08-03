"use client";

import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  ClipboardCheck,
  QrCode,
  ScanLine,
} from "lucide-react";

import AttendanceSummaryCards from "./components/AttendanceSummaryCards";
import StaffDashboardHeader from "./components/StaffDashboardHeader";
import { useStaffAttendanceContext } from "./context/StaffAttendanceContext";

const quickActions = [
  {
    title: "Event Control",
    description:
      "Select an assigned event and manage its attendance check-in session.",
    href: "/dashboard/staff/event-control",
    icon: ClipboardCheck,
    iconClassName: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Attendance Overview",
    description:
      "View current attendance totals for the selected event.",
    href: "/dashboard/staff/attendance-overview",
    icon: BarChart3,
    iconClassName: "bg-blue-100 text-blue-700",
  },
  {
    title: "Participant Check-In",
    description:
      "Scan participant QR codes or process manual attendance codes.",
    href: "/dashboard/staff/participant-check-in",
    icon: QrCode,
    iconClassName: "bg-violet-100 text-violet-700",
  },
  {
    title: "Attendance Records",
    description:
      "Review participant names, statuses, methods, and check-in times.",
    href: "/dashboard/staff/attendance-records",
    icon: ScanLine,
    iconClassName: "bg-amber-100 text-amber-700",
  },
];

export default function StaffDashboardPage() {
  const dashboard = useStaffAttendanceContext();
  const totalRecords =
    dashboard.attendanceRecords.length;

  const totalPresent =
    dashboard.attendanceRecords.filter(
      (record) =>
        String(record.status).toLowerCase() ===
        "present"
    ).length;

  const totalPending =
    dashboard.attendanceRecords.filter(
      (record) =>
        String(record.status).toLowerCase() ===
        "pending"
    ).length;

  const totalAbsent =
    dashboard.attendanceRecords.filter(
      (record) =>
        String(record.status).toLowerCase() ===
        "absent"
    ).length;

  const attendanceRate =
    totalRecords > 0
      ? Math.round(
        (totalPresent / totalRecords) * 100
      )
      : 0;
  return (
    <div className="space-y-8">
      <StaffDashboardHeader
        municipality={dashboard.municipality}
      />

      <section
        aria-labelledby="dashboard-summary-heading"
        className="space-y-4"
      >
        <div>
          <h2
            id="dashboard-summary-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Current Attendance Summary
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Overview of the currently selected event and its attendance
            records.
          </p>
        </div>

        {dashboard.loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading staff attendance information...
          </div>
        ) : (
          <AttendanceSummaryCards
            totalRecords={totalRecords}
            totalPresent={totalPresent}
            totalPending={totalPending}
            totalAbsent={totalAbsent}
            attendanceRate={attendanceRate}
            selectedEventTitle={
              dashboard.selectedAssignment?.event.title ??
              null
            }
          />
        )}
      </section>

      <section
        aria-labelledby="quick-actions-heading"
        className="space-y-4"
      >
        <div>
          <h2
            id="quick-actions-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Attendance Operations
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Select the attendance operation you need to perform.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${action.iconClassName}`}
                    >
                      <Icon
                        className="h-6 w-6"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-900">
                        {action.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {action.description}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}