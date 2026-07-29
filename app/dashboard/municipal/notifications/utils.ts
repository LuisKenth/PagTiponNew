import {
  AlarmClock,
  CalendarDays,
  CircleCheckBig,
  CircleX,
  Info,
  PencilLine,
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
  { label: "Event Updates", value: "updates" },
  { label: "Cancellations", value: "cancellations" },
  { label: "Reminders", value: "reminders" },
  { label: "System", value: "system" },
];

/*
 * Convert notification types into a consistent format.
 */
export function normalizeMunicipalNotificationType(
  type: string | null,
) {
  return type?.toLowerCase().trim() ?? "";
}

/*
 * NOTIFICATION TYPE CHECKERS
 */
export function isEventInvitationNotification(
  type: string | null,
) {
  return (
    normalizeMunicipalNotificationType(type) ===
    "event_invitation"
  );
}

export function isEventUpdatedNotification(
  type: string | null,
) {
  return (
    normalizeMunicipalNotificationType(type) ===
    "event_updated"
  );
}

export function isEventCancelledNotification(
  type: string | null,
) {
  return (
    normalizeMunicipalNotificationType(type) ===
    "event_cancelled"
  );
}

export function isReminderNotification(
  type: string | null,
) {
  return (
    normalizeMunicipalNotificationType(type) ===
    "event_reminder"
  );
}

export function isSystemNotification(
  type: string | null,
) {
  const normalizedType =
    normalizeMunicipalNotificationType(type);

  return (
    normalizedType === "system" ||
    normalizedType === "registration_confirmation" ||
    normalizedType === "attendance_confirmation" ||
    normalizedType === "after_event_acknowledgment"
  );
}

/*
 * Returns true for notifications connected
 * to a received provincial event.
 */
export function isMunicipalEventNotification(
  type: string | null,
) {
  return (
    isEventInvitationNotification(type) ||
    isEventUpdatedNotification(type) ||
    isEventCancelledNotification(type) ||
    isReminderNotification(type)
  );
}

/*
 * NOTIFICATION ICON
 */
export function getMunicipalNotificationIcon(
  type: string | null,
): LucideIcon {
  if (isEventInvitationNotification(type)) {
    return CalendarDays;
  }

  if (isEventUpdatedNotification(type)) {
    return PencilLine;
  }

  if (isEventCancelledNotification(type)) {
    return CircleX;
  }

  if (isReminderNotification(type)) {
    return AlarmClock;
  }

  if (isSystemNotification(type)) {
    return CircleCheckBig;
  }

  return Info;
}

/*
 * ICON BACKGROUND AND TEXT STYLE
 */
export function getMunicipalNotificationIconClass(
  type: string | null,
) {
  if (isEventInvitationNotification(type)) {
    return "bg-blue-100 text-blue-700";
  }

  if (isEventUpdatedNotification(type)) {
    return "bg-violet-100 text-violet-700";
  }

  if (isEventCancelledNotification(type)) {
    return "bg-red-100 text-red-700";
  }

  if (isReminderNotification(type)) {
    return "bg-amber-100 text-amber-700";
  }

  if (isSystemNotification(type)) {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

/*
 * OPTIONAL CARD STYLE
 *
 * Gagamitin natin ito sa MunicipalNotificationList
 * para maging malinaw ang cancelled notification.
 */
export function getMunicipalNotificationCardClass(
  notification: MunicipalNotification,
) {
  if (isEventCancelledNotification(notification.type)) {
    return notification.read
      ? "border-red-200 bg-red-50/40"
      : "border-red-300 bg-red-50";
  }

  if (isEventUpdatedNotification(notification.type)) {
    return notification.read
      ? "border-violet-100 bg-white"
      : "border-violet-200 bg-violet-50/50";
  }

  if (!notification.read) {
    return "border-blue-200 bg-blue-50/40";
  }

  return "border-slate-200 bg-white";
}

/*
 * HUMAN-READABLE TYPE LABEL
 */
export function getMunicipalNotificationTypeLabel(
  type: string | null,
) {
  if (isEventInvitationNotification(type)) {
    return "Event Invitation";
  }

  if (isEventUpdatedNotification(type)) {
    return "Event Updated";
  }

  if (isEventCancelledNotification(type)) {
    return "Event Cancelled";
  }

  if (isReminderNotification(type)) {
    return "Event Reminder";
  }

  if (!type) {
    return "System Notification";
  }

  return type
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

/*
 * DATE FORMAT
 */
export function formatMunicipalNotificationDate(
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

/*
 * FILTER LOGIC
 */
export function matchesMunicipalNotificationFilter(
  notification: MunicipalNotification,
  filter: MunicipalNotificationFilter,
) {
  switch (filter) {
    case "unread":
      return !notification.read;

    case "invitations":
      return isEventInvitationNotification(
        notification.type,
      );

    case "updates":
      return isEventUpdatedNotification(
        notification.type,
      );

    case "cancellations":
      return isEventCancelledNotification(
        notification.type,
      );

    case "reminders":
      return isReminderNotification(
        notification.type,
      );

    case "system":
      return isSystemNotification(
        notification.type,
      );

    case "all":
    default:
      return true;
  }
}

/*
 * EXACT RECEIVED-EVENT NAVIGATION
 *
 * event_municipality_id is prioritized because
 * it points to the exact municipal assignment.
 *
 * event_id remains available as a fallback and
 * for validating the parent provincial event.
 */
export function getMunicipalNotificationLink(
  notification: MunicipalNotification,
) {
  const searchParameters =
    new URLSearchParams();

  if (notification.event_municipality_id) {
    searchParameters.set(
      "assignmentId",
      notification.event_municipality_id,
    );
  }

  if (notification.event_id) {
    searchParameters.set(
      "eventId",
      notification.event_id,
    );
  }

  const normalizedType =
    normalizeMunicipalNotificationType(
      notification.type,
    );

  if (normalizedType) {
    searchParameters.set(
      "notificationType",
      normalizedType,
    );
  }

  if (searchParameters.size > 0) {
    return `/dashboard/municipal?${searchParameters.toString()}`;
  }

  return "/dashboard/municipal";
}