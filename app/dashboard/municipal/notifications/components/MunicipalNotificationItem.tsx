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

  const isBusy = isUpdating || isDeleting;

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

  /*
   * Avoid showing the same cancellation explanation twice
   * when it is already included in the notification message.
   */
  const normalizedMessage =
    notification.message?.toLowerCase() ?? "";

  const messageAlreadyExplainsStoppedOperations =
    normalizedMessage.includes("preparation") &&
    normalizedMessage.includes("registration") &&
    (normalizedMessage.includes("stopped") ||
      normalizedMessage.includes("closed") ||
      normalizedMessage.includes("disabled"));

  const showCancellationWarning =
    isCancelled &&
    !messageAlreadyExplainsStoppedOperations;

  const canOpenEvent = Boolean(
    notification.event_id ||
      notification.event_municipality_id,
  );

  return (
    <article
      aria-busy={isBusy}
      className={`group relative border-l-4 p-4 transition sm:p-5 ${getMunicipalNotificationCardClass(
        notification,
      )}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* NOTIFICATION ICON */}
        <button
          type="button"
          onClick={() => onOpen(notification)}
          disabled={isBusy}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:w-11 ${getMunicipalNotificationIconClass(
            notification.type,
          )}`}
          aria-label={openActionLabel}
          title={openActionLabel}
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
            disabled={isBusy}
            className="block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <p className="text-sm font-bold text-slate-900">
                {notificationTitle}
              </p>

              {!notification.read && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:text-xs ${
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
                <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 sm:text-xs">
                  Updated
                </span>
              )}

              {isCancelled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 sm:text-xs">
                  <TriangleAlert className="h-3 w-3" />
                  Cancelled
                </span>
              )}
            </div>

            <p className="mt-1 break-words text-sm leading-5 text-slate-600">
              {notification.message}
            </p>

            {/* CANCELLATION WARNING */}
            {showCancellationWarning && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-100/70 px-3 py-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />

                <p className="text-xs font-medium leading-5 text-red-700">
                  Municipal preparation and participant
                  registration for this event have been
                  stopped.
                </p>
              </div>
            )}

            {/* EVENT INFORMATION AND OPEN ACTION */}
            {(notification.eventTitle || canOpenEvent) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                {notification.eventTitle && (
                  <span
                    className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ${
                      isCancelled
                        ? "bg-white text-red-700 ring-red-200"
                        : isUpdated
                          ? "bg-white text-violet-700 ring-violet-200"
                          : "bg-white text-slate-600 ring-slate-200"
                    }`}
                  >
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />

                    <span className="truncate">
                      {notification.eventTitle}
                    </span>
                  </span>
                )}

                {canOpenEvent && (
                  <span
                    className={`text-xs font-semibold ${
                      isCancelled
                        ? "text-red-700"
                        : isUpdated
                          ? "text-violet-700"
                          : "text-blue-700"
                    }`}
                  >
                    {openActionLabel} →
                  </span>
                )}
              </div>
            )}

            <p className="mt-2 text-xs font-medium text-slate-400">
              {formatMunicipalNotificationDate(
                notification.created_at,
              )}
            </p>
          </button>
        </div>

        {/* ITEM ACTIONS */}
        <div className="flex shrink-0 items-start gap-0.5 sm:gap-1">
          {!notification.read && (
            <button
              type="button"
              onClick={() =>
                onMarkAsRead(notification.id)
              }
              disabled={isBusy}
              title="Mark as read"
              aria-label="Mark notification as read"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9"
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
            disabled={isBusy}
            title="Delete notification"
            aria-label="Delete notification"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9"
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