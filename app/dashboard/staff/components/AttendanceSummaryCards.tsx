import {
  CalendarDays,
  CircleDashed,
  ClipboardList,
  Percent,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";

type AttendanceSummaryCardsProps = {
  totalRecords: number;
  totalPresent: number;
  totalPending: number;
  totalAbsent: number;
  attendanceRate: number;
  selectedEventTitle: string | null;
};

export default function AttendanceSummaryCards({
  totalRecords,
  totalPresent,
  totalPending,
  totalAbsent,
  attendanceRate,
  selectedEventTitle,
}: AttendanceSummaryCardsProps) {
  return (
    <section
      aria-label="Attendance summary"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <SummaryCard
        icon={ClipboardList}
        label="Total Records"
        value={String(totalRecords)}
        description="Attendance records for this event"
        iconClassName="bg-slate-100 text-slate-700"
      />

      <SummaryCard
        icon={UserCheck}
        label="Present"
        value={String(totalPresent)}
        description="Participants successfully checked in"
        iconClassName="bg-emerald-100 text-emerald-700"
      />

      <SummaryCard
        icon={CircleDashed}
        label="Pending"
        value={String(totalPending)}
        description="Participants awaiting attendance"
        iconClassName="bg-amber-100 text-amber-700"
      />

      <SummaryCard
        icon={UserX}
        label="Absent"
        value={String(totalAbsent)}
        description="Participants marked as absent"
        iconClassName="bg-rose-100 text-rose-700"
      />

      <SummaryCard
        icon={Percent}
        label="Attendance Rate"
        value={`${attendanceRate}%`}
        description={
          totalRecords > 0
            ? `${totalPresent} of ${totalRecords} records are present`
            : "No attendance records available"
        }
        iconClassName="bg-violet-100 text-violet-700"
      />

      <SummaryCard
        icon={CalendarDays}
        label="Selected Event"
        value={
          selectedEventTitle ||
          "No event selected"
        }
        description={
          selectedEventTitle
            ? "Currently viewing attendance"
            : "Select an assigned event"
        }
        iconClassName="bg-blue-100 text-blue-700"
        compact
      />
    </section>
  );
}

type SummaryCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
  iconClassName: string;
  compact?: boolean;
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
  iconClassName,
  compact = false,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p
            title={compact ? value : undefined}
            className={`mt-2 font-bold tracking-tight text-slate-900 ${
              compact
                ? "line-clamp-2 min-h-12 text-base leading-6 sm:text-lg"
                : "text-3xl"
            }`}
          >
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
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
    </article>
  );
}