"use client";

import { Loader2 } from "lucide-react";

import type {
  NotificationId,
  ProvincialNotification,
} from "../types";
import NotificationItem from "./NotificationItem";
import NotificationsEmptyState from "./NotificationsEmptyState";

type NotificationListProps = {
  notifications: ProvincialNotification[];
  loading: boolean;
  error: string;
  updatingId: NotificationId | null;
  deletingId: NotificationId | null;
  onOpen: (
    notification: ProvincialNotification,
  ) => void;
  onMarkAsRead: (
    notificationId: NotificationId,
  ) => void;
  onDelete: (
    notificationId: NotificationId,
  ) => void;
};

export default function NotificationList({
  notifications,
  loading,
  error,
  updatingId,
  deletingId,
  onOpen,
  onMarkAsRead,
  onDelete,
}: NotificationListProps) {
  return (
    <>
      {error && (
        <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
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
      ) : notifications.length === 0 ? (
        <NotificationsEmptyState />
      ) : (
        <div className="divide-y divide-slate-100">
          {notifications.map((notification) => (
            <NotificationItem
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
      )}
    </>
  );
}
