"use client";

import { Loader2 } from "lucide-react";

import type {
  MunicipalNotification,
  MunicipalNotificationId,
} from "../types";
import MunicipalNotificationItem from "./MunicipalNotificationItem";
import MunicipalNotificationsEmptyState from "./MunicipalNotificationsEmptyState";

type MunicipalNotificationListProps = {
  notifications: MunicipalNotification[];
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
  loading,
  error,
  updatingId,
  deletingId,
  onOpen,
  onMarkAsRead,
  onDelete,
}: MunicipalNotificationListProps) {
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
        <MunicipalNotificationsEmptyState />
      ) : (
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
      )}
    </>
  );
}
