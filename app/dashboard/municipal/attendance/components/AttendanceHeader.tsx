import BackgroundDataSync from "@/app/components/live/BackgroundDataSync";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";

import { ClipboardCheck, Download } from "lucide-react";

type AttendanceHeaderProps = {
  totalRecords: number;
  filteredRecords: number;
  loading: boolean;
  refreshing: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  onRefresh: () => void;
};

export default function AttendanceHeader({
  totalRecords,
  filteredRecords,
  loading,
  refreshing,
  exportDisabled,
  onExport,
  onRefresh,
}: AttendanceHeaderProps) {
  return (
    <MunicipalPageHeader
      icon={<ClipboardCheck className="h-6 w-6" />}
      title="Municipal Attendance"
      eyebrow="Municipal Administration"
      description={"Monitor attendance recorded by authorized event staff."}
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
          <BackgroundDataSync
            onUpdate={onRefresh}
            disabled={loading || refreshing}
          />
        </>
      }
    >
      <div className="mobile-summary-grid grid border-t border-slate-200 bg-slate-50 sm:grid-cols-2">
        <div className="border-b border-slate-200 px-5 py-3 sm:border-b-0 sm:border-r">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total Registered Participants
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {totalRecords}
          </p>
        </div>

        <div className="px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Filtered Results
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {filteredRecords}
          </p>
        </div>
      </div>
    </MunicipalPageHeader>
  );
}
