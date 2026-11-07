"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, LogIn, LogOut, ScanLine, X } from "lucide-react";

import ManualQrTokenEntry from "./ManualQrTokenEntry";
import QrAttendanceScanner from "./QrAttendanceScanner";
import { useStaffAttendanceContext } from "../context/StaffAttendanceContext";
import { formatDateTime } from "../utils";

/**
 * Attendance tools are mounted ONLY while the popup is open. Closing the popup
 * unmounts QrAttendanceScanner, which already stops/releases the camera.
 * Closing the popup does not close the server-side attendance session.
 */
export default function InlineAttendanceWorkspace() {
  const dashboard = useStaffAttendanceContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissedSuccessMessage, setDismissedSuccessMessage] = useState("");
  const previousSessionKeyRef = useRef<string | null>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const activeMode =
    dashboard.isCheckOutOpen && !dashboard.isCheckOutExpired
      ? "check_out"
      : dashboard.isCheckInOpen
        ? "check_in"
        : null;

  const assignment = dashboard.selectedAssignment;
  const sessionKey =
    activeMode && assignment ? `${String(assignment.id)}:${activeMode}` : null;

  const modeReady = activeMode !== null && dashboard.attendanceMode === activeMode;
  const canScan = Boolean(modeReady && dashboard.canUseAttendanceTools);
  const blockedMessage = modeReady
    ? dashboard.getAttendanceBlockedMessage()
    : "Preparing the active attendance operation...";

  // Keep Time-in / Time-out aligned with the active database session.
  useEffect(() => {
    if (activeMode && dashboard.attendanceMode !== activeMode) {
      dashboard.changeAttendanceMode(activeMode);
    }
  }, [activeMode, dashboard.attendanceMode, dashboard.changeAttendanceMode]);

  // Open once when a new session becomes active. Staff can close/reopen the
  // popup without causing it to immediately reappear in the same session.
  useEffect(() => {
    if (dashboard.loading) return;
    if (!sessionKey) {
      previousSessionKeyRef.current = null;
      setModalOpen(false);
      return;
    }
    if (previousSessionKeyRef.current !== sessionKey) {
      previousSessionKeyRef.current = sessionKey;
      setModalOpen(true);
    }
  }, [dashboard.loading, sessionKey]);

  const successMessage =
    dashboard.message?.tone === "success" &&
    /completed\s+Time-(?:in|out)\s+successfully/i.test(dashboard.message.text)
      ? dashboard.message.text
      : "";
  const successMatch = successMessage.match(
    /^(.+?)\s+completed\s+Time-(in|out)\s+successfully(?:\s+at\s+(.+?))?\.?$/i,
  );
  const participantName = successMatch?.[1]?.trim() || "Participant";
  const attendanceAction =
    successMatch?.[2]?.toLowerCase() === "out" ? "TIME-OUT" : "TIME-IN";
  const attendanceTime =
    successMatch?.[3]?.trim().replace(/\.$/, "") || "Attendance recorded successfully";
  const showSuccessPopup =
    modalOpen && Boolean(successMessage) && dismissedSuccessMessage !== successMessage;

  useEffect(() => {
    if (!showSuccessPopup) return;
    const timer = window.setTimeout(() => {
      setDismissedSuccessMessage(successMessage);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [showSuccessPopup, successMessage]);

  const closeModal = useCallback(() => setModalOpen(false), []);

  // Background page stays still while attendance is being recorded.
  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      (openButtonRef.current ?? previousFocus)?.focus();
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showSuccessPopup) {
        setDismissedSuccessMessage(successMessage);
      } else {
        closeModal();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [modalOpen, showSuccessPopup, successMessage, closeModal]);

  if (dashboard.loading || !assignment || !activeMode) return null;

  const isTimeOut = activeMode === "check_out";
  const operation = isTimeOut ? "Time-out" : "Time-in";
  const OperationIcon = isTimeOut ? LogOut : LogIn;

  return (
    <>
      <section id="attendance-workspace" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isTimeOut ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
              <OperationIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-950">{operation} Attendance</h2>
              <p className="mt-0.5 break-words text-sm text-slate-500">
                {assignment.event.title} · {canScan ? "Ready to scan" : "Session restricted"}
              </p>
            </div>
          </div>
          <button
            ref={openButtonRef}
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={!canScan}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isTimeOut ? "bg-blue-700 hover:bg-blue-800" : "bg-emerald-700 hover:bg-emerald-800"}`}
          >
            <ScanLine className="h-4 w-4" />
            Open Attendance Scanner
          </button>
        </div>
        {!canScan && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{blockedMessage}</p>
        )}
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-0 backdrop-blur-[2px] sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !showSuccessPopup) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-scanner-modal-title"
            aria-describedby="staff-scanner-modal-description"
            className="flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[94dvh] sm:max-w-3xl sm:rounded-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isTimeOut ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                  <OperationIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="staff-scanner-modal-title" className="text-lg font-extrabold text-slate-950 sm:text-xl">
                      {operation} Attendance
                    </h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isTimeOut ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {isTimeOut ? "Time-out" : "Time-in"}
                    </span>
                  </div>
                  <p id="staff-scanner-modal-description" className="mt-1 break-words text-sm font-medium text-slate-700">
                    {assignment.event.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {assignment.municipality} · Starts {formatDateTime(assignment.event.start_at)}
                  </p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeModal}
                aria-label="Close attendance scanner popup"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-3 sm:p-5">
              {!canScan && (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {blockedMessage}
                </p>
              )}
              <div className="min-w-0">
                <QrAttendanceScanner
                  eventKey={dashboard.selectedEventMunicipalityId}
                  attendanceMode={dashboard.attendanceMode}
                  canUseAttendanceTools={canScan}
                  blockedMessage={blockedMessage}
                  message={dashboard.message}
                  onProcessToken={dashboard.processQrToken}
                  onShowMessage={dashboard.showMessage}
                  compact
                />
              </div>
              <div className="min-w-0">
                <ManualQrTokenEntry
                  attendanceMode={dashboard.attendanceMode}
                  canUseAttendanceTools={canScan}
                  blockedMessage={blockedMessage}
                  onProcessToken={dashboard.processQrToken}
                  onShowMessage={dashboard.showMessage}
                  compact
                />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <span className="font-semibold">Walk-in attendee?</span> Manual code entry is for registered participants.
                A participant without an event registration needs an authorized walk-in registration first.
                Do not record an unverified person as Present.
              </div>
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <span className="text-xs text-slate-500">Closing this popup stops the camera, not the attendance session.</span>
              <button type="button" onClick={closeModal} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Done
              </button>
            </footer>
          </section>
        </div>
      )}

      {showSuccessPopup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-label={`${participantName} ${attendanceAction.toLowerCase()}`}
            className="relative w-full max-w-lg rounded-3xl bg-white p-7 text-center shadow-2xl sm:p-10"
          >
            <button
              type="button"
              aria-label="Dismiss attendance confirmation"
              onClick={() => setDismissedSuccessMessage(successMessage)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <p className="mt-5 text-sm font-bold tracking-wide text-emerald-700">{attendanceAction}</p>
            <h2 className="mt-2 break-words text-3xl font-black text-slate-950 sm:text-4xl">{participantName}</h2>
            <p className="mt-3 text-sm text-slate-600">{attendanceTime}</p>
            <p className="mt-6 text-xs text-slate-400">This confirmation closes automatically after 6 seconds.</p>
          </section>
        </div>
      )}
    </>
  );
}
