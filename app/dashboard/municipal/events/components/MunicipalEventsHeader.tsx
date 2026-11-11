import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";

import { Ban, CalendarDays, ListFilter, UnlockKeyhole } from "lucide-react";

type MunicipalEventsHeaderProps = {
  municipality: string;
  totalReceived: number;
  filteredCount: number;
  registrationOpenCount: number;
  cancelledCount: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

export default function MunicipalEventsHeader({
  municipality,
  totalReceived,
  filteredCount,
  registrationOpenCount,
  cancelledCount,
  loading,
  refreshing,
  onRefresh,
}: MunicipalEventsHeaderProps) {
  const isRefreshing = loading || refreshing;

  return (
    <MunicipalPageHeader
      icon={<CalendarDays className="h-6 w-6" />}
      title="Provincial Events"
      eyebrow="Municipal Event Operations"
      description={
        <>
          Search, review, and manage provincial events assigned to{" "}
          <strong>{municipality || "your municipality"}</strong>.
        </>
      }
      backHref="/dashboard/municipal"
      actions={null}
    >
      {/* Summary statistics */}
      <div className="mobile-summary-grid grid grid-cols-2 border-t border-slate-200 bg-slate-50 sm:grid-cols-4">
        <div className="border-b border-r border-slate-200 p-4 sm:border-b-0 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
              <CalendarDays className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Total Provincial Events
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950">
                {totalReceived}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <ListFilter className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Filtered Results
              </p>

              <p className="mt-1 text-xl font-bold text-blue-700">
                {filteredCount}
              </p>
            </div>
          </div>
        </div>

        <div className="border-r border-slate-200 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <UnlockKeyhole className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Registration Open
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-700">
                {registrationOpenCount}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 ring-1 ring-red-100">
              <Ban className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Cancelled
              </p>

              <p className="mt-1 text-xl font-bold text-red-700">
                {cancelledCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MunicipalPageHeader>
  );
}
