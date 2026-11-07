
"use client";

import {
  BellOff,
  ListFilter,
  Loader2,
} from "lucide-react";

import type {
  MunicipalNotification,
  MunicipalNotificationFilter,
  MunicipalNotificationId,
} from "../types";

import MunicipalNotificationItem from "./MunicipalNotificationItem";

type MunicipalNotificationListProps = {
  notifications: MunicipalNotification[];
  totalNotifications: number;
  activeFilter: MunicipalNotificationFilter;
  loading: boolean;
  error: string;
  updatingId: MunicipalNotificationId | null;
  deletingId: MunicipalNotificationId | null;
  onOpen: (notification: MunicipalNotification) => void;
  onMarkAsRead: (notificationId: MunicipalNotificationId) => void;
  onDelete: (notificationId: MunicipalNotificationId) => void;
};

export default function MunicipalNotificationList({
  notifications,
  totalNotifications,
  activeFilter,
  loading,
  error,
  updatingId,
  deletingId,
  onOpen,
  onMarkAsRead,
  onDelete,
}: MunicipalNotificationListProps) {
  const hasNoNotifications = totalNotifications === 0;

  const emptyTitle = hasNoNotifications
    ? "No notifications yet"
    : activeFilter === "unread"
      ? "You're all caught up!"
      : "No matching notifications";

  const emptyDescription = hasNoNotifications
    ? "You'll see event invitations, updates, reminders, and important system messages here."
    : activeFilter === "unread"
      ? "You have no unread notifications."
      : activeFilter === "events"
        ? "There are no event notifications to display."
        : activeFilter === "system"
          ? "There are no system notifications to display."
          : "There are no notifications to display.";

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />

            <p className="mt-3 text-sm text-slate-500">
              Loading notifications...
            </p>
          </div>
        </div>
      ) : notifications.length === 0 && !error ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
            {hasNoNotifications ? (
              <BellOff className="h-7 w-7 text-slate-500" />
            ) : (
              <ListFilter className="h-7 w-7 text-slate-500" />
            )}
          </div>

          <h3 className="mt-5 text-lg font-bold text-slate-900">
            {emptyTitle}
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            {emptyDescription}
          </p>
        </div>
      ) : notifications.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {notifications.map((notification) => (
            <MunicipalNotificationItem
              key={String(notification.id)}
              notification={notification}
              updatingId={updatingId}
              deletingId={deletingId}
              onOpen={onOpen}
              onMarkAsRead={onMarkAsRead}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
