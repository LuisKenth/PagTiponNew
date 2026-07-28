import { MUNICIPALITIES } from "../constants/municipalities";
import type { TabType } from "../types/municipality";

type MunicipalitiesSummaryProps = {
  approvedCount: number;
  pendingCount: number;
  unassignedCount: number;
  onTabChange: (tab: TabType) => void;
};

export default function MunicipalitiesSummary({
  approvedCount,
  pendingCount,
  unassignedCount,
  onTabChange,
}: MunicipalitiesSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <button
        type="button"
        onClick={() => onTabChange("municipalities")}
        className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
      >
        <p className="text-sm font-medium text-slate-500">
          Total Municipalities
        </p>

        <p className="mt-2 text-3xl font-bold text-slate-900">
          {MUNICIPALITIES.length}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Municipalities in Antique
        </p>
      </button>

      <button
        type="button"
        onClick={() => onTabChange("admins")}
        className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-green-300 hover:bg-green-50/30 hover:shadow-md"
      >
        <p className="text-sm font-medium text-slate-500">
          Covered Municipalities
        </p>

        <p className="mt-2 text-3xl font-bold text-slate-900">
          {approvedCount}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          With approved municipal admin
        </p>
      </button>

      <button
        type="button"
        onClick={() => onTabChange("pending")}
        className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-300 hover:bg-amber-50/30 hover:shadow-md"
      >
        <p className="text-sm font-medium text-slate-500">
          Pending Municipalities
        </p>

        <p className="mt-2 text-3xl font-bold text-slate-900">
          {pendingCount}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          With pending admin applications
        </p>
      </button>

      <button
        type="button"
        onClick={() => onTabChange("municipalities")}
        className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-red-300 hover:bg-red-50/30 hover:shadow-md"
      >
        <p className="text-sm font-medium text-slate-500">
          Without Municipal Admin
        </p>

        <p className="mt-2 text-3xl font-bold text-slate-900">
          {unassignedCount}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Municipalities needing assignment
        </p>
      </button>
    </div>
  );
}
