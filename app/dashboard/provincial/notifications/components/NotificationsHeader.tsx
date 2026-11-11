"use client";

import { Bell, CheckCheck, Loader2 } from "lucide-react";

import ProvincialPageHeader, {
  provincialHeaderPrimaryButton,
} from "../../components/ProvincialPageHeader";

type NotificationsHeaderProps = {
  unreadCount: number;
  refreshing: boolean;
  markingAll: boolean;
  onRefresh: () => void;
  onMarkAllAsRead: () => void;
};

export default function NotificationsHeader({
  unreadCount,
  refreshing,
  markingAll,
  onRefresh,
  onMarkAllAsRead,
}: NotificationsHeaderProps) {
  return (
    <ProvincialPageHeader
      icon={<Bell className="h-5 w-5" aria-hidden="true" />}
      eyebrow="Activity & Updates"
      title="Notifications"
      description="Review event notices, municipal preparation updates, official memos, and other system notifications."
      actions={
        <>
          {null}
          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={markingAll || unreadCount === 0}
            className={provincialHeaderPrimaryButton}
          >
            {markingAll ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck aria-hidden="true" className="h-4 w-4" />
            )}
            Mark all as read
          </button>
        </>
      }
    />
  );
}
