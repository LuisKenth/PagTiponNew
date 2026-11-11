import {
  CalendarDays,
  LockKeyhole,
  LogIn,
  LogOut,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
} from "lucide-react";

import EventAssignmentPicker from "./EventAssignmentPicker";

import type { EventAssignment } from "../types";
import { formatDateTime } from "../utils";

type EventAttendanceControlProps = {
  assignments: EventAssignment[];
  selectedId: string;
  selectedAssignment: EventAssignment | null;
  loading: boolean;

  // Time-in
  controlLoading: "open" | "close" | null;
  isCheckInOpen: boolean;
  wasCheckInOpened: boolean;
  wasCheckInClosed: boolean;
  canOpenCheckIn: boolean;
  checkInBlockedMessage: string;

  // Time-out
  checkOutControlLoading: "open" | "close" | null;
  isCheckOutOpen: boolean;
  wasCheckOutOpened: boolean;
  wasCheckOutClosed: boolean;
  canOpenCheckOut: boolean;
  canCloseCheckOut: boolean;
  checkOutBlockedMessage: string;
  isCheckOutExpired?: boolean;
  checkOutDeadlineAt?: string | null;

  // Actions
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
  isCheckOutExpired = false,
  checkOutDeadlineAt = null,

  onSelect,
  onOpenCheckIn,
  onCloseCheckIn,
  onOpenCheckOut,
  onCloseCheckOut,
  onRefresh,
}: EventAttendanceControlProps) {
  const controlsBusy =
    controlLoading !== null || checkOutControlLoading !== null;

  /*
   * TIME-IN STATUS
   *
   * The existing context determines
   * whether Time-in can be opened.
   */
  const checkInStatus = isCheckInOpen
    ? "Open"
    : canOpenCheckIn
      ? wasCheckInClosed
        ? "Can Reopen"
        : "Ready"
      : wasCheckInClosed
        ? "Closed"
        : "Unavailable";

  const checkInDescription = isCheckInOpen
    ? "Time-in is active. Participants can be completed Time-in."
    : canOpenCheckIn
      ? wasCheckInClosed
        ? "Time-in is closed. You may reopen it for late participants."
        : "Ready to start recording participant Time-in."
      : isCheckOutOpen
        ? "Time-out is active. Time-in cannot be reopened."
        : checkInBlockedMessage || "Time-in is currently unavailable.";

  /*
   * TIME-OUT STATUS
   *
   * The existing context enforces
   * availability after event end.
   *
   * Historical Time-out timestamps
   * do not automatically mean that
   * the session is completed.
   */
  const checkOutStatus = isCheckOutExpired
    ? wasCheckOutOpened
      ? "Closed"
      : "Expired"
    : isCheckOutOpen
      ? "Open"
      : canOpenCheckOut
        ? wasCheckOutClosed
          ? "Can Reopen"
          : "Ready"
        : wasCheckOutClosed
          ? "Closed"
          : "Unavailable";

  const checkOutDescription = isCheckOutExpired
    ? wasCheckOutOpened
      ? `The Time-out deadline${checkOutDeadlineAt ? ` (${formatDateTime(checkOutDeadlineAt)})` : ""} has passed. The session is closed and new Time-out records are blocked.`
      : `The Time-out window${checkOutDeadlineAt ? ` (deadline: ${formatDateTime(checkOutDeadlineAt)})` : ""} has expired. New Time-out records are blocked.`
    : isCheckOutOpen
      ? canCloseCheckOut
        ? "Time-out is active. Participants can be completed Time-out."
        : "Time-out is active. Closing is currently restricted."
      : canOpenCheckOut
        ? wasCheckOutOpened
          ? "You may reopen Time-out to continue recording Time-out."
          : "The event has ended. You may now open Time-out."
        : checkOutBlockedMessage || "Time-out is not available yet.";

  const checkInBadgeClass = isCheckInOpen
    ? "bg-emerald-100 text-emerald-700"
    : wasCheckInClosed && !canOpenCheckIn
      ? "bg-slate-100 text-slate-600"
      : canOpenCheckIn
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";

  const checkOutBadgeClass = isCheckOutExpired
    ? "bg-slate-100 text-slate-600"
    : isCheckOutOpen
      ? "bg-blue-100 text-blue-700"
      : canOpenCheckOut
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* SELECT EVENT */}
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Select Assigned Event
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Choose the event you want to manage.
          </p>
        </div>

        {loading ? (
          <div
            role="status"
            className="flex items-center gap-2 py-5 text-sm text-slate-500"
          >
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading assigned events...
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-slate-400" />

            <h3 className="mt-3 font-semibold text-slate-900">
              No assigned events
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              No events are currently assigned to your Event Staff account.
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

      {/* EVENT DETAILS AND CONTROLS */}
      {!loading && assignments.length > 0 && selectedAssignment && (
        <div className="space-y-4 p-4 sm:p-6">
          {/* A compact schedule strip keeps scanner controls close to the event picker. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-2">
              <CalendarDays
                className="h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <span>
                Event: {formatDateTime(selectedAssignment.event.start_at)} –{" "}
                {formatDateTime(selectedAssignment.event.end_at)}
              </span>
            </span>
            {checkOutDeadlineAt && (
              <span className="inline-flex items-center gap-2">
                <LockKeyhole
                  className="h-4 w-4 text-slate-500"
                  aria-hidden="true"
                />
                Time-out deadline: {formatDateTime(checkOutDeadlineAt)}
              </span>
            )}
          </div>

          {/* SESSION CONTROLS */}
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Attendance Sessions
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Manage participant Time-in and Time-out.
            </p>

            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {/* TIME-IN CARD */}
              <section className="flex flex-col rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <LogIn className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">Time-in</h4>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Participant Time-in
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${checkInBadgeClass}`}
                  >
                    {checkInStatus}
                  </span>
                </div>

                <p
                  aria-live="polite"
                  className="mt-4 min-h-12 text-sm leading-6 text-slate-600"
                >
                  {checkInDescription}
                </p>

                {isCheckInOpen && selectedAssignment.check_in_opened_at && (
                  <p className="mb-3 text-xs text-slate-500">
                    Opened:{" "}
                    {formatDateTime(selectedAssignment.check_in_opened_at)}
                  </p>
                )}

                <div className="mt-auto pt-3">
                  {isCheckInOpen ? (
                    <button
                      type="button"
                      onClick={() => void onCloseCheckIn()}
                      disabled={controlsBusy}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {controlLoading === "close" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}

                      {controlLoading === "close"
                        ? "Closing..."
                        : "Close Time-in"}
                    </button>
                  ) : canOpenCheckIn ? (
                    <button
                      type="button"
                      onClick={() => void onOpenCheckIn()}
                      disabled={controlsBusy}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {controlLoading === "open" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : wasCheckInClosed ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}

                      {controlLoading === "open"
                        ? "Opening..."
                        : wasCheckInClosed
                          ? "Reopen Time-in"
                          : "Open Time-in"}
                    </button>
                  ) : (
                    <div className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500">
                      <LockKeyhole className="h-4 w-4" />
                      Time-in Unavailable
                    </div>
                  )}
                </div>
              </section>

              {/* TIME-OUT CARD */}
              <section className="flex flex-col rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <LogOut className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">Time-out</h4>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Participant Time-out
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${checkOutBadgeClass}`}
                  >
                    {checkOutStatus}
                  </span>
                </div>

                <p
                  aria-live="polite"
                  className="mt-4 min-h-12 text-sm leading-6 text-slate-600"
                >
                  {checkOutDescription}
                </p>

                {isCheckOutOpen && selectedAssignment.check_out_opened_at && (
                  <p className="mb-3 text-xs text-slate-500">
                    Opened:{" "}
                    {formatDateTime(selectedAssignment.check_out_opened_at)}
                  </p>
                )}

                <div className="mt-auto pt-3">
                  {isCheckOutExpired ? (
                    <div
                      role="status"
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600"
                    >
                      <LockKeyhole className="h-4 w-4" />
                      {wasCheckOutOpened
                        ? "Time-out Closed"
                        : "Time-out Window Expired"}
                    </div>
                  ) : isCheckOutOpen ? (
                    <button
                      type="button"
                      onClick={() => void onCloseCheckOut()}
                      disabled={!canCloseCheckOut || controlsBusy}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {checkOutControlLoading === "close" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}

                      {checkOutControlLoading === "close"
                        ? "Closing..."
                        : "Close Time-out"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onOpenCheckOut()}
                      disabled={!canOpenCheckOut || controlsBusy}
                      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${
                        canOpenCheckOut
                          ? "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {checkOutControlLoading === "open" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : !canOpenCheckOut ? (
                        <LockKeyhole className="h-4 w-4" />
                      ) : wasCheckOutClosed ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}

                      {checkOutControlLoading === "open"
                        ? "Opening..."
                        : !canOpenCheckOut
                          ? "Time-out Unavailable"
                          : wasCheckOutClosed
                            ? "Reopen Time-out"
                            : "Open Time-out"}
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* REFRESH */}
          <div className="flex justify-end border-t border-slate-200 pt-4">
            {null}
          </div>
        </div>
      )}

      {/* NO EVENT SELECTED */}
      {!loading && assignments.length > 0 && !selectedAssignment && (
        <div className="px-5 py-8 text-center text-sm text-slate-500">
          Select an event above to view its attendance controls.
        </div>
      )}
    </section>
  );
}
