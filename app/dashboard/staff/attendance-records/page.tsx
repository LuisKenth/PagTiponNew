"use client";

import {
  LogIn,
  LogOut,
  UserCheck,
} from "lucide-react";

import AttendanceRecordsTable from "../components/AttendanceRecordsTable";
import { useStaffAttendanceContext } from "../context/StaffAttendanceContext";

export default function StaffAttendanceRecordsPage() {
  const dashboard =
    useStaffAttendanceContext();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <p className="text-sm font-semibold text-emerald-700">
          Attendance Operations
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Attendance Records
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Review participant attendance status,
          attendance method, Time In, and Time Out
          records for the selected event.
        </p>
      </header>

      {/* Selected event */}
      {dashboard.selectedAssignment && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Showing Records For
              </p>

              <p className="mt-1 text-sm font-semibold text-blue-950">
                {
                  dashboard
                    .selectedAssignment
                    .event.title
                }
              </p>
            </div>

            <span className="w-fit rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-blue-700">
              {dashboard.selectedAssignment.event.status ||
                "Unknown"}
            </span>
          </div>
        </section>
      )}

      {/* Attendance summary */}
      {!dashboard.loading &&
        dashboard.selectedAssignment && (
          <section
            aria-label="Attendance record summary"
            className="grid gap-4 sm:grid-cols-3"
          >
            <SummaryCard
              icon={UserCheck}
              label="Present"
              value={dashboard.totalPresent}
              description="Participants with a successful Time In."
              className="border-emerald-200 bg-emerald-50"
              iconClassName="bg-emerald-100 text-emerald-700"
              valueClassName="text-emerald-950"
            />

            <SummaryCard
              icon={LogIn}
              label="Currently Inside"
              value={dashboard.totalInside}
              description="Checked in but no Time Out recorded yet."
              className="border-amber-200 bg-amber-50"
              iconClassName="bg-amber-100 text-amber-700"
              valueClassName="text-amber-950"
            />

            <SummaryCard
              icon={LogOut}
              label="Checked Out"
              value={dashboard.totalCheckedOut}
              description="Participants with both Time In and Time Out."
              className="border-blue-200 bg-blue-50"
              iconClassName="bg-blue-100 text-blue-700"
              valueClassName="text-blue-950"
            />
          </section>
        )}

      {/* Records */}
      <AttendanceRecordsTable
        records={
          dashboard.attendanceRecords
        }
        loading={
          dashboard.loading ||
          dashboard.attendanceLoading
        }
      />
    </div>
  );
}

type SummaryCardProps = {
  icon: typeof UserCheck;
  label: string;
  value: number;
  description: string;
  className: string;
  iconClassName: string;
  valueClassName: string;
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
  className,
  iconClassName,
  valueClassName,
}: SummaryCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {label}
          </p>

          <p
            className={`mt-2 text-3xl font-bold tracking-tight ${valueClassName}`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon
            className="h-5 w-5"
            aria-hidden="true"
          />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-600">
        {description}
      </p>
    </div>
  );
}