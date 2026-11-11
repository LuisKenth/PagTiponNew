import BackgroundDataSync from "@/app/components/live/BackgroundDataSync";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";

import {
  CalendarCheck2,
  Download,
  ListFilter,
  QrCode,
  UsersRound,
} from "lucide-react";

type RegistrationsHeaderProps = {
  totalRegistrations: number;
  filteredRegistrations: number;
  qrReadyCount: number;
  eventCount: number;
  loading: boolean;
  refreshing: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  onRefresh: () => void;
};

export default function RegistrationsHeader({
  totalRegistrations,
  filteredRegistrations,
  qrReadyCount,
  eventCount,
  loading,
  refreshing,
  exportDisabled,
  onExport,
  onRefresh,
}: RegistrationsHeaderProps) {
  const isRefreshing = loading || refreshing;

  return (
    <MunicipalPageHeader
      icon={<UsersRound className="h-6 w-6" />}
      title="Participant Registrations"
      eyebrow="Municipal Event Operations"
      description={
        "Review registrations, attendance preparation, and QR availability for events in your municipality."
      }
      backHref="/dashboard/municipal"
      actions={
        <>
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <BackgroundDataSync onUpdate={onRefresh} disabled={isRefreshing} />
        </>
      }
    >
      {/* Summary statistics */}
      <div className="mobile-summary-grid grid grid-cols-2 border-t border-slate-200 bg-slate-50 sm:grid-cols-4">
        {/* Total registrations */}
        <div className="border-b border-r border-slate-200 p-4 sm:border-b-0 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
              <UsersRound className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Total Registrations
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950">
                {totalRegistrations}
              </p>
            </div>
          </div>
        </div>

        {/* Filtered registrations */}
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
                {filteredRegistrations}
              </p>
            </div>
          </div>
        </div>

        {/* QR-ready registrations */}
        <div className="border-r border-slate-200 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <QrCode className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                QR Ready
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-700">
                {qrReadyCount}
              </p>
            </div>
          </div>
        </div>

        {/* Events with registrations */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-100">
              <CalendarCheck2 className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Events with Registrations
              </p>

              <p className="mt-1 text-xl font-bold text-violet-700">
                {eventCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MunicipalPageHeader>
  );
}
