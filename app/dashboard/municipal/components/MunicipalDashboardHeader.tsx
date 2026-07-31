import Link from "next/link";

import {
  ArrowRight,
  Building2,
  MapPin,
} from "lucide-react";

type MunicipalDashboardHeaderProps = {
  municipality: string;
};

export default function MunicipalDashboardHeader({
  municipality,
}: MunicipalDashboardHeaderProps) {
  const municipalityName =
    municipality || "Your Municipality";

  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-slate-100" />

      <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              <Building2 className="h-3.5 w-3.5" />
              Municipal Administration
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Municipal Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review received provincial events, manage local
            preparation, control participant registration, and
            monitor municipal event operations.
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <MapPin className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Current Municipality
              </p>

              <p className="truncate font-semibold text-slate-900">
                {municipalityName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0">
          <Link
            href="/dashboard/municipal/venues"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
          >
            <Building2 className="h-4 w-4" />
            Manage Venues

            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <div className="grid border-t border-slate-200 bg-slate-50/80 sm:grid-cols-3">
        <div className="border-b border-slate-200 px-5 py-3 sm:border-b-0 sm:border-r sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Event Source
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            Provincial Administration
          </p>
        </div>

        <div className="border-b border-slate-200 px-5 py-3 sm:border-b-0 sm:border-r sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Main Responsibility
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            Local Event Preparation
          </p>
        </div>

        <div className="px-5 py-3 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Registration Control
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700">
            Managed Per Event
          </p>
        </div>
      </div>
    </header>
  );
}