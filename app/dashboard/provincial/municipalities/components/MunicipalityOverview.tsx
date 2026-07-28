import type { MunicipalityOverviewItem } from "../types/municipality";
import MunicipalityCard from "./MunicipalityCard";

type MunicipalityOverviewProps = {
  municipalities: MunicipalityOverviewItem[];
  approvedCount: number;
  pendingCount: number;
  unassignedCount: number;
};

export default function MunicipalityOverview({
  municipalities,
  approvedCount,
  pendingCount,
  unassignedCount,
}: MunicipalityOverviewProps) {
  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Municipality Coverage
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Overview of municipal administrator coverage across
            all 18 municipalities.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700">
            {approvedCount} Assigned
          </span>

          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            {pendingCount} Pending
          </span>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
            {unassignedCount} Unassigned
          </span>
        </div>
      </div>

      {municipalities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="font-semibold text-slate-900">
            No municipalities found
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Try changing the search text or status filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {municipalities.map((municipality) => (
            <MunicipalityCard
              key={municipality.name}
              municipality={municipality}
            />
          ))}
        </div>
      )}
    </>
  );
}