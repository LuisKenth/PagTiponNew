import BackgroundDataSync from "@/app/components/live/BackgroundDataSync";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";

import { Building2, ListFilter, MapPin, UsersRound } from "lucide-react";

type VenuesHeaderProps = {
  municipality: string | null;
  totalVenues: number;
  filteredVenues: number;
  totalCapacity: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

const numberFormatter = new Intl.NumberFormat("en-PH");

export default function VenuesHeader({
  municipality,
  totalVenues,
  filteredVenues,
  totalCapacity,
  loading,
  refreshing,
  onRefresh,
}: VenuesHeaderProps) {
  const isRefreshing = loading || refreshing;

  const municipalityLabel = municipality || "Unavailable";

  const refreshLabel = loading
    ? "Loading Venues..."
    : refreshing
      ? "Refreshing..."
      : "Refresh Venues";

  return (
    <MunicipalPageHeader
      icon={<Building2 className="h-6 w-6" />}
      title="Municipal Venues"
      eyebrow="Municipal Administration"
      description={
        <>
          Add, update, and manage approved event locations for{" "}
          <strong>{municipality || "your municipality"}</strong>.
        </>
      }
      backHref="/dashboard/municipal"
      actions={
        <BackgroundDataSync onUpdate={onRefresh} disabled={isRefreshing} />
      }
      id="municipal-venues-heading"
    >
      <div className="mobile-summary-grid grid grid-cols-1 border-t border-slate-200 bg-slate-50/70 sm:grid-cols-2 xl:grid-cols-4">
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
                {numberFormatter.format(totalVenues)}
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
                {numberFormatter.format(filteredVenues)}
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
                {numberFormatter.format(totalCapacity)}
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
    </MunicipalPageHeader>
  );
}
