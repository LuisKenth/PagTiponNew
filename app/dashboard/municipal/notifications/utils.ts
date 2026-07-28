import {
  AlarmClock,
  CalendarDays,
  CircleCheckBig,
  Info,
  type LucideIcon,
} from "lucide-react";

import type {
  MunicipalNotification,
  MunicipalNotificationFilter,
} from "./types";

export const municipalNotificationFilters: {
  label: string;
  value: MunicipalNotificationFilter;
}[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Event Invitations", value: "invitations" },
  { label: "Reminders", value: "reminders" },
  { label: "System", value: "system" },
];

export function normalizeMunicipalNotificationType(type: string | null) {
  return type?.toLowerCase().trim() ?? "";
}

export function isEventInvitationNotification(type: string | null) {
  return normalizeMunicipalNotificationType(type) === "event_invitation";
}

export function isReminderNotification(type: string | null) {
  return normalizeMunicipalNotificationType(type) === "event_reminder";
}

export function isSystemNotification(type: string | null) {
  const normalizedType = normalizeMunicipalNotificationType(type);

  return (
    normalizedType === "system" ||
    normalizedType === "registration_confirmation" ||
    normalizedType === "attendance_confirmation" ||
    normalizedType === "after_event_acknowledgment"
  );
}

export function getMunicipalNotificationIcon(
  type: string | null,
): LucideIcon {
  if (isEventInvitationNotification(type)) return CalendarDays;
  if (isReminderNotification(type)) return AlarmClock;
  if (isSystemNotification(type)) return CircleCheckBig;
  return Info;
}

export function getMunicipalNotificationIconClass(type: string | null) {
  if (isEventInvitationNotification(type)) {
    return "bg-blue-100 text-blue-700";
  }

  if (isReminderNotification(type)) {
    return "bg-amber-100 text-amber-700";
  }

  if (isSystemNotification(type)) {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

export function getMunicipalNotificationTypeLabel(type: string | null) {
  if (!type) return "System Notification";

  return type
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatMunicipalNotificationDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function matchesMunicipalNotificationFilter(
  notification: MunicipalNotification,
  filter: MunicipalNotificationFilter,
) {
  switch (filter) {
    case "unread":
      return !notification.read;
    case "invitations":
      return isEventInvitationNotification(notification.type);
    case "reminders":
      return isReminderNotification(notification.type);
    case "system":
      return isSystemNotification(notification.type);
    default:
      return true;
  }
}

export function getMunicipalNotificationLink(
  notification: MunicipalNotification,
) {
  if (notification.event_id || notification.event_municipality_id) {
    const searchParameters = new URLSearchParams();

    if (notification.event_id) {
      searchParameters.set("eventId", notification.event_id);
    }

    if (notification.event_municipality_id) {
      searchParameters.set(
        "assignmentId",
        notification.event_municipality_id,
      );
    }

    return `/dashboard/municipal?${searchParameters.toString()}`;
  }

  return "/dashboard/municipal";
}
