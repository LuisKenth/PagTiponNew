"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import type {
  NotificationFilter,
  NotificationId,
  NotificationRecord,
  ProvincialNotification,
} from "../types";
import {
  getNotificationLink,
  matchesNotificationFilter,
  NOTIFICATION_UPDATE_EVENT,
} from "../utils";

function notifySidebarAboutChanges() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new Event(NOTIFICATION_UPDATE_EVENT),
  );
}

export function useProvincialNotifications() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<
    ProvincialNotification[]
  >([]);
  const [activeFilter, setActiveFilter] =
    useState<NotificationFilter>("all");

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const [updatingId, setUpdatingId] =
    useState<NotificationId | null>(null);

  const [deletingId, setDeletingId] =
    useState<NotificationId | null>(null);

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

        if (userError) {
          throw userError;
        }

        if (!user) {
          setCurrentUserId(null);
          setNotifications([]);
          setError(
            "No signed-in provincial administrator was found.",
          );
          return;
        }

        setCurrentUserId(user.id);

        const {
          data,
          error: notificationError,
        } = await supabase
          .from("notifications")
          .select(
            `
              id,
              user_id,
              type,
              message,
              read,
              event_id,
              created_at
            `,
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (notificationError) {
          throw notificationError;
        }

        const notificationRows =
          (data as NotificationRecord[] | null) ?? [];

        const eventIds = Array.from(
          new Set(
            notificationRows
              .map(
                (notification) =>
                  notification.event_id,
              )
              .filter(
                (eventId): eventId is number =>
                  typeof eventId === "number",
              ),
          ),
        );

        const eventTitleMap = new Map<number, string>();

        if (eventIds.length > 0) {
          const {
            data: eventData,
            error: eventError,
          } = await supabase
            .from("events")
            .select("id, title")
            .in("id", eventIds);

          if (eventError) {
            console.error(
              "Unable to load event titles:",
              eventError.message,
            );
          } else {
            for (const event of eventData ?? []) {
              eventTitleMap.set(
                event.id,
                event.title,
              );
            }
          }
        }

        const notificationsWithTitles =
          notificationRows.map((notification) => ({
            ...notification,
            eventTitle: notification.event_id
              ? eventTitleMap.get(
                  notification.event_id,
                ) ?? null
              : null,
          }));

        setNotifications(notificationsWithTitles);
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load notifications.";

        console.error(
          "Notification fetch error:",
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
    if (!currentUserId) {
      return;
    }

    const notificationChannel = supabase
      .channel(
        `provincial-notifications-${currentUserId}`,
      )
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
      void supabase.removeChannel(
        notificationChannel,
      );
    };
  }, [currentUserId, fetchNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter(
      (notification) => !notification.read,
    ).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) =>
      matchesNotificationFilter(
        notification,
        activeFilter,
      ),
    );
  }, [activeFilter, notifications]);

  const markAsRead = useCallback(
    async (notificationId: NotificationId) => {
      const notification = notifications.find(
        (item) => item.id === notificationId,
      );

      if (!notification || notification.read) {
        return true;
      }

      try {
        setUpdatingId(notificationId);
        setError("");

        const { error: updateError } = await supabase
          .from("notifications")
          .update({
            read: true,
          })
          .eq("id", notificationId);

        if (updateError) {
          throw updateError;
        }

        setNotifications((currentNotifications) =>
          currentNotifications.map((item) =>
            item.id === notificationId
              ? {
                  ...item,
                  read: true,
                }
              : item,
          ),
        );

        notifySidebarAboutChanges();

        return true;
      } catch (updateError) {
        const message =
          updateError instanceof Error
            ? updateError.message
            : "Unable to mark the notification as read.";

        console.error(
          "Mark notification as read error:",
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
    if (!currentUserId || unreadCount === 0) {
      return;
    }

    try {
      setMarkingAll(true);
      setError("");

      const { error: updateError } = await supabase
        .from("notifications")
        .update({
          read: true,
        })
        .eq("user_id", currentUserId)
        .eq("read", false);

      if (updateError) {
        throw updateError;
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      );

      notifySidebarAboutChanges();
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Unable to mark all notifications as read.";

      console.error(
        "Mark all notifications error:",
        updateError,
      );

      setError(message);
    } finally {
      setMarkingAll(false);
    }
  }, [currentUserId, unreadCount]);

  const deleteNotification = useCallback(
    async (notificationId: NotificationId) => {
      const shouldDelete = window.confirm(
        "Are you sure you want to delete this notification?",
      );

      if (!shouldDelete) {
        return;
      }

      try {
        setDeletingId(notificationId);
        setError("");

        const { error: deleteError } = await supabase
          .from("notifications")
          .delete()
          .eq("id", notificationId);

        if (deleteError) {
          throw deleteError;
        }

        setNotifications((currentNotifications) =>
          currentNotifications.filter(
            (notification) =>
              notification.id !== notificationId,
          ),
        );

        notifySidebarAboutChanges();
      } catch (deleteError) {
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete the notification.";

        console.error(
          "Delete notification error:",
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
    async (
      notification: ProvincialNotification,
    ) => {
      const wasMarkedAsRead = await markAsRead(
        notification.id,
      );

      if (!wasMarkedAsRead) {
        return;
      }

      const notificationLink =
        getNotificationLink(notification);

      if (notificationLink) {
        router.push(notificationLink);
      }
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
    refreshNotifications: () =>
      fetchNotifications(true),
    markAsRead,
    markAllAsRead,
    deleteNotification,
    openNotification,
  };
}
