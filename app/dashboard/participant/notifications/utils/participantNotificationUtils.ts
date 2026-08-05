import {
    Bell,
    CalendarDays,
    CheckCircle2,
    TicketCheck,
    UserCheck,
    XCircle,
} from "lucide-react";

import type { NotificationRow } from "../types/participantNotifications";

export function normalizeNotificationType(
    value: string | null | undefined,
) {
    return value?.trim().toLowerCase() ?? "";
}

export function formatNotificationDateTime(
    value: string,
) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }

    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export function isRegistrationNotification(
    type: string | null,
) {
    const normalizedType =
        normalizeNotificationType(type);

    return (
        normalizedType ===
            "registration_confirmation" ||
        normalizedType.includes("registration") ||
        normalizedType.includes("rsvp")
    );
}

export function isCancellationNotification(
    type: string | null,
) {
    const normalizedType =
        normalizeNotificationType(type);

    return (
        normalizedType === "event_cancelled" ||
        normalizedType.includes("cancel")
    );
}

export function isAttendanceNotification(
    type: string | null,
) {
    const normalizedType =
        normalizeNotificationType(type);

    return (
        normalizedType ===
            "attendance_confirmation" ||
        normalizedType === "attendance_absent" ||
        normalizedType.includes("attendance") ||
        normalizedType.includes("check_in") ||
        normalizedType.includes("check-in") ||
        normalizedType.includes("present") ||
        normalizedType.includes("absent")
    );
}

export function isEventUpdateNotification(
    type: string | null,
) {
    return (
        normalizeNotificationType(type) ===
        "event_updated"
    );
}

export function isGeneralEventNotification(
    type: string | null,
) {
    const normalizedType =
        normalizeNotificationType(type);

    return [
        "event_invitation",
        "event_reminder",
        "event_updated",
    ].includes(normalizedType);
}

export function getNotificationIcon(
    type: string | null,
) {
    const normalizedType =
        normalizeNotificationType(type);

    if (isCancellationNotification(type)) {
        return XCircle;
    }

    if (isRegistrationNotification(type)) {
        return TicketCheck;
    }

    if (
        normalizedType === "attendance_absent" ||
        normalizedType.includes("absent")
    ) {
        return XCircle;
    }

    if (
        normalizedType ===
            "attendance_confirmation" ||
        normalizedType.includes("present")
    ) {
        return CheckCircle2;
    }

    if (isAttendanceNotification(type)) {
        return UserCheck;
    }

    if (isGeneralEventNotification(type)) {
        return CalendarDays;
    }

    return Bell;
}

export function getNotificationIconClasses(
    type: string | null,
) {
    const normalizedType =
        normalizeNotificationType(type);

    if (
        isCancellationNotification(type) ||
        normalizedType === "attendance_absent" ||
        normalizedType.includes("absent")
    ) {
        return "bg-red-100 text-red-700";
    }

    if (isRegistrationNotification(type)) {
        return "bg-violet-100 text-violet-700";
    }

    if (
        normalizedType ===
            "attendance_confirmation" ||
        normalizedType.includes("present")
    ) {
        return "bg-green-100 text-green-700";
    }

    if (isAttendanceNotification(type)) {
        return "bg-amber-100 text-amber-700";
    }

    if (isGeneralEventNotification(type)) {
        return "bg-blue-100 text-blue-700";
    }

    return "bg-slate-100 text-slate-700";
}

export function getNotificationRoute(
    notification: NotificationRow,
) {
    const normalizedType =
        normalizeNotificationType(notification.type);

    if (
        normalizedType.includes("attendance_pass") ||
        normalizedType.includes("check_in") ||
        normalizedType.includes("check-in")
    ) {
        return "/dashboard/participant/attendance-pass";
    }

    if (
        isAttendanceNotification(notification.type)
    ) {
        return "/dashboard/participant/attendance-history";
    }

    if (
        isRegistrationNotification(notification.type) ||
        isCancellationNotification(notification.type)
    ) {
        return "/dashboard/participant/registrations";
    }

    if (
        isGeneralEventNotification(notification.type) ||
        notification.event_id ||
        notification.event_municipality_id
    ) {
        return "/dashboard/participant/events";
    }

    return "/dashboard/participant";
}
