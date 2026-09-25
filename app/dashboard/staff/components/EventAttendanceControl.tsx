import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  DoorOpen,
  LockKeyhole,
  LogIn,
  LogOut,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  type LucideIcon,
} from "lucide-react";

import EventAssignmentPicker from "./EventAssignmentPicker";

import type { EventAssignment } from "../types";
import { formatDateTime } from "../utils";

type EventAttendanceControlProps = {
  assignments: EventAssignment[];

  selectedId: string;

  selectedAssignment: EventAssignment | null;

  loading: boolean;

  /*
   * Check-In controls
   */
  controlLoading: "open" | "close" | null;

  isCheckInOpen: boolean;
  wasCheckInOpened: boolean;
  wasCheckInClosed: boolean;

  canOpenCheckIn: boolean;

  checkInBlockedMessage: string;

  /*
   * Check-Out controls
   */
  checkOutControlLoading: "open" | "close" | null;

  isCheckOutOpen: boolean;
  wasCheckOutOpened: boolean;
  wasCheckOutClosed: boolean;

  canOpenCheckOut: boolean;
  canCloseCheckOut: boolean;

  checkOutBlockedMessage: string;

  /*
   * Actions
   */
  onSelect: (id: string) => Promise<void>;

  onOpenCheckIn: () => Promise<void>;

  onCloseCheckIn: () => Promise<void>;

  onOpenCheckOut: () => Promise<void>;

  onCloseCheckOut: () => Promise<void>;

  onRefresh: () => Promise<void>;
};

export default function EventAttendanceControl({
  assignments,
  selectedId,
  selectedAssignment,
  loading,

  controlLoading,

  isCheckInOpen,
  wasCheckInOpened,
  wasCheckInClosed,
  canOpenCheckIn,
  checkInBlockedMessage,

  checkOutControlLoading,

  isCheckOutOpen,
  wasCheckOutOpened,
  wasCheckOutClosed,

  canOpenCheckOut,
  canCloseCheckOut,

  checkOutBlockedMessage,

  onSelect,

  onOpenCheckIn,
  onCloseCheckIn,

  onOpenCheckOut,
  onCloseCheckOut,

  onRefresh,
}: EventAttendanceControlProps) {
  const controlsBusy =
    Boolean(controlLoading) || Boolean(checkOutControlLoading);

  /*
   * Under the final attendance rules, only an ACTIVE
   * Check-Out session should block Check-In before event end.
   *
   * Historical closed Check-Out timestamps from older tests
   * must not prevent late-participant Check-In from reopening.
   */
  const checkOutHasStarted = isCheckOutOpen;

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
            disabled={controlsBusy}
            onSelect={onSelect}
          />
        )}
      </div>

      {!loading && assignments.length > 0 && selectedAssignment && (
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          {/* Event information */}
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
              label="Check-In Control"
              value="Opened by Event Staff"
            />

            <InfoCard
              icon={Clock3}
              label="Event Ends"
              value={formatDateTime(selectedAssignment.event.end_at)}
            />
          </div>

          {/* Attendance workflow */}
          <div className="mt-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Attendance Workflow
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Staff controls participant Time In and Time Out. Check-In may be
                reopened for late participants until the scheduled event end
                time. Check-Out becomes available only after the event ends.
              </p>
            </div>

            <AttendanceWorkflow
              assignment={selectedAssignment}
              isCheckInOpen={isCheckInOpen}
              wasCheckInClosed={wasCheckInClosed}
              isCheckOutOpen={isCheckOutOpen}
              wasCheckOutOpened={wasCheckOutOpened}
              wasCheckOutClosed={wasCheckOutClosed}
              canOpenCheckIn={canOpenCheckIn}
              canOpenCheckOut={canOpenCheckOut}
            />
          </div>

          {/* Controls */}
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {/* CHECK-IN */}
            <section className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-emerald-50/60 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <LogIn className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">
                      Check-In Control
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Controls participant Time In.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <CheckInStatus
                  assignment={selectedAssignment}
                  isOpen={isCheckInOpen}
                  wasOpened={wasCheckInOpened}
                  wasClosed={wasCheckInClosed}
                  canOpen={canOpenCheckIn}
                  checkOutHasStarted={checkOutHasStarted}
                  blockedMessage={checkInBlockedMessage}
                />

                <div className="flex flex-col gap-2 sm:flex-row">
                  {/* Open / Reopen Check-In */}
                  {!isCheckInOpen && canOpenCheckIn && (
                    <button
                      type="button"
                      onClick={() => void onOpenCheckIn()}
                      disabled={controlsBusy}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {controlLoading === "open" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : wasCheckInClosed ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}

                      {controlLoading === "open"
                        ? wasCheckInClosed
                          ? "Reopening..."
                          : "Opening..."
                        : wasCheckInClosed
                          ? "Reopen Check-In"
                          : "Open Check-In"}
                    </button>
                  )}

                  {/* Close Check-In */}
                  {isCheckInOpen && (
                    <button
                      type="button"
                      onClick={() => void onCloseCheckIn()}
                      disabled={controlsBusy}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {controlLoading === "close" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}

                      {controlLoading === "close"
                        ? "Closing..."
                        : "Close Check-In"}
                    </button>
                  )}

                  {/* Locked when Check-In can no longer be opened */}
                  {!isCheckInOpen && !canOpenCheckIn && (
                    <div className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-500">
                      <LockKeyhole className="h-4 w-4" />
                      Check-In Locked
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* CHECK-OUT */}
            <section className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-blue-50/60 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <LogOut className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">
                      Check-Out Control
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Controls participant Time Out.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <CheckOutStatus
                  assignment={selectedAssignment}
                  isOpen={isCheckOutOpen}
                  wasOpened={wasCheckOutOpened}
                  wasClosed={wasCheckOutClosed}
                  canOpen={canOpenCheckOut}
                  blockedMessage={checkOutBlockedMessage}
                />

                <div className="flex flex-col gap-2 sm:flex-row">
                  {!isCheckOutOpen && (
                    <button
                      type="button"
                      onClick={() => void onOpenCheckOut()}
                      disabled={!canOpenCheckOut || controlsBusy}
                      className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed ${
                        canOpenCheckOut
                          ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-100 disabled:opacity-50"
                          : "border border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {checkOutControlLoading === "open" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : !canOpenCheckOut ? (
                        <LockKeyhole className="h-4 w-4" />
                      ) : wasCheckOutClosed ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <DoorOpen className="h-4 w-4" />
                      )}

                      {checkOutControlLoading === "open"
                        ? wasCheckOutClosed
                          ? "Reopening..."
                          : "Opening..."
                        : !canOpenCheckOut
                          ? "Check-Out Not Available Yet"
                          : wasCheckOutClosed
                            ? "Reopen Check-Out"
                            : "Open Check-Out"}
                    </button>
                  )}

                  {isCheckOutOpen && (
                    <button
                      type="button"
                      onClick={() => void onCloseCheckOut()}
                      disabled={!canCloseCheckOut || controlsBusy}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {checkOutControlLoading === "close" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}

                      {checkOutControlLoading === "close"
                        ? "Closing..."
                        : "Close Check-Out"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Refresh */}
          <div className="mt-5 flex justify-end border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={controlsBusy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${controlsBusy ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/*
 * =========================================================
 * ATTENDANCE WORKFLOW
 * =========================================================
 */

type AttendanceWorkflowProps = {
  assignment: EventAssignment;

  isCheckInOpen: boolean;

  wasCheckInClosed: boolean;

  isCheckOutOpen: boolean;

  wasCheckOutOpened: boolean;

  wasCheckOutClosed: boolean;

  canOpenCheckIn: boolean;

  canOpenCheckOut: boolean;
};

function AttendanceWorkflow({
  assignment,
  isCheckInOpen,
  wasCheckInClosed,
  isCheckOutOpen,
  wasCheckOutOpened,
  wasCheckOutClosed,
  canOpenCheckIn,
  canOpenCheckOut,
}: AttendanceWorkflowProps) {
  const eventEndTime = assignment.event.end_at
    ? new Date(assignment.event.end_at).getTime()
    : null;

  const checkOutClosedTime = assignment.check_out_closed_at
    ? new Date(assignment.check_out_closed_at).getTime()
    : null;

  const hasValidEventEnd = eventEndTime !== null && !Number.isNaN(eventEndTime);

  const eventHasEnded = hasValidEventEnd && Date.now() >= eventEndTime;

  /*
   * A legacy Check-Out close recorded before the scheduled
   * event end must not make the workflow look completed.
   *
   * A valid completed Check-Out session must have been
   * closed at or after the scheduled event end.
   */
  const validCheckOutCompletion = Boolean(
    eventHasEnded &&
    wasCheckOutClosed &&
    checkOutClosedTime !== null &&
    !Number.isNaN(checkOutClosedTime) &&
    eventEndTime !== null &&
    checkOutClosedTime >= eventEndTime,
  );

  /*
   * Check-In is considered complete for the workflow only
   * after the event has ended and the Check-In session had
   * already been closed.
   *
   * While the event is still ongoing, a closed Check-In is
   * shown as reopenable for late participants.
   */
  const checkInComplete = Boolean(eventHasEnded && wasCheckInClosed);

  let checkInDescription = "Waiting";

  if (isCheckInOpen && !eventHasEnded) {
    checkInDescription = "Open";
  } else if (checkInComplete) {
    checkInDescription = "Completed";
  } else if (wasCheckInClosed && canOpenCheckIn) {
    checkInDescription = "Closed • Can reopen";
  } else if (wasCheckInClosed) {
    checkInDescription = "Closed";
  }

  let checkOutDescription = "Waiting for Check-In";

  /*
   * Before the scheduled event end, Check-Out must never
   * appear Ready or Completed even if legacy timestamps are
   * present from an older test.
   */
  if (!eventHasEnded) {
    checkOutDescription = "Available after event ends";
  } else if (isCheckOutOpen) {
    checkOutDescription = "Open";
  } else if (validCheckOutCompletion) {
    checkOutDescription = "Completed";
  } else if (canOpenCheckOut) {
    checkOutDescription = wasCheckOutOpened ? "Ready to reopen" : "Ready";
  } else if (wasCheckInClosed) {
    checkOutDescription = "Waiting to open";
  }

  const attendanceComplete = validCheckOutCompletion;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <WorkflowStep
        number="1"
        title="Check-In"
        description={checkInDescription}
        active={isCheckInOpen && !eventHasEnded}
        complete={checkInComplete}
      />

      <WorkflowStep
        number="2"
        title="Check-Out"
        description={checkOutDescription}
        active={isCheckOutOpen && eventHasEnded}
        complete={validCheckOutCompletion}
      />

      <WorkflowStep
        number="3"
        title="Attendance Complete"
        description={attendanceComplete ? "Session finished" : "Waiting"}
        active={false}
        complete={attendanceComplete}
      />
    </div>
  );
}

type WorkflowStepProps = {
  number: string;

  title: string;

  description: string;

  active: boolean;

  complete: boolean;
};

function WorkflowStep({
  number,
  title,
  description,
  active,
  complete,
}: WorkflowStepProps) {
  const styles = complete
    ? "border-emerald-200 bg-emerald-50"
    : active
      ? "border-blue-200 bg-blue-50"
      : "border-slate-200 bg-slate-50";

  const numberStyles = complete
    ? "bg-emerald-600 text-white"
    : active
      ? "bg-blue-600 text-white"
      : "bg-slate-200 text-slate-600";

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${numberStyles}`}
        >
          {complete ? <CheckCircle2 className="h-4 w-4" /> : number}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>

          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

/*
 * =========================================================
 * CHECK-IN STATUS
 * =========================================================
 */

type CheckInStatusProps = {
  assignment: EventAssignment;

  isOpen: boolean;

  wasOpened: boolean;

  wasClosed: boolean;

  canOpen: boolean;

  checkOutHasStarted: boolean;

  blockedMessage: string;
};

function CheckInStatus({
  assignment,
  isOpen,
  wasOpened,
  wasClosed,
  canOpen,
  checkOutHasStarted,
  blockedMessage,
}: CheckInStatusProps) {
  if (isOpen) {
    return (
      <StatusMessage
        icon={CheckCircle2}
        className="border-emerald-200 bg-emerald-50 text-emerald-900"
        iconClassName="text-emerald-600"
        title="Check-In is open"
      >
        Time In started at{" "}
        <span className="font-semibold">
          {formatDateTime(assignment.check_in_opened_at)}
        </span>
        . QR scanning and manual attendance codes can record participant Time
        In.
      </StatusMessage>
    );
  }

  /*
   * When Check-In can no longer be opened, show the exact
   * blocking reason supplied by the dashboard hook.
   *
   * This covers:
   * - event end reached
   * - completed/cancelled/draft event
   * - an actively open Check-Out session
   */
  if (!canOpen) {
    return (
      <StatusMessage
        icon={LockKeyhole}
        className="border-slate-200 bg-slate-50 text-slate-700"
        iconClassName="text-slate-500"
        title="Check-In is locked"
      >
        {checkOutHasStarted
          ? "Check-Out is currently active. Close Check-Out before attempting to reopen Check-In."
          : blockedMessage}
      </StatusMessage>
    );
  }

  /*
   * Closed but still reopenable for late participants.
   */
  if (wasClosed) {
    return (
      <StatusMessage
        icon={RotateCcw}
        className="border-amber-200 bg-amber-50 text-amber-900"
        iconClassName="text-amber-600"
        title="Check-In is closed"
      >
        Time In was closed at{" "}
        <span className="font-semibold">
          {formatDateTime(assignment.check_in_closed_at)}
        </span>
        . Event Staff may reopen Check-In for late participants until the
        scheduled event end time.
      </StatusMessage>
    );
  }

  return (
    <StatusMessage
      icon={LockKeyhole}
      className="border-amber-200 bg-amber-50 text-amber-900"
      iconClassName="text-amber-600"
      title={wasOpened ? "Check-In unavailable" : "Check-In not opened"}
    >
      {blockedMessage}
    </StatusMessage>
  );
}

/*
 * =========================================================
 * CHECK-OUT STATUS
 * =========================================================
 */

type CheckOutStatusProps = {
  assignment: EventAssignment;

  isOpen: boolean;

  wasOpened: boolean;

  wasClosed: boolean;

  canOpen: boolean;

  blockedMessage: string;
};

function CheckOutStatus({
  assignment,
  isOpen,
  wasOpened,
  wasClosed,
  canOpen,
  blockedMessage,
}: CheckOutStatusProps) {
  const eventEndTime = assignment.event.end_at
    ? new Date(assignment.event.end_at).getTime()
    : null;

  const checkOutClosedTime = assignment.check_out_closed_at
    ? new Date(assignment.check_out_closed_at).getTime()
    : null;

  const eventHasEnded = Boolean(
    eventEndTime !== null &&
    !Number.isNaN(eventEndTime) &&
    Date.now() >= eventEndTime,
  );

  const validClosedCheckOut = Boolean(
    eventHasEnded &&
    wasClosed &&
    eventEndTime !== null &&
    checkOutClosedTime !== null &&
    !Number.isNaN(checkOutClosedTime) &&
    checkOutClosedTime >= eventEndTime,
  );

  /*
   * Before event end, legacy Check-Out timestamps must not
   * make the UI claim that Check-Out is open or completed.
   */
  if (!eventHasEnded) {
    return (
      <StatusMessage
        icon={LockKeyhole}
        className="border-amber-200 bg-amber-50 text-amber-900"
        iconClassName="text-amber-600"
        title="Check-Out not available yet"
      >
        {blockedMessage}
      </StatusMessage>
    );
  }

  if (isOpen) {
    return (
      <StatusMessage
        icon={CheckCircle2}
        className="border-blue-200 bg-blue-50 text-blue-900"
        iconClassName="text-blue-600"
        title="Check-Out is open"
      >
        Time Out started at{" "}
        <span className="font-semibold">
          {formatDateTime(assignment.check_out_opened_at)}
        </span>
        . QR scanning and manual attendance codes can now record participant
        Time Out.
      </StatusMessage>
    );
  }

  if (validClosedCheckOut) {
    return (
      <StatusMessage
        icon={RotateCcw}
        className="border-amber-200 bg-amber-50 text-amber-900"
        iconClassName="text-amber-600"
        title="Check-Out is closed"
      >
        Time Out was closed at{" "}
        <span className="font-semibold">
          {formatDateTime(assignment.check_out_closed_at)}
        </span>
        . Event Staff may reopen Check-Out to continue recording participant
        Time Out.
      </StatusMessage>
    );
  }

  if (canOpen) {
    return (
      <StatusMessage
        icon={DoorOpen}
        className="border-blue-200 bg-blue-50 text-blue-900"
        iconClassName="text-blue-600"
        title={wasOpened ? "Check-Out can be reopened" : "Check-Out is ready"}
      >
        {wasOpened
          ? "The previous Check-Out record does not represent a valid post-event completion. Event Staff may reopen Check-Out and continue recording participant Time Out."
          : "The event has ended and Check-In is closed. Event Staff may open Check-Out to begin recording participant Time Out."}
      </StatusMessage>
    );
  }

  return (
    <StatusMessage
      icon={LockKeyhole}
      className="border-amber-200 bg-amber-50 text-amber-900"
      iconClassName="text-amber-600"
      title={
        wasOpened ? "Check-Out unavailable" : "Check-Out not available yet"
      }
    >
      {blockedMessage}
    </StatusMessage>
  );
}

/*
 * =========================================================
 * INFO CARD
 * =========================================================
 */

type InfoCardProps = {
  icon: LucideIcon;

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

        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>

      <p
        className={`mt-3 break-words text-sm font-semibold leading-5 text-slate-900 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/*
 * =========================================================
 * STATUS MESSAGE
 * =========================================================
 */

type StatusMessageProps = {
  icon: LucideIcon;

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
