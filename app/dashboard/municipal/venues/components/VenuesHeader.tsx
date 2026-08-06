import Link from "next/link";

import {
  ArrowLeft,
  Building2,
  ListFilter,
  MapPin,
  RefreshCw,
  UsersRound,
} from "lucide-react";

type VenuesHeaderProps = {
  municipality: string | null;
  totalVenues: number;
  filteredVenues: number;
  totalCapacity: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

const numberFormatter =
  new Intl.NumberFormat("en-PH");

export default function VenuesHeader({
  municipality,
  totalVenues,
  filteredVenues,
  totalCapacity,
  loading,
  refreshing,
  onRefresh,
}: VenuesHeaderProps) {
  const isRefreshing =
    loading || refreshing;

  const municipalityLabel =
    municipality || "Unavailable";

  const refreshLabel = loading
    ? "Loading Venues..."
    : refreshing
      ? "Refreshing..."
      : "Refresh Venues";

  return (
    <header
      aria-labelledby="municipal-venues-heading"
      aria-busy={isRefreshing}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="p-5 sm:p-6">
        <Link
          href="/dashboard/municipal"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-slate-500 transition hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm sm:h-13 sm:w-13">
              <Building2 className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Municipal Management
              </p>

              <h1
                id="municipal-venues-heading"
                className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
              >
                Municipal Venues
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                Add, update, and manage approved
                event locations for{" "}
                <span className="font-semibold text-slate-800">
                  {municipality ||
                    "your municipality"}
                </span>
                .
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            {refreshLabel}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-slate-200 bg-slate-50/70 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-b border-slate-200 p-4 sm:border-r sm:p-5 xl:border-b-0">
          <div className="flex min-h-12 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm">
              <Building2 className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Venues
              </p>

              <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">
                {numberFormatter.format(
                  totalVenues,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 p-4 sm:p-5 xl:border-b-0 xl:border-r">
          <div className="flex min-h-12 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
              <ListFilter className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Filtered Results
              </p>

              <p
                aria-live="polite"
                className="mt-1 text-xl font-bold tabular-nums text-blue-700"
              >
                {numberFormatter.format(
                  filteredVenues,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="flex min-h-12 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
              <UsersRound className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Capacity
              </p>

              <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">
                {numberFormatter.format(
                  totalCapacity,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex min-h-12 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700">
              <MapPin className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Municipality
              </p>

              <p
                title={municipalityLabel}
                className="mt-1 truncate text-base font-bold text-violet-700"
              >
                {municipalityLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}