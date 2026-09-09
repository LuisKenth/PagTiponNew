"use client";

import {
    CheckCheck,
    RefreshCw,
} from "lucide-react";

type NotificationsHeaderProps = {
    unreadCount: number;
    refreshing: boolean;
    markingAllRead: boolean;
    onRefresh: () => Promise<void>;
    onMarkAllRead: () => Promise<void>;
};

export default function NotificationsHeader({
    unreadCount,
    refreshing,
    markingAllRead,
    onRefresh,
    onMarkAllRead,
}: NotificationsHeaderProps) {
    const actionBusy =
        refreshing || markingAllRead;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Participant Updates
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                            Notifications
                        </h1>

                        {unreadCount > 0 && (
                            <span
                                className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                                aria-live="polite"
                            >
                                {unreadCount}{" "}
                                {unreadCount === 1
                                    ? "unread"
                                    : "unread"}
                            </span>
                        )}
                    </div>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Review event invitations,
                        registration confirmations,
                        event updates, cancellations,
                        and attendance results.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            void onMarkAllRead()
                        }
                        disabled={
                            actionBusy ||
                            unreadCount === 0
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CheckCheck
                            className="size-4"
                            aria-hidden="true"
                        />

                        {markingAllRead
                            ? "Marking..."
                            : "Mark All as Read"}
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            void onRefresh()
                        }
                        disabled={actionBusy}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            className={`size-4 ${
                                refreshing
                                    ? "animate-spin"
                                    : ""
                            }`}
                            aria-hidden="true"
                        />

                        {refreshing
                            ? "Refreshing..."
                            : "Refresh"}
                    </button>
                </div>
            </div>
        </section>
    );
}