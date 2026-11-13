"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { NOTIFICATION_UPDATE_EVENT } from "../notifications/utils";

function isMissingSession(error: unknown) {
  const value = error as { name?: string; code?: string } | null;

  return (
    value?.name === "AuthSessionMissingError" ||
    value?.code === "session_not_found"
  );
}

export function useUnreadNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingUnreadCount, setLoadingUnreadCount] = useState(true);

  const mounted = useRef(false);
  const generation = useRef(0);
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedUser = useRef("");

  const stopChannel = useCallback(() => {
    const previous = channel.current;

    channel.current = null;
    subscribedUser.current = "";

    if (previous) {
      void supabase.removeChannel(previous);
    }
  }, []);

  const fetchUnreadCount = useCallback(
    async (_providedUserId?: string) => {
      if (!mounted.current) return;

      const ticket = ++generation.current;
      const current = () =>
        mounted.current && ticket === generation.current;

      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (!current()) return;

        if (sessionError && !isMissingSession(sessionError)) {
          throw sessionError;
        }

        if (!sessionData.session || sessionError) {
          stopChannel();
          setUnreadCount(0);
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!current()) return;

        if (userError && !isMissingSession(userError)) {
          throw userError;
        }

        if (!user || userError) {
          stopChannel();
          setUnreadCount(0);
          return;
        }

        if (subscribedUser.current !== user.id) {
          stopChannel();
          setUnreadCount(0);
          subscribedUser.current = user.id;

          channel.current = supabase
            .channel(`provincial-sidebar-notifications-${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${user.id}`,
              },
              () => {
                void fetchUnreadCount();
              },
            )
            .subscribe();
        }

        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false);

        if (!current()) return;
        if (error) throw error;

        setUnreadCount(count ?? 0);
      } catch (error) {
        if (!current()) return;

        if (!isMissingSession(error)) {
          console.error("Unread notification count error:", error);
        } else {
          stopChannel();
        }

        setUnreadCount(0);
      } finally {
        if (current()) {
          setLoadingUnreadCount(false);
        }
      }
    },
    [stopChannel],
  );

  useEffect(() => {
    mounted.current = true;
    void fetchUnreadCount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Ignore requests started before logout or an account change.
      generation.current++;

      if (!session || session.user.id !== subscribedUser.current) {
        stopChannel();

        if (mounted.current) {
          setUnreadCount(0);
        }
      }

      if (!session && mounted.current) {
        setLoadingUnreadCount(false);
      }

      // Run auth requests outside the auth callback.
      if (session) {
        queueMicrotask(() => {
          if (mounted.current) {
            void fetchUnreadCount();
          }
        });
      }
    });

    const refresh = () => {
      void fetchUnreadCount();
    };

    const visible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener(NOTIFICATION_UPDATE_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);

    return () => {
      mounted.current = false;
      generation.current++;

      subscription.unsubscribe();
      stopChannel();

      window.removeEventListener(NOTIFICATION_UPDATE_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [fetchUnreadCount, stopChannel]);

  return {
    unreadCount,
    loadingUnreadCount,
    refreshUnreadCount: fetchUnreadCount,
  };
}