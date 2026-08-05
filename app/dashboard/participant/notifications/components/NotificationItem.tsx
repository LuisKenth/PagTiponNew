"use client";

import {
    Clock3,
    Trash2,
} from "lucide-react";

import type { NotificationRow } from "../types/participantNotifications";
import {
    formatNotificationDateTime,
    getNotificationIcon,
    getNotificationIconClasses,
} from "../utils/participantNotificationUtils";

type NotificationItemProps = {
    notification: NotificationRow;
    actionLoading: boolean;
    onOpen: (
        notification: NotificationRow,
    ) => Promise<void>;
    onMarkAsRead: (
        notificationId: string,
    ) => Promise<void>;
    onDelete: (
        notificationId: string,
    ) => Promise<void>;
};

export default function NotificationItem({
    notification,
    actionLoading,
    onOpen,
    onMarkAsRead,
    onDelete,
}: NotificationItemProps) {
    const Icon = getNotificationIcon(
        notification.type,
    );

    return (
        <article
            className={`rounded-2xl border p-5 transition ${
                notification.read
                    ? "border-slate-200 bg-white"
                    : "border-blue-200 bg-blue-50/50"
            }`}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${getNotificationIconClasses(
                        notification.type,
                    )}`}
                >
                    <Icon
                        className="size-5"
                        aria-hidden="true"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-slate-950">
                                    {notification.title}
                                </h3>

                                {!notification.read && (
                                    <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                        New
                                    </span>
                                )}
                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {notification.message}
                            </p>

                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                                <Clock3
                                    className="size-3.5"
                                    aria-hidden="true"
                                />

                                {formatNotificationDateTime(
                                    notification.created_at,
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                void onOpen(notification)
                            }
                            disabled={actionLoading}
                            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Open
                        </button>

                        {!notification.read && (
                            <button
                                type="button"
                                onClick={() =>
                                    void onMarkAsRead(
                                        notification.id,
                                    )
                                }
                                disabled={actionLoading}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Mark as Read
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() =>
                                void onDelete(
                                    notification.id,
                                )
                            }
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Trash2
                                className="size-4"
                                aria-hidden="true"
                            />

                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}
