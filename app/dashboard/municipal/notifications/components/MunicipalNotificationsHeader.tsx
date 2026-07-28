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
  return (
    <div className="border-b border-slate-100 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Bell className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">
                Municipal Admin
              </p>

              <h1 className="text-2xl font-bold text-slate-900">
                Notifications
              </h1>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Review provincial event invitations, reminders,
            confirmations, and important system updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={markingAll || unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}

            Mark all as read
          </button>
        </div>
      </div>
    </div>
  );
}
