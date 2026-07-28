import type { TabType } from "../types/municipality";

type MunicipalitiesTabsProps = {
  activeTab: TabType;
  approvedCount: number;
  pendingCount: number;
  totalMunicipalities: number;
  onTabChange: (tab: TabType) => void;
};

export default function MunicipalitiesTabs({
  activeTab,
  approvedCount,
  pendingCount,
  totalMunicipalities,
  onTabChange,
}: MunicipalitiesTabsProps) {
  const tabClass = (tab: TabType) =>
    `whitespace-nowrap border-b-2 pb-4 text-sm font-semibold transition ${
      activeTab === tab
        ? "border-slate-900 text-slate-900"
        : "border-transparent text-slate-500 hover:text-slate-900"
    }`;

  return (
    <div className="border-b border-slate-200 px-4 pt-5 sm:px-6">
      <div className="flex gap-5 overflow-x-auto">
        <button
          type="button"
          onClick={() => onTabChange("municipalities")}
          className={tabClass("municipalities")}
        >
          Municipality Overview
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
            {totalMunicipalities}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("admins")}
          className={tabClass("admins")}
        >
          Municipal Admins
          <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
            {approvedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("pending")}
          className={tabClass("pending")}
        >
          Pending Approvals
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              {pendingCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
