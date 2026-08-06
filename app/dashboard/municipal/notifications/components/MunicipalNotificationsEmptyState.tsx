import {
  BellOff,
  SlidersHorizontal,
} from "lucide-react";

export default function MunicipalNotificationsEmptyState() {
  return (
    <div
      className="flex min-h-64 items-center justify-center px-4 py-10 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
          <BellOff
            className="h-6 w-6"
            aria-hidden="true"
          />
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-900">
          No notifications found
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          There are no municipal notifications matching the
          selected filter.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
          <SlidersHorizontal
            className="h-3.5 w-3.5"
            aria-hidden="true"
          />

          Try selecting another notification filter.
        </div>
      </div>
    </div>
  );
}