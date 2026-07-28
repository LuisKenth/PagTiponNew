import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Flag,
    LoaderCircle,
} from "lucide-react";

import type { MunicipalityEventItem } from "../types/municipalityDetails";

type MunicipalityEventSummaryProps = {
    events: MunicipalityEventItem[];
};

type PreparationStatus =
    | "pending"
    | "preparing"
    | "prepared";

function normalizePreparationStatus(
    value: string | null
): PreparationStatus {
    const normalizedValue = value
        ?.trim()
        .toLowerCase()
        .replaceAll(" ", "_");

    if (normalizedValue === "prepared") {
        return "prepared";
    }

    if (
        normalizedValue === "preparing" ||
        normalizedValue === "in_progress"
    ) {
        return "preparing";
    }

    return "pending";
}

export default function MunicipalityEventSummary({
    events,
}: MunicipalityEventSummaryProps) {
    const pendingCount = events.filter(
        (item) =>
            normalizePreparationStatus(
                item.preparation_status
            ) === "pending"
    ).length;

    const preparingCount = events.filter(
        (item) =>
            normalizePreparationStatus(
                item.preparation_status
            ) === "preparing"
    ).length;

    const preparedCount = events.filter(
        (item) =>
            normalizePreparationStatus(
                item.preparation_status
            ) === "prepared"
    ).length;

    const completedCount = events.filter(
        (item) =>
            item.event?.status?.trim().toLowerCase() ===
            "completed"
    ).length;

    const cards = [
        {
            label: "Provincial Events",
            value: events.length,
            description: "Events sent to this municipality",
            icon: CalendarDays,
            valueClass: "text-slate-900",
        },
        {
            label: "Pending",
            value: pendingCount,
            description: "Preparation has not started",
            icon: Clock3,
            valueClass: "text-amber-700",
        },
        {
            label: "Preparing",
            value: preparingCount,
            description: "Municipality is preparing",
            icon: LoaderCircle,
            valueClass: "text-blue-700",
        },
        {
            label: "Prepared",
            value: preparedCount,
            description: "Events marked as prepared",
            icon: CheckCircle2,
            valueClass: "text-green-700",
        },
        {
            label: "Completed Events",
            value: completedCount,
            description: "Finished provincial events",
            icon: Flag,
            valueClass: "text-slate-900",
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <div
                        key={card.label}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    {card.label}
                                </p>

                                <p
                                    className={`mt-2 text-3xl font-bold ${card.valueClass}`}
                                >
                                    {card.value}
                                </p>
                            </div>

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <Icon size={20} />
                            </div>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                            {card.description}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}