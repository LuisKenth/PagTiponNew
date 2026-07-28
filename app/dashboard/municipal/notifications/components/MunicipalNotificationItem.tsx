"use client";

import {
  CalendarDays,
  Check,
  Circle,
  Loader2,
  Trash2,
} from "lucide-react";

import type {
  MunicipalNotification,
  MunicipalNotificationId,
} from "../types";
import {
  formatMunicipalNotificationDate,
  getMunicipalNotificationIcon,
  getMunicipalNotificationIconClass,
  getMunicipalNotificationTypeLabel,
} from "../utils";

type MunicipalNotificationItemProps = {
  notification: MunicipalNotification;
  updatingId: MunicipalNotificationId | null;
  deletingId: MunicipalNotificationId | null;
  onOpen: (notification: MunicipalNotification) => void;
  onMarkAsRead: (notificationId: MunicipalNotificationId) => void;
  onDelete: (notificationId: MunicipalNotificationId) => void;
};

export default function MunicipalNotificationItem({
  notification,
  updatingId,
  deletingId,
  onOpen,
  onMarkAsRead,
  onDelete,
}: MunicipalNotificationItemProps) {
  const NotificationIcon = getMunicipalNotificationIcon(
    notification.type,
  );

  const isUpdating = updatingId === notification.id;
  const isDeleting = deletingId === notification.id;

  const notificationTitle =
    notification.title?.trim() ||
    getMunicipalNotificationTypeLabel(notification.type);

  return (
    <article
      className={`group relative p-4 transition sm:p-6 ${
        notification.read
          ? "bg-white hover:bg-slate-50"
          : "bg-blue-50/50 hover:bg-blue-50"
      }`}
    >
      <div className="flex gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onOpen(notification)}
          disabled={isUpdating}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-60 ${getMunicipalNotificationIconClass(
            notification.type,
          )}`}
          aria-label="Open notification"
        >
          <NotificationIcon className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(notification)}
            disabled={isUpdating}
            className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900">
                {notificationTitle}
              </p>

              {!notification.read && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  <Circle className="h-2 w-2 fill-current" />
                  Unread
                </span>
              )}
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              {notification.message}
            </p>

            {notification.eventTitle && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
                <CalendarDays className="h-3.5 w-3.5" />
                {notification.eventTitle}
              </div>
            )}

            <p className="mt-3 text-xs font-medium text-slate-400">
              {formatMunicipalNotificationDate(
                notification.created_at,
              )}
            </p>
          </button>
        </div>

        <div className="flex shrink-0 items-start gap-1">
          {!notification.read && (
            <button
              type="button"
              onClick={() => onMarkAsRead(notification.id)}
              disabled={isUpdating}
              title="Mark as read"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(notification.id)}
            disabled={isDeleting}
            title="Delete notification"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
