"use client";

import { useRouter } from "next/navigation";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

import { PARTICIPANT_NOTIFICATION_UPDATE_EVENT } from "../../hooks/useParticipantUnreadCount";
import type {
    NotificationCounts,
    NotificationFilter,
    NotificationFilterOption,
    NotificationRow,
} from "../types/participantNotifications";
import {
    getNotificationRoute,
    isAttendanceNotification,
    isCancellationNotification,
    isEventUpdateNotification,
    isRegistrationNotification,
} from "../utils/participantNotificationUtils";

function dispatchNotificationUpdate() {
    window.dispatchEvent(
        new Event(
            PARTICIPANT_NOTIFICATION_UPDATE_EVENT,
        ),
    );
}

const EMPTY_COUNTS: NotificationCounts = {
    total: 0,
    unread: 0,
    registrations: 0,
    eventUpdates: 0,
    cancellations: 0,
    attendance: 0,
};

export function useParticipantNotifications() {
    const router = useRouter();

    const [items, setItems] =
        useState<NotificationRow[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [activeFilter, setActiveFilter] =
        useState<NotificationFilter>("all");

    const [actionNotificationId, setActionNotificationId] =
        useState<string | null>(null);

    const [markingAllRead, setMarkingAllRead] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");

    const fetchNotifications =
        useCallback(async (refreshOnly = false) => {
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
                } = await supabase.auth.getUser();

                if (userError || !user) {
                    throw new Error(
                        userError?.message ||
                            "Participant user not found.",
                    );
                }

                const { data, error } = await supabase
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

                setItems(
                    (data || []) as NotificationRow[],
                );

                dispatchNotificationUpdate();
            } catch (error) {
                console.error(
                    "Participant notifications fetch error:",
                    error,
                );

                setItems([]);

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

    const counts = useMemo<NotificationCounts>(() => {
        if (items.length === 0) {
            return EMPTY_COUNTS;
        }

        return {
            total: items.length,
            unread: items.filter(
                (notification) => !notification.read,
            ).length,
            registrations: items.filter(
                (notification) =>
                    isRegistrationNotification(
                        notification.type,
                    ),
            ).length,
            eventUpdates: items.filter(
                (notification) =>
                    isEventUpdateNotification(
                        notification.type,
                    ),
            ).length,
            cancellations: items.filter(
                (notification) =>
                    isCancellationNotification(
                        notification.type,
                    ),
            ).length,
            attendance: items.filter(
                (notification) =>
                    isAttendanceNotification(
                        notification.type,
                    ),
            ).length,
        };
    }, [items]);

    const filteredItems = useMemo(() => {
        if (activeFilter === "unread") {
            return items.filter(
                (notification) => !notification.read,
            );
        }

        if (activeFilter === "registrations") {
            return items.filter((notification) =>
                isRegistrationNotification(
                    notification.type,
                ),
            );
        }

        if (activeFilter === "event_updates") {
            return items.filter((notification) =>
                isEventUpdateNotification(
                    notification.type,
                ),
            );
        }

        if (activeFilter === "cancellations") {
            return items.filter((notification) =>
                isCancellationNotification(
                    notification.type,
                ),
            );
        }

        if (activeFilter === "attendance") {
            return items.filter((notification) =>
                isAttendanceNotification(
                    notification.type,
                ),
            );
        }

        return items;
    }, [activeFilter, items]);

    const filters = useMemo<NotificationFilterOption[]>(
        () => [
            {
                value: "all",
                label: "All",
                count: counts.total,
            },
            {
                value: "unread",
                label: "Unread",
                count: counts.unread,
            },
            {
                value: "registrations",
                label: "Registrations",
                count: counts.registrations,
            },
            {
                value: "event_updates",
                label: "Event Updates",
                count: counts.eventUpdates,
            },
            {
                value: "cancellations",
                label: "Cancellations",
                count: counts.cancellations,
            },
            {
                value: "attendance",
                label: "Attendance",
                count: counts.attendance,
            },
        ],
        [counts],
    );

    const markAsRead = async (
        notificationId: string,
    ) => {
        setActionNotificationId(notificationId);

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "Participant user not found.",
                );
            }

            const { error } = await supabase
                .from("notifications")
                .update({ read: true })
                .eq("id", notificationId)
                .eq("user_id", user.id);

            if (error) {
                throw error;
            }

            setItems((currentItems) =>
                currentItems.map((notification) =>
                    notification.id === notificationId
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

    const markAllAsRead = async () => {
        if (counts.unread === 0 || markingAllRead) {
            return;
        }

        setMarkingAllRead(true);

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "Participant user not found.",
                );
            }

            const { error } = await supabase
                .from("notifications")
                .update({ read: true })
                .eq("user_id", user.id)
                .eq("read", false);

            if (error) {
                throw error;
            }

            setItems((currentItems) =>
                currentItems.map((notification) => ({
                    ...notification,
                    read: true,
                })),
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

    const deleteNotification = async (
        notificationId: string,
    ) => {
        const confirmed = window.confirm(
            "Delete this notification?",
        );

        if (!confirmed) {
            return;
        }

        setActionNotificationId(notificationId);

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

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

            setItems((currentItems) =>
                currentItems.filter(
                    (notification) =>
                        notification.id !== notificationId,
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

    const openNotification = async (
        notification: NotificationRow,
    ) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }

        router.push(getNotificationRoute(notification));
    };

    return {
        items,
        filteredItems,
        counts,
        filters,
        loading,
        refreshing,
        markingAllRead,
        errorMessage,
        activeFilter,
        actionNotificationId,
        setActiveFilter,
        refresh: () => fetchNotifications(true),
        reload: () => fetchNotifications(false),
        markAsRead,
        markAllAsRead,
        deleteNotification,
        openNotification,
    };
}
