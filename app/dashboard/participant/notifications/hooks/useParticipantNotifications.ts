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
    isInvitationNotification,
    isRegistrationNotification,
} from "../utils/participantNotificationUtils";

const NOTIFICATIONS_PER_PAGE = 5;

type FetchMode =
    | "initial"
    | "refresh"
    | "silent";

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
    invitations: 0,
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

    const [
        activeFilter,
        setActiveFilter,
    ] =
        useState<NotificationFilter>(
            "all",
        );

    const [
        currentPage,
        setCurrentPage,
    ] = useState(1);

    const [
        actionNotificationId,
        setActionNotificationId,
    ] =
        useState<string | null>(
            null,
        );

    const [
        markingAllRead,
        setMarkingAllRead,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const getCurrentUser =
        useCallback(async () => {
            const {
                data: { session },
                error: sessionError,
            } =
                await supabase.auth.getSession();

            if (
                sessionError ||
                !session?.user
            ) {
                throw new Error(
                    sessionError?.message ||
                        "Your login session is unavailable. Please log in again.",
                );
            }

            return session.user;
        }, []);

    const fetchNotifications =
        useCallback(
            async (
                mode: FetchMode =
                    "initial",
            ) => {
                if (
                    mode === "initial"
                ) {
                    setLoading(true);
                }

                if (
                    mode === "refresh"
                ) {
                    setRefreshing(true);
                }

                if (
                    mode !== "silent"
                ) {
                    setErrorMessage("");
                }

                try {
                    const user =
                        await getCurrentUser();

                    const {
                        data,
                        error,
                    } = await supabase
                        .from(
                            "notifications",
                        )
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
                        .eq(
                            "user_id",
                            user.id,
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false,
                            },
                        )
                        .limit(100);

                    if (error) {
                        throw error;
                    }

                    setItems(
                        (data ||
                            []) as NotificationRow[],
                    );

                    dispatchNotificationUpdate();
                } catch (error) {
                    console.error(
                        "Participant notifications fetch error:",
                        error,
                    );

                    if (
                        mode !== "silent"
                    ) {
                        setItems([]);

                        setErrorMessage(
                            error instanceof
                                Error
                                ? error.message
                                : "Unable to load notifications.",
                        );
                    }
                } finally {
                    if (
                        mode === "initial"
                    ) {
                        setLoading(
                            false,
                        );
                    }

                    if (
                        mode === "refresh"
                    ) {
                        setRefreshing(
                            false,
                        );
                    }
                }
            },
            [getCurrentUser],
        );

    /*
     * Initial load + silent synchronization.
     */
    useEffect(() => {
        void fetchNotifications(
            "initial",
        );

        const refreshSilently =
            () => {
                void fetchNotifications(
                    "silent",
                );
            };

        const handleVisibilityChange =
            () => {
                if (
                    document.visibilityState ===
                    "visible"
                ) {
                    refreshSilently();
                }
            };

        const intervalId =
            window.setInterval(
                () => {
                    if (
                        document.visibilityState ===
                        "visible"
                    ) {
                        refreshSilently();
                    }
                },
                30000,
            );

        window.addEventListener(
            "focus",
            refreshSilently,
        );

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );

        return () => {
            window.clearInterval(
                intervalId,
            );

            window.removeEventListener(
                "focus",
                refreshSilently,
            );

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, [fetchNotifications]);

    const counts =
        useMemo<NotificationCounts>(
            () => {
                if (
                    items.length === 0
                ) {
                    return EMPTY_COUNTS;
                }

                return {
                    total:
                        items.length,

                    unread:
                        items.filter(
                            (
                                notification,
                            ) =>
                                !notification.read,
                        ).length,

                    invitations:
                        items.filter(
                            (
                                notification,
                            ) =>
                                isInvitationNotification(
                                    notification.type,
                                ),
                        ).length,

                    registrations:
                        items.filter(
                            (
                                notification,
                            ) =>
                                isRegistrationNotification(
                                    notification.type,
                                ),
                        ).length,

                    eventUpdates:
                        items.filter(
                            (
                                notification,
                            ) =>
                                isEventUpdateNotification(
                                    notification.type,
                                ),
                        ).length,

                    cancellations:
                        items.filter(
                            (
                                notification,
                            ) =>
                                isCancellationNotification(
                                    notification.type,
                                ),
                        ).length,

                    attendance:
                        items.filter(
                            (
                                notification,
                            ) =>
                                isAttendanceNotification(
                                    notification.type,
                                ),
                        ).length,
                };
            },
            [items],
        );

    const allFilteredItems =
        useMemo(() => {
            if (
                activeFilter ===
                "unread"
            ) {
                return items.filter(
                    (
                        notification,
                    ) =>
                        !notification.read,
                );
            }

            if (
                activeFilter ===
                "invitations"
            ) {
                return items.filter(
                    (
                        notification,
                    ) =>
                        isInvitationNotification(
                            notification.type,
                        ),
                );
            }

            if (
                activeFilter ===
                "registrations"
            ) {
                return items.filter(
                    (
                        notification,
                    ) =>
                        isRegistrationNotification(
                            notification.type,
                        ),
                );
            }

            if (
                activeFilter ===
                "event_updates"
            ) {
                return items.filter(
                    (
                        notification,
                    ) =>
                        isEventUpdateNotification(
                            notification.type,
                        ),
                );
            }

            if (
                activeFilter ===
                "cancellations"
            ) {
                return items.filter(
                    (
                        notification,
                    ) =>
                        isCancellationNotification(
                            notification.type,
                        ),
                );
            }

            if (
                activeFilter ===
                "attendance"
            ) {
                return items.filter(
                    (
                        notification,
                    ) =>
                        isAttendanceNotification(
                            notification.type,
                        ),
                );
            }

            return items;
        }, [
            activeFilter,
            items,
        ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            allFilteredItems.length /
                NOTIFICATIONS_PER_PAGE,
        ),
    );

    const filteredItems =
        useMemo(() => {
            const startIndex =
                (currentPage - 1) *
                NOTIFICATIONS_PER_PAGE;

            return allFilteredItems.slice(
                startIndex,
                startIndex +
                    NOTIFICATIONS_PER_PAGE,
            );
        }, [
            allFilteredItems,
            currentPage,
        ]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter]);

    useEffect(() => {
        if (
            currentPage >
            totalPages
        ) {
            setCurrentPage(
                totalPages,
            );
        }
    }, [
        currentPage,
        totalPages,
    ]);

    const filters =
        useMemo<
            NotificationFilterOption[]
        >(
            () => [
                {
                    value: "all",
                    label: "All",
                    count:
                        counts.total,
                },
                {
                    value:
                        "unread",
                    label: "Unread",
                    count:
                        counts.unread,
                },
                {
                    value:
                        "invitations",
                    label:
                        "Invitations",
                    count:
                        counts.invitations,
                },
                {
                    value:
                        "registrations",
                    label:
                        "Registrations",
                    count:
                        counts.registrations,
                },
                {
                    value:
                        "event_updates",
                    label:
                        "Event Updates",
                    count:
                        counts.eventUpdates,
                },
                {
                    value:
                        "cancellations",
                    label:
                        "Cancellations",
                    count:
                        counts.cancellations,
                },
                {
                    value:
                        "attendance",
                    label:
                        "Attendance",
                    count:
                        counts.attendance,
                },
            ],
            [counts],
        );

    const markAsRead =
        async (
            notificationId: string,
        ) => {
            setActionNotificationId(
                notificationId,
            );

            try {
                const user =
                    await getCurrentUser();

                const { error } =
                    await supabase
                        .from(
                            "notifications",
                        )
                        .update({
                            read: true,
                        })
                        .eq(
                            "id",
                            notificationId,
                        )
                        .eq(
                            "user_id",
                            user.id,
                        );

                if (error) {
                    throw error;
                }

                setItems(
                    (
                        currentItems,
                    ) =>
                        currentItems.map(
                            (
                                notification,
                            ) =>
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
                setActionNotificationId(
                    null,
                );
            }
        };

    const markAllAsRead =
        async () => {
            if (
                counts.unread ===
                    0 ||
                markingAllRead
            ) {
                return;
            }

            setMarkingAllRead(
                true,
            );

            try {
                const user =
                    await getCurrentUser();

                const { error } =
                    await supabase
                        .from(
                            "notifications",
                        )
                        .update({
                            read: true,
                        })
                        .eq(
                            "user_id",
                            user.id,
                        )
                        .eq(
                            "read",
                            false,
                        );

                if (error) {
                    throw error;
                }

                setItems(
                    (
                        currentItems,
                    ) =>
                        currentItems.map(
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
                setMarkingAllRead(
                    false,
                );
            }
        };

    const deleteNotification =
        async (
            notificationId: string,
        ) => {
            const confirmed =
                window.confirm(
                    "Delete this notification?",
                );

            if (!confirmed) {
                return;
            }

            setActionNotificationId(
                notificationId,
            );

            try {
                const user =
                    await getCurrentUser();

                const { error } =
                    await supabase
                        .from(
                            "notifications",
                        )
                        .delete()
                        .eq(
                            "id",
                            notificationId,
                        )
                        .eq(
                            "user_id",
                            user.id,
                        );

                if (error) {
                    throw error;
                }

                setItems(
                    (
                        currentItems,
                    ) =>
                        currentItems.filter(
                            (
                                notification,
                            ) =>
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
                setActionNotificationId(
                    null,
                );
            }
        };

    const openNotification =
        async (
            notification: NotificationRow,
        ) => {
            if (
                !notification.read
            ) {
                await markAsRead(
                    notification.id,
                );
            }

            router.push(
                getNotificationRoute(
                    notification,
                ),
            );
        };

    const changePage = (
        page: number,
    ) => {
        setCurrentPage(
            Math.max(
                1,
                Math.min(
                    totalPages,
                    page,
                ),
            ),
        );
    };

    const firstVisibleItem =
        allFilteredItems.length ===
        0
            ? 0
            : (currentPage - 1) *
                  NOTIFICATIONS_PER_PAGE +
              1;

    const lastVisibleItem =
        Math.min(
            currentPage *
                NOTIFICATIONS_PER_PAGE,
            allFilteredItems.length,
        );

    return {
        items,

        /*
         * filteredItems contains only the
         * current pagination page.
         */
        filteredItems,

        filteredCount:
            allFilteredItems.length,

        counts,
        filters,

        loading,
        refreshing,
        markingAllRead,
        errorMessage,

        activeFilter,
        actionNotificationId,

        currentPage,
        totalPages,
        firstVisibleItem,
        lastVisibleItem,

        setActiveFilter,

        changePage,

        refresh: () =>
            fetchNotifications(
                "refresh",
            ),

        reload: () =>
            fetchNotifications(
                "initial",
            ),

        markAsRead,
        markAllAsRead,
        deleteNotification,
        openNotification,
    };
}