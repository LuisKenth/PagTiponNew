import type {
  EventStatusFilter,
  EventWithMunicipalities,
} from "../types";

import { getAutomaticEventStatus } from "../utils";

type EventsStatusTabsProps = {
  events: EventWithMunicipalities[];
  currentTime: number;
  activeStatus: EventStatusFilter;
  onStatusChange: (status: EventStatusFilter) => void;
};

const tabs: {
  label: string;
  value: EventStatusFilter;
}[] = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Draft",
    value: "draft",
  },
  {
    label: "Upcoming",
    value: "upcoming",
  },
  {
    label: "Ongoing",
    value: "ongoing",
  },
  {
    label: "Completed",
    value: "completed",
  },
  {
    label: "Cancelled",
    value: "cancelled",
  },
];

export default function EventsStatusTabs({
  events,
  currentTime,
  activeStatus,
  onStatusChange,
}: EventsStatusTabsProps) {
  const getCount = (status: EventStatusFilter) => {
    if (status === "all") {
      return events.length;
    }

    return events.filter(
      (event) =>
        getAutomaticEventStatus(
          event,
          currentTime
        ) === status
    ).length;
  };

  return (
    <div className="border-b border-slate-100 px-6">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive =
            activeStatus === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() =>
                onStatusChange(tab.value)
              }
              className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{tab.label}</span>

              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {getCount(tab.value)}
              </span>

              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-slate-900" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}