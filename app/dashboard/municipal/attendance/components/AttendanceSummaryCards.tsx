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

const cards = [
  {
    key: "total",
    label: "Registered",
    icon: UsersRound,
    valueClass: "text-slate-900",
  },
  {
    key: "present",
    label: "Present",
    icon: UserCheck,
    valueClass: "text-emerald-700",
  },
  {
    key: "late",
    label: "Late",
    icon: Clock3,
    valueClass: "text-amber-700",
  },
  {
    key: "absent",
    label: "Absent",
    icon: UserMinus,
    valueClass: "text-red-700",
  },
  {
    key: "pending",
    label: "Pending",
    icon: CircleDashed,
    valueClass: "text-slate-700",
  },
  {
    key: "qrCheckIns",
    label: "QR Check-ins",
    icon: QrCode,
    valueClass: "text-blue-700",
  },
  {
    key: "manualCheckIns",
    label: "Manual Check-ins",
    icon: ScanLine,
    valueClass: "text-violet-700",
  },
] as const;

export default function AttendanceSummaryCards({
  summary,
}: AttendanceSummaryCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.key}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon className="h-4 w-4" />
              </div>

              <p
                className={`text-2xl font-bold ${card.valueClass}`}
              >
                {summary[card.key]}
              </p>
            </div>

            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              {card.label}
            </p>
          </article>
        );
      })}
    </section>
  );
}
