import {
  Building2,
  CalendarDays,
  FileText,
  Info,
  type LucideIcon,
} from "lucide-react";

import type {
  NotificationFilter,
  ProvincialNotification,
} from "./types";

export const NOTIFICATION_UPDATE_EVENT =
  "provincial-notifications-updated";

export const notificationFilters: {
  label: string;
  value: NotificationFilter;
}[] = [
    {
      label: "All",
      value: "all",
    },
    {
      label: "Unread",
      value: "unread",
    },
    {
      label: "Events",
      value: "events",
    },
    {
      label: "Municipal Updates",
      value: "municipalities",
    },
    {
      label: "Memos",
      value: "memos",
    },
  ];

export function normalizeNotificationType(type: string | null) {
  return type?.toLowerCase().trim() ?? "";
}

export function isEventNotification(type: string | null) {
  const normalizedType = normalizeNotificationType(type);

  return (
    normalizedType.includes("event") ||
    normalizedType.includes("schedule") ||
    normalizedType.includes("attendance") ||
    normalizedType.includes("registration")
  );
}

export function isMunicipalityNotification(type: string | null) {
  const normalizedType = normalizeNotificationType(type);

  return (
    normalizedType.includes("municipal") ||
    normalizedType.includes("preparation") ||
    normalizedType.includes("prepared")
  );
}

export function isMemoNotification(type: string | null) {
  const normalizedType = normalizeNotificationType(type);

  return (
    normalizedType.includes("memo") ||
    normalizedType.includes("notice") ||
    normalizedType.includes("document")
  );
}

export function getNotificationIcon(
  type: string | null,
): LucideIcon {
  if (isMunicipalityNotification(type)) {
    return Building2;
  }

  if (isMemoNotification(type)) {
    return FileText;
  }

  if (isEventNotification(type)) {
    return CalendarDays;
  }

  return Info;
}

export function getNotificationIconClass(
  type: string | null,
) {
  if (isMunicipalityNotification(type)) {
    return "bg-violet-100 text-violet-700";
  }

  if (isMemoNotification(type)) {
    return "bg-amber-100 text-amber-700";
  }

  if (isEventNotification(type)) {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

export function getNotificationTypeLabel(
  type: string | null,
) {
  if (!type) {
    return "System Notification";
  }

  return type
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatNotificationDate(
  dateString: string,
) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function getNotificationLink(
  notification: ProvincialNotification,
) {
  if (isMemoNotification(notification.type)) {
    return "/dashboard/provincial/memos";
  }

  if (notification.event_id) {
    return `/dashboard/provincial/events/${notification.event_id}`;
  }

  if (isMunicipalityNotification(notification.type)) {
    return "/dashboard/provincial/municipalities";
  }

  if (isEventNotification(notification.type)) {
    return "/dashboard/provincial/events";
  }

  return null;
}

export function matchesNotificationFilter(
  notification: ProvincialNotification,
  filter: NotificationFilter,
) {
  switch (filter) {
    case "unread":
      return !notification.read;

    case "events":
      return isEventNotification(notification.type);

    case "municipalities":
      return isMunicipalityNotification(notification.type);

    case "memos":
      return isMemoNotification(notification.type);

    default:
      return true;
  }
}
