"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

export const PARTICIPANT_NOTIFICATION_UPDATE_EVENT =
    "participant-notification-update";

export function useParticipantUnreadCount() {
    const [unreadCount, setUnreadCount] =
        useState(0);

    const [loading, setLoading] =
        useState(true);

    const refreshUnreadCount =
        useCallback(async () => {
            try {
                const {
                    data: { user },
                    error: userError,
                } =
                    await supabase.auth.getUser();

                if (userError || !user) {
                    setUnreadCount(0);
                    return;
                }

                const {
                    count,
                    error: countError,
                } = await supabase
                    .from("notifications")
                    .select("id", {
                        count: "exact",
                        head: true,
                    })
                    .eq("user_id", user.id)
                    .eq("read", false);

                if (countError) {
                    throw countError;
                }

                setUnreadCount(count ?? 0);
            } catch (error) {
                console.error(
                    "Participant unread notification count error:",
                    error,
                );

                setUnreadCount(0);
            } finally {
                setLoading(false);
            }
        }, []);

    useEffect(() => {
        void refreshUnreadCount();
    }, [refreshUnreadCount]);

    useEffect(() => {
        const handleNotificationUpdate =
            () => {
                void refreshUnreadCount();
            };

        window.addEventListener(
            PARTICIPANT_NOTIFICATION_UPDATE_EVENT,
            handleNotificationUpdate,
        );

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            () => {
                void refreshUnreadCount();
            },
        );

        return () => {
            window.removeEventListener(
                PARTICIPANT_NOTIFICATION_UPDATE_EVENT,
                handleNotificationUpdate,
            );

            subscription.unsubscribe();
        };
    }, [refreshUnreadCount]);

    return {
        unreadCount,
        loading,
        refreshUnreadCount,
    };
}