"use client";

import Link from "next/link";
import { useEffect } from "react";

import {
  CheckCircle2,
  ClipboardCheck,
  LockKeyhole,
  LogIn,
  LogOut,
} from "lucide-react";

import ManualQrTokenEntry from "../components/ManualQrTokenEntry";
import QrAttendanceScanner from "../components/QrAttendanceScanner";
import { useStaffAttendanceContext } from "../context/StaffAttendanceContext";

export default function StaffParticipantCheckInPage() {
  const dashboard =
    useStaffAttendanceContext();

  /**
   * Keep the attendance operation synchronized
   * with the staff-controlled session.
   *
   * Direct page refresh support:
   *
   * Check-Out open -> automatically use Check Out
   * Check-In open  -> automatically use Check In
   */
  useEffect(() => {
    if (
      dashboard.isCheckOutOpen &&
      dashboard.attendanceMode !==
        "check_out"
    ) {
      dashboard.changeAttendanceMode(
        "check_out",
      );

      return;
    }

    if (
      dashboard.isCheckInOpen &&
      dashboard.attendanceMode !==
        "check_in"
    ) {
      dashboard.changeAttendanceMode(
        "check_in",
      );
    }
  }, [
    dashboard.attendanceMode,
    dashboard.changeAttendanceMode,
    dashboard.isCheckInOpen,
    dashboard.isCheckOutOpen,
  ]);

  const blockedMessage =
    dashboard.getAttendanceBlockedMessage();

  const noActiveSession =
    !dashboard.isCheckInOpen &&
    !dashboard.isCheckOutOpen;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <header>
        <p className="text-sm font-semibold text-emerald-700">
          Attendance Operations
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Participant Attendance
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Scan the participant QR code or enter
          the manual attendance code to record
          Time In or Time Out according to the
          attendance session opened by event
          staff.
        </p>
      </header>

      {/* Selected event */}
      {dashboard.selectedAssignment && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Selected Event
              </p>

              <p className="mt-1 text-base font-semibold text-slate-900">
                {
                  dashboard
                    .selectedAssignment
                    .event.title
                }
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <SessionBadge
                label="Check-In"
                isOpen={
                  dashboard.isCheckInOpen
                }
                wasClosed={
                  dashboard.wasCheckInClosed
                }
                type="check_in"
              />

              <SessionBadge
                label="Check-Out"
                isOpen={
                  dashboard.isCheckOutOpen
                }
                wasClosed={
                  dashboard.wasCheckOutClosed
                }
                type="check_out"
              />
            </div>
          </div>
        </section>
      )}

      {/* Attendance operation */}
      {dashboard.selectedAssignment && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Current Attendance Operation
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              The available operation is
              controlled by the attendance
              session opened in Event Control.
            </p>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            {/* Check-In */}
            <button
              type="button"
              onClick={() =>
                dashboard.changeAttendanceMode(
                  "check_in",
                )
              }
              disabled={
                !dashboard.isCheckInOpen
              }
              className={`rounded-2xl border p-5 text-left transition ${
                dashboard.attendanceMode ===
                  "check_in" &&
                dashboard.isCheckInOpen
                  ? "border-emerald-300 bg-emerald-50 shadow-sm"
                  : dashboard.isCheckInOpen
                    ? "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                    : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    dashboard.isCheckInOpen
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <LogIn className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      Check In
                    </p>

                    {dashboard.isCheckInOpen && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {dashboard.isCheckInOpen
                      ? "QR and manual attendance codes will record participant Time In."
                      : dashboard.wasCheckInClosed
                        ? "Check-In has already been closed."
                        : "Staff must open Check-In from Event Control first."}
                  </p>
                </div>
              </div>
            </button>

            {/* Check-Out */}
            <button
              type="button"
              onClick={() =>
                dashboard.changeAttendanceMode(
                  "check_out",
                )
              }
              disabled={
                !dashboard.isCheckOutOpen
              }
              className={`rounded-2xl border p-5 text-left transition ${
                dashboard.attendanceMode ===
                  "check_out" &&
                dashboard.isCheckOutOpen
                  ? "border-blue-300 bg-blue-50 shadow-sm"
                  : dashboard.isCheckOutOpen
                    ? "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                    : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    dashboard.isCheckOutOpen
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <LogOut className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      Check Out
                    </p>

                    {dashboard.isCheckOutOpen && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {dashboard.isCheckOutOpen
                      ? "QR and manual attendance codes will record participant Time Out."
                      : dashboard.wasCheckOutClosed
                        ? "Check-Out has already been closed."
                        : dashboard.wasCheckInClosed
                          ? "Staff must open Check-Out from Event Control first."
                          : "Check-In must be completed before Check-Out becomes available."}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* No active attendance session */}
      {dashboard.selectedAssignment &&
        noActiveSession && (
          <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <div>
                <p className="text-sm font-semibold text-amber-900">
                  No attendance session is
                  currently open
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Open the appropriate session
                  from Event Control before
                  scanning participant QR codes
                  or processing manual attendance
                  codes.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/staff/event-control"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"
            >
              <ClipboardCheck className="h-4 w-4" />

              Event Control
            </Link>
          </div>
        )}

      {/* Scanner and manual attendance */}
      {dashboard.selectedAssignment && (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <QrAttendanceScanner
            eventKey={
              dashboard.selectedEventMunicipalityId
            }
            attendanceMode={
              dashboard.attendanceMode
            }
            canUseAttendanceTools={
              dashboard.canUseAttendanceTools
            }
            blockedMessage={
              blockedMessage
            }
            message={
              dashboard.message
            }
            onProcessToken={
              dashboard.processQrToken
            }
            onShowMessage={
              dashboard.showMessage
            }
          />

          <ManualQrTokenEntry
            attendanceMode={
              dashboard.attendanceMode
            }
            canUseAttendanceTools={
              dashboard.canUseAttendanceTools
            }
            blockedMessage={
              blockedMessage
            }
            onProcessToken={
              dashboard.processQrToken
            }
            onShowMessage={
              dashboard.showMessage
            }
          />
        </div>
      )}

      {/* No selected event */}
      {!dashboard.loading &&
        !dashboard.selectedAssignment && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <LockKeyhole className="mx-auto h-8 w-8 text-slate-400" />

            <h2 className="mt-3 font-semibold text-slate-900">
              No event selected
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Select an assigned event from
              Event Control before processing
              participant attendance.
            </p>

            <Link
              href="/dashboard/staff/event-control"
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ClipboardCheck className="h-4 w-4" />

              Go to Event Control
            </Link>
          </div>
        )}
    </div>
  );
}

type SessionBadgeProps = {
  label: string;

  isOpen: boolean;

  wasClosed: boolean;

  type: "check_in" | "check_out";
};

function SessionBadge({
  label,
  isOpen,
  wasClosed,
  type,
}: SessionBadgeProps) {
  if (isOpen) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
          type === "check_in"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-blue-100 text-blue-700"
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />

        {label} Open
      </span>
    );
  }

  if (wasClosed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
        <LockKeyhole className="h-3.5 w-3.5" />

        {label} Closed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
      <LockKeyhole className="h-3.5 w-3.5" />

      {label} Not Open
    </span>
  );
}