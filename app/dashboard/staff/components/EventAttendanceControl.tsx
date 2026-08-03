import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Play,
  RefreshCw,
  Square,
  XCircle,
} from "lucide-react";
import EventAssignmentPicker from "./EventAssignmentPicker";

import type { EventAssignment } from "../types";
import { formatDateTime } from "../utils";

type EventAttendanceControlProps = {
  assignments: EventAssignment[];
  selectedId: string;
  selectedAssignment: EventAssignment | null;
  loading: boolean;
  controlLoading: "open" | "close" | null;
  earliestOpeningTime: number | null;
  isCheckInOpen: boolean;
  wasCheckInOpened: boolean;
  wasCheckInClosed: boolean;
  canOpenCheckIn: boolean;
  canUseAttendanceTools: boolean;
  blockedMessage: string;
  onSelect: (id: string) => Promise<void>;
  onOpen: () => Promise<void>;
  onClose: () => Promise<void>;
  onRefresh: () => Promise<void>;
};

export default function EventAttendanceControl({
  assignments,
  selectedId,
  selectedAssignment,
  loading,
  controlLoading,
  earliestOpeningTime,
  isCheckInOpen,
  wasCheckInOpened,
  wasCheckInClosed,
  canOpenCheckIn,
  canUseAttendanceTools,
  blockedMessage,
  onSelect,
  onOpen,
  onClose,
  onRefresh,
}: EventAttendanceControlProps) {
  
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Event selector */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 sm:px-6">
        {loading ? (
          <div className="flex min-h-14 items-center gap-3 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading assigned events...
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-slate-400" />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No assigned events
            </p>

            <p className="mt-1 text-sm text-slate-500">
              No provincial event is currently assigned to your municipality.
            </p>
          </div>
        ) : (
          <EventAssignmentPicker
            assignments={assignments}
            selectedId={selectedId}
            selectedAssignment={selectedAssignment}
            disabled={Boolean(controlLoading)}
            onSelect={onSelect}
          />
        )}
      </div>

      {!loading && assignments.length > 0 && selectedAssignment && (
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          {/* Event schedule and status */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              icon={CheckCircle2}
              label="Event Status"
              value={selectedAssignment.event.status || "Unknown"}
              capitalize
            />

            <InfoCard
              icon={CalendarClock}
              label="Event Starts"
              value={formatDateTime(selectedAssignment.event.start_at)}
            />

            <InfoCard
              icon={Clock3}
              label="Check-in Available From"
              value={
                earliestOpeningTime !== null
                  ? formatDateTime(
                    new Date(earliestOpeningTime).toISOString()
                  )
                  : "Not set"
              }
            />

            <InfoCard
              icon={Clock3}
              label="Event Ends"
              value={formatDateTime(selectedAssignment.event.end_at)}
            />
          </div>

          {/* Attendance state messages */}
          <div className="mt-5 space-y-3">
            {!canUseAttendanceTools && (
              <StatusMessage
                icon={LockKeyhole}
                className="border-amber-200 bg-amber-50 text-amber-900"
                iconClassName="text-amber-600"
                title="Attendance tools unavailable"
              >
                {blockedMessage}
              </StatusMessage>
            )}

            {isCheckInOpen && (
              <StatusMessage
                icon={CheckCircle2}
                className="border-emerald-200 bg-emerald-50 text-emerald-900"
                iconClassName="text-emerald-600"
                title="Attendance check-in is active"
              >
                Attendance was opened at{" "}
                <span className="font-semibold">
                  {formatDateTime(selectedAssignment.check_in_opened_at)}
                </span>
                . QR scanning and manual token entry are currently enabled.
                Check-in will remain available until staff closes it or the
                event reaches its end time.
              </StatusMessage>
            )}

            {!isCheckInOpen && wasCheckInClosed && (
              <StatusMessage
                icon={XCircle}
                className="border-rose-200 bg-rose-50 text-rose-900"
                iconClassName="text-rose-600"
                title="Attendance check-in has ended"
              >
                Attendance was closed at{" "}
                <span className="font-semibold">
                  {formatDateTime(selectedAssignment.check_in_closed_at)}
                </span>
                . QR scanning and manual token entry are currently disabled.
              </StatusMessage>
            )}
          </div>

          {/* Attendance actions */}
          <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Check-in Controls
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Open check-in to enable QR scanning and manual token entry for
                this event.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {!isCheckInOpen && (
                <button
                  type="button"
                  onClick={() => void onOpen()}
                  disabled={!canOpenCheckIn || Boolean(controlLoading)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {controlLoading === "open" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}

                  {controlLoading === "open"
                    ? "Opening..."
                    : wasCheckInOpened
                      ? "Reopen Check-in"
                      : "Open Check-in"}
                </button>
              )}

              {isCheckInOpen && (
                <button
                  type="button"
                  onClick={() => void onClose()}
                  disabled={Boolean(controlLoading)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {controlLoading === "close" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}

                  {controlLoading === "close"
                    ? "Closing..."
                    : "Close Check-in"}
                </button>
              )}

              <button
                type="button"
                onClick={() => void onRefresh()}
                disabled={Boolean(controlLoading)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${controlLoading ? "animate-spin" : ""
                    }`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

type InfoCardProps = {
  icon: typeof Clock3;
  label: string;
  value: string;
  capitalize?: boolean;
};

function InfoCard({
  icon: Icon,
  label,
  value,
  capitalize = false,
}: InfoCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4 shrink-0" />

        <p className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </p>
      </div>

      <p
        className={`mt-3 break-words text-sm font-semibold leading-5 text-slate-900 ${capitalize ? "capitalize" : ""
          }`}
      >
        {value}
      </p>
    </div>
  );
}

type StatusMessageProps = {
  icon: typeof Clock3;
  title: string;
  className: string;
  iconClassName: string;
  children: React.ReactNode;
};

function StatusMessage({
  icon: Icon,
  title,
  className,
  iconClassName,
  children,
}: StatusMessageProps) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClassName}`} />

        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6">{children}</p>
        </div>
      </div>
    </div>
  );
}