"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

export const MUNICIPAL_NOTIFICATION_UPDATE_EVENT =
  "municipal-notifications-updated";

export function useMunicipalUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingUnreadCount, setLoadingUnreadCount] =
    useState(true);

  const fetchUnreadCount = useCallback(
    async (providedUserId?: string) => {
      try {
        let userId = providedUserId;

        if (!userId) {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) {
            throw userError;
          }

          if (!user) {
            setUnreadCount(0);
            return;
          }

          userId = user.id;
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
          .eq("user_id", userId)
          .eq("read", false);

        if (countError) {
          throw countError;
        }

        setUnreadCount(count ?? 0);
      } catch (error) {
        console.error(
          "Municipal unread notification count error:",
          error,
        );

        setUnreadCount(0);
      } finally {
        setLoadingUnreadCount(false);
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    let notificationChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    async function setupNotificationListener() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Municipal notification user error:",
          userError.message,
        );

        setLoadingUnreadCount(false);
        return;
      }

      if (!user || !isMounted) {
        setUnreadCount(0);
        setLoadingUnreadCount(false);
        return;
      }

      await fetchUnreadCount(user.id);

      if (!isMounted) {
        return;
      }

      notificationChannel = supabase
        .channel(
          `municipal-sidebar-notifications-${user.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void fetchUnreadCount(user.id);
          },
        )
        .subscribe();
    }

    function handleNotificationUpdate() {
      void fetchUnreadCount();
    }

    function handleWindowFocus() {
      void fetchUnreadCount();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void fetchUnreadCount();
      }
    }

    void setupNotificationListener();

    window.addEventListener(
      MUNICIPAL_NOTIFICATION_UPDATE_EVENT,
      handleNotificationUpdate,
    );

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      isMounted = false;

      window.removeEventListener(
        MUNICIPAL_NOTIFICATION_UPDATE_EVENT,
        handleNotificationUpdate,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      if (notificationChannel) {
        void supabase.removeChannel(
          notificationChannel,
        );
      }
    };
  }, [fetchUnreadCount]);

  return {
    unreadCount,
    loadingUnreadCount,
    refreshUnreadCount: fetchUnreadCount,
  };
}