import {
  CircleDashed,
  ClipboardList,
  Clock3,
  Keyboard,
  LoaderCircle,
  QrCode,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";

import type { AttendanceRecord } from "../types";
import { formatDateTime } from "../utils";

type AttendanceRecordsTableProps = {
  records: AttendanceRecord[];
  loading: boolean;
};

export default function AttendanceRecordsTable({
  records,
  loading,
}: AttendanceRecordsTableProps) {
  return (
    <section
      aria-label="Recent attendance records"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Records summary */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Selected Event Records
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              Attendance entries are limited to the currently selected event.
            </p>
          </div>
        </div>

        {!loading && (
          <div className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            {records.length} {records.length === 1 ? "record" : "records"}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : records.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-6 py-4">
                    Participant
                  </th>

                  <th scope="col" className="px-4 py-4">
                    Status
                  </th>

                  <th scope="col" className="px-4 py-4">
                    Method
                  </th>

                  <th scope="col" className="px-4 py-4">
                    Checked In
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr
                    key={String(record.id)}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-4">
                      <ParticipantIdentifier
                        userId={record.user_id}
                        name={record.participant_name}
                        email={record.participant_email}
                      />
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={record.status} />
                    </td>

                    <td className="px-4 py-4">
                      <MethodBadge method={record.method} />
                    </td>

                    <td className="px-4 py-4">
                      <CheckedInTime value={record.checked_in_at} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {records.map((record) => (
              <article
                key={String(record.id)}
                className="space-y-4 px-5 py-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <ParticipantIdentifier
                    userId={record.user_id}
                    name={record.participant_name}
                    email={record.participant_email}
                  />
                  <StatusBadge status={record.status} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <RecordDetail label="Method">
                    <MethodBadge method={record.method} />
                  </RecordDetail>

                  <RecordDetail label="Checked In">
                    <CheckedInTime
                      value={record.checked_in_at}
                      compact
                    />
                  </RecordDetail>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Loading attendance records...
      </div>

      <div className="mt-5 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="grid animate-pulse gap-3 rounded-xl border border-slate-100 p-4 sm:grid-cols-4"
          >
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-100" />
            <div className="h-4 rounded bg-slate-100" />
            <div className="h-4 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <ClipboardList className="h-7 w-7" aria-hidden="true" />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-800">
        No attendance records yet
      </p>

      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        Successful QR scans and manual attendance entries for the selected
        event will appear here.
      </p>
    </div>
  );
}

type ParticipantIdentifierProps = {
  userId: AttendanceRecord["user_id"];
  name?: string | null;
  email?: string | null;
};

function ParticipantIdentifier({
  userId,
  name,
  email,
}: ParticipantIdentifierProps) {
  const fullUserId = String(userId);

  const shortenedUserId =
    fullUserId.length > 18
      ? `${fullUserId.slice(0, 8)}…${fullUserId.slice(-6)}`
      : fullUserId;

  const participantName =
    name?.trim() || "Participant";

  const participantEmail =
    email?.trim() || null;

  const initials = participantName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
        {initials || "P"}
      </div>

      <div className="min-w-0">
        <p
          title={participantName}
          className="truncate text-sm font-semibold text-slate-900"
        >
          {participantName}
        </p>

        {participantEmail ? (
          <p
            title={participantEmail}
            className="mt-0.5 max-w-[260px] truncate text-xs text-slate-500"
          >
            {participantEmail}
          </p>
        ) : (
          <p
            title={fullUserId}
            className="mt-0.5 max-w-[240px] truncate font-mono text-xs text-slate-400"
          >
            {shortenedUserId}
          </p>
        )}
      </div>
    </div>
  );
}

type StatusBadgeProps = {
  status: AttendanceRecord["status"];
};

function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = String(status || "pending").toLowerCase();

  const statusConfig: Record<
    string,
    {
      label: string;
      icon: LucideIcon;
      className: string;
    }
  > = {
    present: {
      label: "Present",
      icon: UserCheck,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    absent: {
      label: "Absent",
      icon: UserX,
      className: "border-rose-200 bg-rose-50 text-rose-700",
    },
    pending: {
      label: "Pending",
      icon: CircleDashed,
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    },
  };

  const config =
    statusConfig[normalizedStatus] ?? {
      label: normalizedStatus || "Unknown",
      icon: CircleDashed,
      className:
        "border-slate-200 bg-slate-50 text-slate-600",
    };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

type MethodBadgeProps = {
  method: AttendanceRecord["method"];
};

function MethodBadge({ method }: MethodBadgeProps) {
  const normalizedMethod = String(method || "").toLowerCase();

  if (normalizedMethod === "qr") {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
        <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
        QR Scan
      </span>
    );
  }

  if (normalizedMethod === "manual") {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700">
        <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
        Manual
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
      <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
      Not set
    </span>
  );
}

type CheckedInTimeProps = {
  value: AttendanceRecord["checked_in_at"];
  compact?: boolean;
};

function CheckedInTime({
  value,
  compact = false,
}: CheckedInTimeProps) {
  if (!value) {
    return (
      <span className="text-xs font-medium text-slate-400">
        Not checked in
      </span>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

      <span
        className={
          compact
            ? "text-xs leading-5 text-slate-600"
            : "text-sm text-slate-600"
        }
      >
        {formatDateTime(value)}
      </span>
    </div>
  );
}

type RecordDetailProps = {
  label: string;
  children: React.ReactNode;
};

function RecordDetail({
  label,
  children,
}: RecordDetailProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      {children}
    </div>
  );
}