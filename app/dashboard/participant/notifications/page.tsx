"use client";

import {
    Bell,
    BellRing,
    CalendarDays,
    CheckCheck,
    CheckCircle2,
    Clock3,
    RefreshCw,
    TicketCheck,
    Trash2,
    UserCheck,
    XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

import { PARTICIPANT_NOTIFICATION_UPDATE_EVENT } from "../hooks/useParticipantUnreadCount";

type NotificationRow = {
    id: string;
    user_id: string;
    type: string | null;
    title: string;
    message: string;
    read: boolean;
    event_id: string | null;
    event_municipality_id: string | null;
    created_at: string;
};

type NotificationFilter =
    | "all"
    | "unread"
    | "event_updates"
    | "cancellations"
    | "attendance";

function normalizeType(
    value: string | null | undefined,
) {
    return value?.trim().toLowerCase() ?? "";
}

function formatDateTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }

    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function isCancellationNotification(
    type: string | null,
) {
    const normalizedType =
        normalizeType(type);

    return (
        normalizedType.includes(
            "cancel",
        ) ||
        normalizedType ===
            "event_cancelled"
    );
}

function isAttendanceNotification(
    type: string | null,
) {
    const normalizedType =
        normalizeType(type);

    return (
        normalizedType.includes(
            "attendance",
        ) ||
        normalizedType.includes(
            "check_in",
        ) ||
        normalizedType.includes(
            "check-in",
        ) ||
        normalizedType.includes(
            "present",
        ) ||
        normalizedType.includes(
            "absent",
        )
    );
}

function isEventUpdateNotification(
    type: string | null,
) {
    const normalizedType =
        normalizeType(type);

    if (
        isCancellationNotification(type) ||
        isAttendanceNotification(type)
    ) {
        return false;
    }

    return (
        normalizedType.includes("event") ||
        normalizedType.includes(
            "registration",
        ) ||
        normalizedType.includes(
            "rsvp",
        ) ||
        normalizedType.includes(
            "invitation",
        ) ||
        normalizedType.includes(
            "reminder",
        )
    );
}

function getNotificationIcon(
    type: string | null,
) {
    const normalizedType =
        normalizeType(type);

    if (
        isCancellationNotification(type)
    ) {
        return XCircle;
    }

    if (
        normalizedType.includes(
            "registration",
        ) ||
        normalizedType.includes("rsvp")
    ) {
        return TicketCheck;
    }

    if (
        normalizedType.includes(
            "present",
        ) ||
        normalizedType.includes(
            "confirmed",
        )
    ) {
        return CheckCircle2;
    }

    if (
        normalizedType.includes(
            "absent",
        )
    ) {
        return XCircle;
    }

    if (
        isAttendanceNotification(type)
    ) {
        return UserCheck;
    }

    if (
        isEventUpdateNotification(type)
    ) {
        return CalendarDays;
    }

    return Bell;
}

function getNotificationIconClasses(
    type: string | null,
) {
    const normalizedType =
        normalizeType(type);

    if (
        isCancellationNotification(type) ||
        normalizedType.includes(
            "absent",
        )
    ) {
        return "bg-red-100 text-red-700";
    }

    if (
        normalizedType.includes(
            "present",
        ) ||
        normalizedType.includes(
            "confirmed",
        )
    ) {
        return "bg-green-100 text-green-700";
    }

    if (
        isAttendanceNotification(type)
    ) {
        return "bg-amber-100 text-amber-700";
    }

    if (
        normalizedType.includes(
            "registration",
        ) ||
        normalizedType.includes("rsvp")
    ) {
        return "bg-violet-100 text-violet-700";
    }

    if (
        isEventUpdateNotification(type)
    ) {
        return "bg-blue-100 text-blue-700";
    }

    return "bg-slate-100 text-slate-700";
}

function getNotificationRoute(
    notification: NotificationRow,
) {
    const normalizedType =
        normalizeType(notification.type);

    if (
        normalizedType.includes(
            "check_in",
        ) ||
        normalizedType.includes(
            "check-in",
        ) ||
        normalizedType.includes(
            "attendance_pass",
        )
    ) {
        return "/dashboard/participant/attendance-pass";
    }

    if (
        normalizedType.includes(
            "attendance",
        ) ||
        normalizedType.includes(
            "present",
        ) ||
        normalizedType.includes(
            "absent",
        )
    ) {
        return "/dashboard/participant/attendance-history";
    }

    if (
        normalizedType.includes(
            "registration",
        ) ||
        normalizedType.includes("rsvp") ||
        isCancellationNotification(
            notification.type,
        )
    ) {
        return "/dashboard/participant/registrations";
    }

    if (
        notification.event_id ||
        notification.event_municipality_id ||
        normalizedType.includes("event")
    ) {
        return "/dashboard/participant/events";
    }

    return "/dashboard/participant";
}

function dispatchNotificationUpdate() {
    window.dispatchEvent(
        new Event(
            PARTICIPANT_NOTIFICATION_UPDATE_EVENT,
        ),
    );
}

export default function ParticipantNotificationsPage() {
    const router = useRouter();

    const [
        notifications,
        setNotifications,
    ] = useState<NotificationRow[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [
        activeFilter,
        setActiveFilter,
    ] = useState<NotificationFilter>("all");

    const [
        actionNotificationId,
        setActionNotificationId,
    ] = useState<string | null>(null);

    const [
        markingAllRead,
        setMarkingAllRead,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const fetchNotifications =
        useCallback(async (
            refreshOnly = false,
        ) => {
            if (refreshOnly) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setErrorMessage("");

            try {
                const {
                    data: { user },
                    error: userError,
                } =
                    await supabase.auth.getUser();

                if (userError || !user) {
                    throw new Error(
                        userError?.message ||
                            "Participant user not found.",
                    );
                }

                const {
                    data,
                    error,
                } = await supabase
                    .from("notifications")
                    .select(
                        `
                            id,
                            user_id,
                            type,
                            title,
                            message,
                            read,
                            event_id,
                            event_municipality_id,
                            created_at
                        `,
                    )
                    .eq("user_id", user.id)
                    .order("created_at", {
                        ascending: false,
                    })
                    .limit(100);

                if (error) {
                    throw error;
                }

                setNotifications(
                    (data ||
                        []) as NotificationRow[],
                );

                dispatchNotificationUpdate();
            } catch (error) {
                console.error(
                    "Participant notifications fetch error:",
                    error,
                );

                setNotifications([]);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to load notifications.",
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        }, []);

    useEffect(() => {
        void fetchNotifications();
    }, [fetchNotifications]);

    const notificationCounts =
        useMemo(() => {
            return {
                total:
                    notifications.length,

                unread:
                    notifications.filter(
                        (notification) =>
                            !notification.read,
                    ).length,

                eventUpdates:
                    notifications.filter(
                        (notification) =>
                            isEventUpdateNotification(
                                notification.type,
                            ),
                    ).length,

                cancellations:
                    notifications.filter(
                        (notification) =>
                            isCancellationNotification(
                                notification.type,
                            ),
                    ).length,

                attendance:
                    notifications.filter(
                        (notification) =>
                            isAttendanceNotification(
                                notification.type,
                            ),
                    ).length,
            };
        }, [notifications]);

    const filteredNotifications =
        useMemo(() => {
            if (activeFilter === "unread") {
                return notifications.filter(
                    (notification) =>
                        !notification.read,
                );
            }

            if (
                activeFilter ===
                "event_updates"
            ) {
                return notifications.filter(
                    (notification) =>
                        isEventUpdateNotification(
                            notification.type,
                        ),
                );
            }

            if (
                activeFilter ===
                "cancellations"
            ) {
                return notifications.filter(
                    (notification) =>
                        isCancellationNotification(
                            notification.type,
                        ),
                );
            }

            if (
                activeFilter ===
                "attendance"
            ) {
                return notifications.filter(
                    (notification) =>
                        isAttendanceNotification(
                            notification.type,
                        ),
                );
            }

            return notifications;
        }, [
            activeFilter,
            notifications,
        ]);

    const filters: {
        value: NotificationFilter;
        label: string;
        count: number;
    }[] = [
        {
            value: "all",
            label: "All",
            count:
                notificationCounts.total,
        },
        {
            value: "unread",
            label: "Unread",
            count:
                notificationCounts.unread,
        },
        {
            value: "event_updates",
            label: "Event Updates",
            count:
                notificationCounts.eventUpdates,
        },
        {
            value: "cancellations",
            label: "Cancellations",
            count:
                notificationCounts.cancellations,
        },
        {
            value: "attendance",
            label: "Attendance",
            count:
                notificationCounts.attendance,
        },
    ];

    const handleMarkAsRead = async (
        notificationId: string,
    ) => {
        setActionNotificationId(
            notificationId,
        );

        try {
            const {
                data: { user },
                error: userError,
            } =
                await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "Participant user not found.",
                );
            }

            const { error } = await supabase
                .from("notifications")
                .update({
                    read: true,
                })
                .eq("id", notificationId)
                .eq("user_id", user.id);

            if (error) {
                throw error;
            }

            setNotifications(
                (currentNotifications) =>
                    currentNotifications.map(
                        (notification) =>
                            notification.id ===
                            notificationId
                                ? {
                                      ...notification,
                                      read: true,
                                  }
                                : notification,
                    ),
            );

            dispatchNotificationUpdate();
        } catch (error) {
            console.error(
                "Participant notification mark-read error:",
                error,
            );

            alert(
                "Unable to mark the notification as read.",
            );
        } finally {
            setActionNotificationId(null);
        }
    };

    const handleMarkAllAsRead =
        async () => {
            if (
                notificationCounts.unread === 0 ||
                markingAllRead
            ) {
                return;
            }

            setMarkingAllRead(true);

            try {
                const {
                    data: { user },
                    error: userError,
                } =
                    await supabase.auth.getUser();

                if (userError || !user) {
                    throw new Error(
                        "Participant user not found.",
                    );
                }

                const { error } =
                    await supabase
                        .from("notifications")
                        .update({
                            read: true,
                        })
                        .eq(
                            "user_id",
                            user.id,
                        )
                        .eq("read", false);

                if (error) {
                    throw error;
                }

                setNotifications(
                    (
                        currentNotifications,
                    ) =>
                        currentNotifications.map(
                            (
                                notification,
                            ) => ({
                                ...notification,
                                read: true,
                            }),
                        ),
                );

                dispatchNotificationUpdate();
            } catch (error) {
                console.error(
                    "Participant mark-all-read error:",
                    error,
                );

                alert(
                    "Unable to mark all notifications as read.",
                );
            } finally {
                setMarkingAllRead(false);
            }
        };

    const handleDelete = async (
        notificationId: string,
    ) => {
        const confirmed = window.confirm(
            "Delete this notification?",
        );

        if (!confirmed) {
            return;
        }

        setActionNotificationId(
            notificationId,
        );

        try {
            const {
                data: { user },
                error: userError,
            } =
                await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "Participant user not found.",
                );
            }

            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("id", notificationId)
                .eq("user_id", user.id);

            if (error) {
                throw error;
            }

            setNotifications(
                (currentNotifications) =>
                    currentNotifications.filter(
                        (notification) =>
                            notification.id !==
                            notificationId,
                    ),
            );

            dispatchNotificationUpdate();
        } catch (error) {
            console.error(
                "Participant notification delete error:",
                error,
            );

            alert(
                "Unable to delete the notification.",
            );
        } finally {
            setActionNotificationId(null);
        }
    };

    const handleOpenNotification =
        async (
            notification: NotificationRow,
        ) => {
            if (!notification.read) {
                await handleMarkAsRead(
                    notification.id,
                );
            }

            router.push(
                getNotificationRoute(
                    notification,
                ),
            );
        };

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Participant Updates
                            </p>

                            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                                Notifications
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Review event updates,
                                cancellations,
                                registration notices,
                                and attendance results.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    void handleMarkAllAsRead()
                                }
                                disabled={
                                    markingAllRead ||
                                    notificationCounts.unread ===
                                        0
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <CheckCheck
                                    className="size-4"
                                    aria-hidden="true"
                                />

                                {markingAllRead
                                    ? "Marking..."
                                    : "Mark All Read"}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void fetchNotifications(
                                        true,
                                    )
                                }
                                disabled={refreshing}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw
                                    className={`size-4 ${
                                        refreshing
                                            ? "animate-spin"
                                            : ""
                                    }`}
                                    aria-hidden="true"
                                />

                                {refreshing
                                    ? "Refreshing..."
                                    : "Refresh"}
                            </button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">
                                    Total
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {loading
                                        ? "—"
                                        : notificationCounts.total}
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <Bell
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">
                                    Unread
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {loading
                                        ? "—"
                                        : notificationCounts.unread}
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <BellRing
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">
                                    Event Notices
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {loading
                                        ? "—"
                                        : notificationCounts.eventUpdates +
                                          notificationCounts.cancellations}
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                                <CalendarDays
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">
                                    Attendance
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {loading
                                        ? "—"
                                        : notificationCounts.attendance}
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                <UserCheck
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-950">
                                Notification Center
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Open a notification to
                                view its related
                                participant page.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {filters.map(
                                (filter) => {
                                    const selected =
                                        activeFilter ===
                                        filter.value;

                                    return (
                                        <button
                                            key={
                                                filter.value
                                            }
                                            type="button"
                                            onClick={() =>
                                                setActiveFilter(
                                                    filter.value,
                                                )
                                            }
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                                selected
                                                    ? "bg-slate-950 text-white"
                                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                                            }`}
                                        >
                                            {
                                                filter.label
                                            }{" "}
                                            <span
                                                className={
                                                    selected
                                                        ? "text-slate-300"
                                                        : "text-slate-400"
                                                }
                                            >
                                                {
                                                    filter.count
                                                }
                                            </span>
                                        </button>
                                    );
                                },
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div
                            aria-live="polite"
                            className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-10 text-center"
                        >
                            <div className="mx-auto size-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                            <p className="mt-4 text-sm font-medium text-slate-600">
                                Loading notifications...
                            </p>
                        </div>
                    ) : errorMessage ? (
                        <div
                            role="alert"
                            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center"
                        >
                            <p className="font-semibold text-red-800">
                                Unable to load
                                notifications
                            </p>

                            <p className="mt-1 text-sm text-red-600">
                                {errorMessage}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    void fetchNotifications()
                                }
                                className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : notifications.length ===
                      0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                                <Bell
                                    className="size-7"
                                    aria-hidden="true"
                                />
                            </div>

                            <h3 className="mt-4 text-lg font-semibold text-slate-950">
                                No notifications yet
                            </h3>

                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                Event updates,
                                registration notices,
                                and attendance results
                                will appear here.
                            </p>
                        </div>
                    ) : filteredNotifications.length ===
                      0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                            <p className="font-semibold text-slate-800">
                                No matching
                                notifications
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                There are no
                                notifications under
                                the selected filter.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-3">
                            {filteredNotifications.map(
                                (notification) => {
                                    const Icon =
                                        getNotificationIcon(
                                            notification.type,
                                        );

                                    const actionLoading =
                                        actionNotificationId ===
                                        notification.id;

                                    return (
                                        <article
                                            key={
                                                notification.id
                                            }
                                            className={`rounded-2xl border p-5 transition ${
                                                notification.read
                                                    ? "border-slate-200 bg-white"
                                                    : "border-blue-200 bg-blue-50/50"
                                            }`}
                                        >
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                                <div
                                                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${getNotificationIconClasses(
                                                        notification.type,
                                                    )}`}
                                                >
                                                    <Icon
                                                        className="size-5"
                                                        aria-hidden="true"
                                                    />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="font-semibold text-slate-950">
                                                                    {
                                                                        notification.title
                                                                    }
                                                                </h3>

                                                                {!notification.read && (
                                                                    <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                                                        New
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                                {
                                                                    notification.message
                                                                }
                                                            </p>

                                                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                                                                <Clock3
                                                                    className="size-3.5"
                                                                    aria-hidden="true"
                                                                />

                                                                {formatDateTime(
                                                                    notification.created_at,
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void handleOpenNotification(
                                                                    notification,
                                                                )
                                                            }
                                                            disabled={
                                                                actionLoading
                                                            }
                                                            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            Open
                                                        </button>

                                                        {!notification.read && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void handleMarkAsRead(
                                                                        notification.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    actionLoading
                                                                }
                                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                Mark
                                                                as
                                                                Read
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void handleDelete(
                                                                    notification.id,
                                                                )
                                                            }
                                                            disabled={
                                                                actionLoading
                                                            }
                                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            <Trash2
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />

                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                },
                            )}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}