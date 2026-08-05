import {
    Bell,
    BellRing,
    CalendarDays,
    TicketCheck,
    UserCheck,
} from "lucide-react";

import type { NotificationCounts } from "../types/participantNotifications";

type NotificationSummaryCardsProps = {
    loading: boolean;
    counts: NotificationCounts;
};

export default function NotificationSummaryCards({
    loading,
    counts,
}: NotificationSummaryCardsProps) {
    const eventNotices =
        counts.eventUpdates + counts.cancellations;

    const cards = [
        {
            label: "Total",
            value: counts.total,
            icon: Bell,
            iconClasses:
                "bg-slate-100 text-slate-700",
        },
        {
            label: "Unread",
            value: counts.unread,
            icon: BellRing,
            iconClasses:
                "bg-blue-50 text-blue-700",
        },
        {
            label: "Registrations",
            value: counts.registrations,
            icon: TicketCheck,
            iconClasses:
                "bg-violet-50 text-violet-700",
        },
        {
            label: "Event Notices",
            value: eventNotices,
            icon: CalendarDays,
            iconClasses:
                "bg-amber-50 text-amber-700",
        },
        {
            label: "Attendance",
            value: counts.attendance,
            icon: UserCheck,
            iconClasses:
                "bg-green-50 text-green-700",
        },
    ];

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <div
                        key={card.label}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">
                                    {card.label}
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {loading
                                        ? "—"
                                        : card.value}
                                </p>
                            </div>

                            <div
                                className={`flex size-11 items-center justify-center rounded-xl ${card.iconClasses}`}
                            >
                                <Icon
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </section>
    );
}
