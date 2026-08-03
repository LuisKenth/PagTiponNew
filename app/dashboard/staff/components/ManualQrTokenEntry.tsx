"use client";

import {
  ClipboardPaste,
  Eraser,
  Keyboard,
  LoaderCircle,
  ShieldAlert,
  TicketCheck,
} from "lucide-react";
import { useRef, useState } from "react";

type ManualQrTokenEntryProps = {
  canUseAttendanceTools: boolean;
  blockedMessage: string;
  onProcessToken: (
    token: string,
    method: "qr" | "manual"
  ) => Promise<boolean>;
  onShowMessage: (text: string, tone?: "info" | "success" | "error") => void;
};

export default function ManualQrTokenEntry({
  canUseAttendanceTools,
  blockedMessage,
  onProcessToken,
  onShowMessage,
}: ManualQrTokenEntryProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const tokenInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [manualQrToken, setManualQrToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pasting, setPasting] = useState(false);

  const trimmedToken = manualQrToken.trim();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedToken) {
      onShowMessage(
        "Enter or paste the participant attendance token.",
        "error"
      );

      tokenInputRef.current?.focus();
      return;
    }

    if (!canUseAttendanceTools) {
      onShowMessage(blockedMessage, "error");
      return;
    }

    setSubmitting(true);

    try {
      const success = await onProcessToken(trimmedToken, "manual");

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

  const handlePasteFromClipboard = async () => {
    if (!canUseAttendanceTools || submitting || pasting) return;

    if (!navigator.clipboard?.readText) {
      onShowMessage(
        "Clipboard access is not available. Paste the token directly into the field.",
        "error"
      );
      return;
    }

    setPasting(true);

    try {
      const clipboardText = await navigator.clipboard.readText();
      const pastedToken = clipboardText.trim();

      if (!pastedToken) {
        onShowMessage("No attendance token was found in the clipboard.", "error");
        return;
      }

      setManualQrToken(pastedToken);
      onShowMessage("Attendance token pasted successfully.", "info");

      window.setTimeout(() => {
        tokenInputRef.current?.focus();
      }, 0);
    } catch {
      onShowMessage(
        "Unable to read the clipboard. Paste the token manually.",
        "error"
      );
    } finally {
      setPasting(false);
    }
  };

  const handleClear = () => {
    if (submitting) return;

    setManualQrToken("");
    tokenInputRef.current?.focus();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  const inputDisabled = !canUseAttendanceTools || submitting;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Heading */}
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Manual Attendance Entry
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Use this option when the participant QR code cannot be scanned.
              Paste or enter the token connected to the participant
              registration.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {!canUseAttendanceTools && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <p className="text-sm font-semibold">
                Manual attendance unavailable
              </p>

              <p className="mt-1 text-sm leading-6">
                {blockedMessage ||
                  "Select an event and open attendance check-in first."}
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
                Participant attendance token
              </label>

              <span className="text-xs text-slate-500">
                Press Enter to process
              </span>
            </div>

            <textarea
              ref={tokenInputRef}
              id="manual-attendance-token"
              value={manualQrToken}
              onChange={(event) => setManualQrToken(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste or enter the attendance token here"
              rows={4}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={inputDisabled}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            />

            <div className="mt-2 flex flex-col gap-1 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                The token will be checked against registrations for the
                selected event.
              </p>

              {manualQrToken && (
                <p className="shrink-0">
                  {trimmedToken.length} character
                  {trimmedToken.length === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>

          {/* Entry tools */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void handlePasteFromClipboard()}
              disabled={inputDisabled || pasting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pasting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardPaste className="h-4 w-4" />
              )}

              {pasting ? "Pasting..." : "Paste Token"}
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={!manualQrToken || submitting}
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
              !canUseAttendanceTools || !trimmedToken || submitting
            }
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <TicketCheck className="h-5 w-5" />
            )}

            {submitting
              ? "Verifying Participant..."
              : "Verify and Record Attendance"}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="text-sm font-semibold text-blue-900">
            Staff verification reminder
          </p>

          <p className="mt-1 text-sm leading-6 text-blue-800">
            Before confirming attendance, verify that the returned participant
            information matches the person presenting the token.
          </p>
        </div>
      </div>
    </section>
  );
}