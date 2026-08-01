"use client";

import { useState } from "react";

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
  const [manualQrToken, setManualQrToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const token = manualQrToken.trim();

    if (!token) {
      onShowMessage("Please enter a QR token.", "error");
      return;
    }

    if (!canUseAttendanceTools) {
      onShowMessage(blockedMessage, "error");
      return;
    }

    setSubmitting(true);

    try {
      const success = await onProcessToken(token, "manual");
      if (success) setManualQrToken("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Manual QR Token Entry
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Use this when camera scanning is not available. The selected event must
        have an open attendance check-in.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <textarea
          value={manualQrToken}
          onChange={(event) => setManualQrToken(event.target.value)}
          placeholder="Paste QR token here"
          rows={5}
          disabled={!canUseAttendanceTools || submitting}
          className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        />

        <button
          type="submit"
          disabled={
            !canUseAttendanceTools || !manualQrToken.trim() || submitting
          }
          className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Processing..." : "Submit QR Token"}
        </button>
      </form>

      {!canUseAttendanceTools && (
        <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          {blockedMessage}
        </div>
      )}
    </div>
  );
}
