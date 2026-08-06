import {
  CalendarDays,
  CircleDashed,
  QrCode,
  ScanLine,
  UserCheck,
  UserMinus,
  UsersRound,
} from "lucide-react";

import type {
  MunicipalReportSummary,
} from "../types/municipalReports";

type ReportSummaryCardsProps = {
  summary: MunicipalReportSummary;
};

const cards = [
  {
    key: "assignedEvents",
    label: "Assigned Events",
    icon: CalendarDays,
    iconClass:
      "bg-slate-100 text-slate-700 ring-slate-200",
    valueClass:
      "text-slate-950",
  },
  {
    key: "totalRegistrations",
    label: "Registrations",
    icon: UsersRound,
    iconClass:
      "bg-blue-50 text-blue-700 ring-blue-200",
    valueClass:
      "text-blue-700",
  },
  {
    key: "attendedCount",
    label: "Attended",
    icon: UserCheck,
    iconClass:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    valueClass:
      "text-emerald-700",
  },
  {
    key: "absentCount",
    label: "Absent",
    icon: UserMinus,
    iconClass:
      "bg-red-50 text-red-700 ring-red-200",
    valueClass:
      "text-red-700",
  },
  {
    key: "pendingCount",
    label: "Pending",
    icon: CircleDashed,
    iconClass:
      "bg-amber-50 text-amber-700 ring-amber-200",
    valueClass:
      "text-amber-700",
  },
  {
    key: "qrCheckInCount",
    label: "QR Check-ins",
    icon: QrCode,
    iconClass:
      "bg-cyan-50 text-cyan-700 ring-cyan-200",
    valueClass:
      "text-cyan-700",
  },
  {
    key: "manualCheckInCount",
    label: "Manual",
    icon: ScanLine,
    iconClass:
      "bg-violet-50 text-violet-700 ring-violet-200",
    valueClass:
      "text-violet-700",
  },
] as const;

export default function ReportSummaryCards({
  summary,
}: ReportSummaryCardsProps) {
  const hasEligibleRegistrations =
    summary.attendanceEligibleRegistrations >
    0;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-bold text-slate-900">
            Report Summary
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Totals reflect the current
            report filters.
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-right ring-1 ring-inset ring-emerald-200">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
            Attendance Rate
          </p>

          <p className="mt-0.5 text-xl font-bold text-emerald-700">
            {hasEligibleRegistrations
              ? `${summary.attendanceRate.toFixed(
                1,
              )}%`
              : "N/A"}
          </p>

          <p className="mt-1 text-[11px] font-medium text-emerald-700/80">
            {hasEligibleRegistrations
              ? `${summary.attendanceEligibleRegistrations} eligible registrations`
              : "No ongoing or completed events"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.key}
              className="min-w-0 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${card.iconClass}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <p
                  className={`text-xl font-bold ${card.valueClass}`}
                >
                  {summary[card.key]}
                </p>
              </div>

              <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {card.label}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
