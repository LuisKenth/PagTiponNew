"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import { MUNICIPAL_NOTIFICATION_UPDATE_EVENT } from "../../hooks/useMunicipalUnreadCount";
import type {
  MunicipalNotification,
  MunicipalNotificationFilter,
  MunicipalNotificationId,
  MunicipalNotificationRecord,
} from "../types";
import {
  getMunicipalNotificationLink,
  matchesMunicipalNotificationFilter,
} from "../utils";

function notifyMunicipalSidebarAboutChanges() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new Event(MUNICIPAL_NOTIFICATION_UPDATE_EVENT),
  );
}

export function useMunicipalNotifications() {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<MunicipalNotification[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<MunicipalNotificationFilter>("all");
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [updatingId, setUpdatingId] =
    useState<MunicipalNotificationId | null>(null);
  const [deletingId, setDeletingId] =
    useState<MunicipalNotificationId | null>(null);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(
    async (showRefreshLoader = false) => {
      try {
        setError("");

        if (showRefreshLoader) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          setCurrentUserId(null);
          setNotifications([]);
          setError(
            "No signed-in municipal administrator was found.",
          );
          return;
        }

        setCurrentUserId(user.id);

        const { data, error: notificationError } = await supabase
          .from("notifications")
          .select(
            `
              id,
              user_id,
              event_id,
              event_municipality_id,
              type,
              title,
              message,
              read,
              created_at
            `,
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (notificationError) throw notificationError;

        const notificationRows =
          (data as MunicipalNotificationRecord[] | null) ?? [];

        const eventIds = Array.from(
          new Set(
            notificationRows
              .map((notification) => notification.event_id)
              .filter(
                (eventId): eventId is string =>
                  typeof eventId === "string" && eventId.length > 0,
              ),
          ),
        );

        const eventTitleMap = new Map<string, string>();

        if (eventIds.length > 0) {
          const { data: eventData, error: eventError } =
            await supabase
              .from("events")
              .select("id, title")
              .in("id", eventIds);

          if (eventError) {
            console.error(
              "Unable to load municipal notification event titles:",
              eventError.message,
            );
          } else {
            for (const event of eventData ?? []) {
              eventTitleMap.set(String(event.id), event.title);
            }
          }
        }

        setNotifications(
          notificationRows.map((notification) => ({
            ...notification,
            eventTitle: notification.event_id
              ? eventTitleMap.get(notification.event_id) ?? null
              : null,
          })),
        );
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load notifications.";

        console.error(
          "Municipal notification fetch error:",
          fetchError,
        );

        setNotifications([]);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!currentUserId) return;

    const notificationChannel = supabase
      .channel(`municipal-notifications-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          void fetchNotifications(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(notificationChannel);
    };
  }, [currentUserId, fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) =>
        matchesMunicipalNotificationFilter(
          notification,
          activeFilter,
        ),
      ),
    [activeFilter, notifications],
  );

  const markAsRead = useCallback(
    async (notificationId: MunicipalNotificationId) => {
      const notification = notifications.find(
        (item) => item.id === notificationId,
      );

      if (!notification || notification.read) return true;

      try {
        setUpdatingId(notificationId);
        setError("");

        const { error: updateError } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId);

        if (updateError) throw updateError;

        setNotifications((currentNotifications) =>
          currentNotifications.map((item) =>
            item.id === notificationId
              ? { ...item, read: true }
              : item,
          ),
        );

        notifyMunicipalSidebarAboutChanges();
        return true;
      } catch (updateError) {
        const message =
          updateError instanceof Error
            ? updateError.message
            : "Unable to mark the notification as read.";

        console.error(
          "Municipal mark-as-read error:",
          updateError,
        );
        setError(message);
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [notifications],
  );

  const markAllAsRead = useCallback(async () => {
    if (!currentUserId || unreadCount === 0) return;

    try {
      setMarkingAll(true);
      setError("");

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", currentUserId)
        .eq("read", false);

      if (updateError) throw updateError;

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      );

      notifyMunicipalSidebarAboutChanges();
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Unable to mark all notifications as read.";

      console.error(
        "Municipal mark-all-as-read error:",
        updateError,
      );
      setError(message);
    } finally {
      setMarkingAll(false);
    }
  }, [currentUserId, unreadCount]);

  const deleteNotification = useCallback(
    async (notificationId: MunicipalNotificationId) => {
      const shouldDelete = window.confirm(
        "Are you sure you want to delete this notification?",
      );

      if (!shouldDelete) return;

      try {
        setDeletingId(notificationId);
        setError("");

        const { error: deleteError } = await supabase
          .from("notifications")
          .delete()
          .eq("id", notificationId);

        if (deleteError) throw deleteError;

        setNotifications((currentNotifications) =>
          currentNotifications.filter(
            (notification) => notification.id !== notificationId,
          ),
        );

        notifyMunicipalSidebarAboutChanges();
      } catch (deleteError) {
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete the notification.";

        console.error(
          "Municipal notification delete error:",
          deleteError,
        );
        setError(message);
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  const openNotification = useCallback(
    async (notification: MunicipalNotification) => {
      const wasMarkedAsRead = await markAsRead(notification.id);

      if (!wasMarkedAsRead) return;

      router.push(getMunicipalNotificationLink(notification));
    },
    [markAsRead, router],
  );

  return {
    notifications,
    filteredNotifications,
    activeFilter,
    setActiveFilter,
    unreadCount,
    loading,
    refreshing,
    markingAll,
    updatingId,
    deletingId,
    error,
    refreshNotifications: () => fetchNotifications(true),
    markAsRead,
    markAllAsRead,
    deleteNotification,
    openNotification,
  };
}
