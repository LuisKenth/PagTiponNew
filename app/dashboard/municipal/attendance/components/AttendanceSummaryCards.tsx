import {
  CircleDashed,
  Clock3,
  QrCode,
  ScanLine,
  UserCheck,
  UserMinus,
  UsersRound,
} from "lucide-react";

import type {
  AttendanceSummary,
} from "../types/municipalAttendance";

type AttendanceSummaryCardsProps = {
  summary: AttendanceSummary;
};

const attendanceCards = [
  {
    key: "total",
    label: "Registered",
    description: "Total participants",
    icon: UsersRound,
    iconClass:
      "bg-slate-100 text-slate-700 ring-slate-200",
    valueClass: "text-slate-950",
  },
  {
    key: "present",
    label: "Present",
    description: "Checked in on time",
    icon: UserCheck,
    iconClass:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    valueClass: "text-emerald-700",
  },
  {
    key: "late",
    label: "Late",
    description: "Late arrivals",
    icon: Clock3,
    iconClass:
      "bg-amber-50 text-amber-700 ring-amber-200",
    valueClass: "text-amber-700",
  },
  {
    key: "absent",
    label: "Absent",
    description: "Did not attend",
    icon: UserMinus,
    iconClass:
      "bg-red-50 text-red-700 ring-red-200",
    valueClass: "text-red-700",
  },
  {
    key: "pending",
    label: "Pending",
    description: "Awaiting attendance",
    icon: CircleDashed,
    iconClass:
      "bg-slate-100 text-slate-600 ring-slate-200",
    valueClass: "text-slate-700",
  },
] as const;

const checkInCards = [
  {
    key: "qrCheckIns",
    label: "QR Check-ins",
    description:
      "Attendance recorded through QR scanning",
    icon: QrCode,
    iconClass:
      "bg-blue-50 text-blue-700 ring-blue-200",
    valueClass: "text-blue-700",
  },
  {
    key: "manualCheckIns",
    label: "Manual Check-ins",
    description:
      "Attendance recorded manually by event staff",
    icon: ScanLine,
    iconClass:
      "bg-violet-50 text-violet-700 ring-violet-200",
    valueClass: "text-violet-700",
  },
] as const;

export default function AttendanceSummaryCards({
  summary,
}: AttendanceSummaryCardsProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Attendance status */}
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h2 className="text-base font-bold text-slate-900">
          Attendance Overview
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Summary of participant attendance
          based on the current filters.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-200 lg:grid-cols-5">
        {attendanceCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.key}
              className="min-w-0 bg-white p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${card.iconClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <p
                  className={`text-2xl font-bold tracking-tight ${card.valueClass}`}
                >
                  {summary[card.key]}
                </p>
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                {card.label}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                {card.description}
              </p>
            </article>
          );
        })}
      </div>

      {/* Check-in method */}
      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          Check-in Methods
        </p>
      </div>

      <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
        {checkInCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.key}
              className="flex min-w-0 items-center gap-4 bg-white p-4 sm:p-5"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${card.iconClass}`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                  {card.label}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {card.description}
                </p>
              </div>

              <p
                className={`shrink-0 text-2xl font-bold tracking-tight ${card.valueClass}`}
              >
                {summary[card.key]}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}