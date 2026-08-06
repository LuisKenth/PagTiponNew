"use client";

import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type MunicipalSettingsErrorProps = {
  reset: () => void;
};

export default function MunicipalSettingsError({
  reset,
}: MunicipalSettingsErrorProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-xl font-semibold text-slate-900">
        Unable to load settings
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        An unexpected error occurred while loading your
        municipal account settings.
      </p>

      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
