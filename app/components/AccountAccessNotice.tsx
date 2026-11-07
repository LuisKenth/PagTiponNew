"use client";

import { CloudOff, RefreshCw, ShieldAlert } from "lucide-react";
export default function AccountAccessNotice({
  status,
  message,
  onRetry,
  title = "PagTipon Portal",
}: {
  status: "checking" | "retry" | "denied";
  message?: string;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section
        className="flex w-full max-w-md flex-col items-center rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-8"
        aria-busy={status === "checking"}
      >
        {status === "checking" ? (
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        ) : status === "retry" ? (
          <CloudOff className="h-10 w-10 text-amber-500" aria-hidden="true" />
        ) : (
          <ShieldAlert className="h-10 w-10 text-red-500" aria-hidden="true" />
        )}
        <h1 className="mt-4 text-lg font-bold text-slate-900">
          {status === "retry"
            ? "Connection unavailable"
            : status === "denied"
              ? "Account access unavailable"
              : title}
        </h1>
        <p
          role={status === "checking" ? "status" : "alert"}
          className="mt-2 text-sm leading-6 text-slate-600"
        >
          {status === "checking" ? "Checking your account access…" : message}
        </p>
        {status !== "checking" && (
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
