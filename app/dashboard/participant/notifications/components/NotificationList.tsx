"use client";

import { Bell } from "lucide-react";

import type { NotificationRow } from "../types/participantNotifications";
import NotificationItem from "./NotificationItem";

type NotificationListProps = {
    loading: boolean;
    errorMessage: string;
    allCount: number;
    notifications: NotificationRow[];
    actionNotificationId: string | null;
    onOpen: (
        notification: NotificationRow,
    ) => Promise<void>;
    onMarkAsRead: (
        notificationId: string,
    ) => Promise<void>;
    onDelete: (
        notificationId: string,
    ) => Promise<void>;
    onRetry: () => Promise<void>;
};

export default function NotificationList({
    loading,
    errorMessage,
    allCount,
    notifications,
    actionNotificationId,
    onOpen,
    onMarkAsRead,
    onDelete,
    onRetry,
}: NotificationListProps) {
    if (loading) {
        return (
            <div
                aria-live="polite"
                className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-10 text-center"
            >
                <div className="mx-auto size-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                <p className="mt-4 text-sm font-medium text-slate-600">
                    Loading notifications...
                </p>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div
                role="alert"
                className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center"
            >
                <p className="font-semibold text-red-800">
                    Unable to load notifications
                </p>

                <p className="mt-1 text-sm text-red-600">
                    {errorMessage}
                </p>

                <button
                    type="button"
                    onClick={() => void onRetry()}
                    className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (allCount === 0) {
        return (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                    <Bell
                        className="size-7"
                        aria-hidden="true"
                    />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-slate-950">
                    No notifications yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Registration confirmations, event
                    updates, and attendance results will
                    appear here.
                </p>
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="font-semibold text-slate-800">
                    No matching notifications
                </p>

                <p className="mt-1 text-sm text-slate-500">
                    There are no notifications under the
                    selected filter.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-6 space-y-3">
            {notifications.map((notification) => (
                <NotificationItem
                    key={notification.id}
                    notification={notification}
                    actionLoading={
                        actionNotificationId ===
                        notification.id
                    }
                    onOpen={onOpen}
                    onMarkAsRead={onMarkAsRead}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}
