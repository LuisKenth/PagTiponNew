"use client";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";

import { Bell, CheckCheck, Loader2 } from "lucide-react";

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
    <MunicipalPageHeader
      icon={<Bell className="h-6 w-6" />}
      title={
        <span className="inline-flex items-center gap-2">
          Notifications
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
      }
      description="Review event invitations, updates, cancellations, reminders, and system notifications."
      actions={
        <>
          {null}
          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={isBusy || unreadCount === 0}
            aria-label="Mark all municipal notifications as read"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            {markingAll ? "Marking as read..." : "Mark all as read"}
          </button>
        </>
      }
    />
  );
}
