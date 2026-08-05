"use client";

import type {
    NotificationFilter,
    NotificationFilterOption,
} from "../types/participantNotifications";

type NotificationFiltersProps = {
    filters: NotificationFilterOption[];
    activeFilter: NotificationFilter;
    onChange: (
        filter: NotificationFilter,
    ) => void;
};

export default function NotificationFilters({
    filters,
    activeFilter,
    onChange,
}: NotificationFiltersProps) {
    return (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
                <h2 className="text-xl font-semibold text-slate-950">
                    Notification Center
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Open a notification to view its
                    related participant page.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {filters.map((filter) => {
                    const selected =
                        activeFilter === filter.value;

                    return (
                        <button
                            key={filter.value}
                            type="button"
                            onClick={() =>
                                onChange(filter.value)
                            }
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                selected
                                    ? "bg-slate-950 text-white"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                            }`}
                        >
                            {filter.label}{" "}
                            <span
                                className={
                                    selected
                                        ? "text-slate-300"
                                        : "text-slate-400"
                                }
                            >
                                {filter.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
