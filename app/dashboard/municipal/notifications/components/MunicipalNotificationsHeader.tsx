"use client";

import {
  Bell,
  CheckCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";

type MunicipalNotificationsHeaderProps = {
  unreadCount: number;
  refreshing: boolean;
  markingAll: boolean;
  onRefresh: () => void;
  onMarkAllAsRead: () => void;
};

export default function MunicipalNotificationsHeader({
  unreadCount,
  refreshing,
  markingAll,
  onRefresh,
  onMarkAllAsRead,
}: MunicipalNotificationsHeaderProps) {
  const isBusy = refreshing || markingAll;

  return (
    <div className="border-b border-slate-100 px-4 py-5 sm:px-5">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white sm:h-11 sm:w-11">
              <Bell className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal">
                Municipal Admin
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Notifications
                </h1>

                {unreadCount > 0 && (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Review provincial event invitations, updates,
            cancellations, reminders, and important system
            notifications.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isBusy}
            aria-label="Refresh municipal notifications"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={
              markingAll ||
              refreshing ||
              unreadCount === 0
            }
            aria-label="Mark all municipal notifications as read"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}

            {markingAll
              ? "Marking as read..."
              : "Mark all as read"}
          </button>
        </div>
      </div>
    </div>
  );
}