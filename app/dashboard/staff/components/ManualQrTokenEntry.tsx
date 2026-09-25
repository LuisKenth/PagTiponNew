"use client";

import {
  ClipboardPaste,
  Eraser,
  Keyboard,
  LoaderCircle,
  LogIn,
  LogOut,
  ShieldAlert,
  TicketCheck,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  AttendanceActionMode,
  DashboardMessage,
} from "../types";

type ManualQrTokenEntryProps = {
  attendanceMode: AttendanceActionMode;

  canUseAttendanceTools: boolean;

  blockedMessage: string;

  onProcessToken: (
    token: string,
    method: "qr" | "manual",
  ) => Promise<boolean>;

  onShowMessage: (
    text: string,
    tone?: DashboardMessage["tone"],
  ) => void;
};

export default function ManualQrTokenEntry({
  attendanceMode,
  canUseAttendanceTools,
  blockedMessage,
  onProcessToken,
  onShowMessage,
}: ManualQrTokenEntryProps) {
  const formRef =
    useRef<HTMLFormElement | null>(
      null,
    );

  const tokenInputRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    );

  const [
    manualQrToken,
    setManualQrToken,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    pasting,
    setPasting,
  ] = useState(false);

  const isCheckInMode =
    attendanceMode === "check_in";

  const operationLabel =
    isCheckInMode
      ? "Check In"
      : "Check Out";

  const operationAction =
    isCheckInMode
      ? "Time In"
      : "Time Out";

  const trimmedToken =
    manualQrToken.trim();

  /**
   * Clear any token left in the field whenever
   * staff changes between Check In and Check Out.
   *
   * This prevents a token entered for one
   * operation from being accidentally submitted
   * under the other operation.
   */
  useEffect(() => {
    setManualQrToken("");
  }, [attendanceMode]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!trimmedToken) {
      onShowMessage(
        isCheckInMode
          ? "Enter or paste the participant attendance code for check-in."
          : "Enter or paste the participant attendance code for check-out.",
        "error",
      );

      tokenInputRef.current?.focus();

      return;
    }

    if (!canUseAttendanceTools) {
      onShowMessage(
        blockedMessage,
        "error",
      );

      return;
    }

    setSubmitting(true);

    try {
      const success =
        await onProcessToken(
          trimmedToken,
          "manual",
        );

      if (success) {
        setManualQrToken("");

        window.setTimeout(() => {
          tokenInputRef.current?.focus();
        }, 0);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasteFromClipboard =
    async () => {
      if (
        !canUseAttendanceTools ||
        submitting ||
        pasting
      ) {
        return;
      }

      if (
        !navigator.clipboard
          ?.readText
      ) {
        onShowMessage(
          "Clipboard access is not available. Paste the attendance code directly into the field.",
          "error",
        );

        return;
      }

      setPasting(true);

      try {
        const clipboardText =
          await navigator.clipboard.readText();

        const pastedToken =
          clipboardText.trim();

        if (!pastedToken) {
          onShowMessage(
            "No attendance code was found in the clipboard.",
            "error",
          );

          return;
        }

        setManualQrToken(
          pastedToken,
        );

        onShowMessage(
          `Attendance code pasted for ${operationLabel.toLowerCase()}.`,
          "info",
        );

        window.setTimeout(() => {
          tokenInputRef.current?.focus();
        }, 0);
      } catch {
        onShowMessage(
          "Unable to read the clipboard. Paste the attendance code manually.",
          "error",
        );
      } finally {
        setPasting(false);
      }
    };

  const handleClear = () => {
    if (submitting) {
      return;
    }

    setManualQrToken("");

    tokenInputRef.current?.focus();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();

    formRef.current?.requestSubmit();
  };

  const inputDisabled =
    !canUseAttendanceTools ||
    submitting;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Heading */}
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isCheckInMode
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {isCheckInMode ? (
              <LogIn
                className="h-5 w-5"
                aria-hidden="true"
              />
            ) : (
              <LogOut
                className="h-5 w-5"
                aria-hidden="true"
              />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Manual Attendance Entry
              </h2>

              <OperationBadge
                mode={
                  attendanceMode
                }
              />
            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {isCheckInMode
                ? "Use the participant manual attendance code when the QR code cannot be scanned. A valid code will record the participant's Time In."
                : "Use the same participant manual attendance code to record Time Out. The participant must already have a successful Time In."}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Current operation */}
        <div
          className={`mb-5 flex items-start gap-3 rounded-xl border p-4 ${
            isCheckInMode
              ? "border-emerald-200 bg-emerald-50"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          {isCheckInMode ? (
            <LogIn className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <LogOut className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          )}

          <div>
            <p
              className={`text-sm font-semibold ${
                isCheckInMode
                  ? "text-emerald-900"
                  : "text-blue-900"
              }`}
            >
              {operationLabel} Mode
            </p>

            <p
              className={`mt-1 text-sm leading-6 ${
                isCheckInMode
                  ? "text-emerald-700"
                  : "text-blue-700"
              }`}
            >
              {isCheckInMode
                ? "The next valid manual attendance code will record Time In."
                : "The next valid manual attendance code will record Time Out."}
            </p>
          </div>
        </div>

        {!canUseAttendanceTools && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <p className="text-sm font-semibold">
                Manual{" "}
                {operationLabel.toLowerCase()}{" "}
                unavailable
              </p>

              <p className="mt-1 text-sm leading-6">
                {blockedMessage ||
                  (isCheckInMode
                    ? "Select an event and open attendance check-in first."
                    : "Select an eligible event before processing participant check-out.")}
              </p>
            </div>
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor="manual-attendance-token"
                className="text-sm font-semibold text-slate-700"
              >
                Participant attendance
                code
              </label>

              <span className="text-xs text-slate-500">
                Press Enter to{" "}
                {operationLabel.toLowerCase()}
              </span>
            </div>

            <textarea
              ref={tokenInputRef}
              id="manual-attendance-token"
              value={manualQrToken}
              onChange={(event) =>
                setManualQrToken(
                  event.target.value,
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Example: PTP-7KQM-9X2H"
              rows={4}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={
                inputDisabled
              }
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            />

            <div className="mt-2 flex flex-col gap-1 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                The code will be
                checked against registered
                participants for the selected
                event.
              </p>

              {manualQrToken && (
                <p className="shrink-0">
                  {trimmedToken.length}{" "}
                  character
                  {trimmedToken.length ===
                  1
                    ? ""
                    : "s"}
                </p>
              )}
            </div>
          </div>

          {/* Entry tools */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void handlePasteFromClipboard()
              }
              disabled={
                inputDisabled ||
                pasting
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pasting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardPaste className="h-4 w-4" />
              )}

              {pasting
                ? "Pasting..."
                : "Paste Code"}
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={
                !manualQrToken ||
                submitting
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eraser className="h-4 w-4" />
              Clear
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={
              !canUseAttendanceTools ||
              !trimmedToken ||
              submitting
            }
            className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${
              isCheckInMode
                ? "bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-100"
                : "bg-blue-700 hover:bg-blue-800 focus:ring-blue-100"
            }`}
          >
            {submitting ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : isCheckInMode ? (
              <LogIn className="h-5 w-5" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}

            {submitting
              ? `Processing ${operationLabel}...`
              : `${operationLabel} Participant`}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <TicketCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Staff verification reminder
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {isCheckInMode
                  ? "Before recording Time In, verify that the returned participant information matches the person presenting the attendance code."
                  : "Before recording Time Out, verify that the participant information matches the person leaving the event."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type OperationBadgeProps = {
  mode: AttendanceActionMode;
};

function OperationBadge({
  mode,
}: OperationBadgeProps) {
  if (mode === "check_out") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        <LogOut className="h-3.5 w-3.5" />
        Check Out
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <LogIn className="h-3.5 w-3.5" />
      Check In
    </span>
  );
}