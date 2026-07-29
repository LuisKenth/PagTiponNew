"use client";

import {
  CalendarDays,
  Check,
  Circle,
  Loader2,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import type {
  MunicipalNotification,
  MunicipalNotificationId,
} from "../types";

import {
  formatMunicipalNotificationDate,
  getMunicipalNotificationCardClass,
  getMunicipalNotificationIcon,
  getMunicipalNotificationIconClass,
  getMunicipalNotificationTypeLabel,
  isEventCancelledNotification,
  isEventUpdatedNotification,
} from "../utils";

type MunicipalNotificationItemProps = {
  notification: MunicipalNotification;
  updatingId: MunicipalNotificationId | null;
  deletingId: MunicipalNotificationId | null;
  onOpen: (notification: MunicipalNotification) => void;
  onMarkAsRead: (
    notificationId: MunicipalNotificationId,
  ) => void;
  onDelete: (
    notificationId: MunicipalNotificationId,
  ) => void;
};

export default function MunicipalNotificationItem({
  notification,
  updatingId,
  deletingId,
  onOpen,
  onMarkAsRead,
  onDelete,
}: MunicipalNotificationItemProps) {
  const NotificationIcon =
    getMunicipalNotificationIcon(notification.type);

  const isUpdating =
    updatingId === notification.id;

  const isDeleting =
    deletingId === notification.id;

  const isUpdated =
    isEventUpdatedNotification(notification.type);

  const isCancelled =
    isEventCancelledNotification(notification.type);

  const notificationTitle =
    notification.title?.trim() ||
    getMunicipalNotificationTypeLabel(
      notification.type,
    );

  const openActionLabel = isCancelled
    ? "View cancelled event"
    : isUpdated
      ? "Review event changes"
      : "Open notification";

  return (
    <article
      className={`group relative border-l-4 p-4 transition sm:p-6 ${getMunicipalNotificationCardClass(
        notification,
      )}`}
    >
      <div className="flex gap-3 sm:gap-4">
        {/* NOTIFICATION ICON */}
        <button
          type="button"
          onClick={() => onOpen(notification)}
          disabled={isUpdating || isDeleting}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-60 ${getMunicipalNotificationIconClass(
            notification.type,
          )}`}
          aria-label={openActionLabel}
        >
          {isUpdating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <NotificationIcon className="h-5 w-5" />
          )}
        </button>

        {/* NOTIFICATION CONTENT */}
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(notification)}
            disabled={isUpdating || isDeleting}
            className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900">
                {notificationTitle}
              </p>

              {!notification.read && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isCancelled
                      ? "bg-red-100 text-red-700"
                      : isUpdated
                        ? "bg-violet-100 text-violet-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <Circle className="h-2 w-2 fill-current" />
                  Unread
                </span>
              )}

              {isUpdated && (
                <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                  Updated
                </span>
              )}

              {isCancelled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  <TriangleAlert className="h-3 w-3" />
                  Cancelled
                </span>
              )}
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              {notification.message}
            </p>

            {/* CANCELLATION WARNING */}
            {isCancelled && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-100/70 px-3 py-2.5">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />

                <p className="text-xs font-medium leading-5 text-red-700">
                  Municipal preparation and participant
                  registration for this event have been
                  stopped.
                </p>
              </div>
            )}

            {/* EVENT NAME */}
            {notification.eventTitle && (
              <div
                className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-sm ring-1 ${
                  isCancelled
                    ? "bg-white text-red-700 ring-red-200"
                    : isUpdated
                      ? "bg-white text-violet-700 ring-violet-200"
                      : "bg-white text-slate-600 ring-slate-200"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />

                {notification.eventTitle}
              </div>
            )}

            {/* OPEN ACTION LABEL */}
            {(notification.event_id ||
              notification.event_municipality_id) && (
              <p
                className={`mt-3 text-xs font-semibold ${
                  isCancelled
                    ? "text-red-700"
                    : isUpdated
                      ? "text-violet-700"
                      : "text-blue-700"
                }`}
              >
                {openActionLabel} →
              </p>
            )}

            <p className="mt-3 text-xs font-medium text-slate-400">
              {formatMunicipalNotificationDate(
                notification.created_at,
              )}
            </p>
          </button>
        </div>

        {/* ITEM ACTIONS */}
        <div className="flex shrink-0 items-start gap-1">
          {!notification.read && (
            <button
              type="button"
              onClick={() =>
                onMarkAsRead(notification.id)
              }
              disabled={isUpdating || isDeleting}
              title="Mark as read"
              aria-label="Mark notification as read"
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
            onClick={() =>
              onDelete(notification.id)
            }
            disabled={isDeleting || isUpdating}
            title="Delete notification"
            aria-label="Delete notification"
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