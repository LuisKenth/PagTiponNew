"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";

type Options = {
  onUpdate: () => unknown;
  disabled?: boolean;
  /** Use zero when the page already owns a polling timer. */
  intervalMs?: number;
  pauseWhileEditing?: boolean;
};

// One Realtime connection for the active screen. Payloads only invalidate data;
// every reload still goes through the page's existing authorized query/API.
const listeners = new Set<() => void>();
let channel: ReturnType<typeof supabase.channel> | null = null;
function listen(listener: () => void) {
  listeners.add(listener);
  if (!channel) {
    channel = supabase
      .channel("pagtipon-screen-data-sync")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        listeners.forEach((update) => update());
      })
      .subscribe();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && channel) {
      const previous = channel;
      channel = null;
      void supabase.removeChannel(previous);
    }
  };
}

export function useLiveData({
  onUpdate,
  disabled = false,
  intervalMs = 30_000,
  pauseWhileEditing = true,
}: Options) {
  const latest = useRef({ onUpdate, disabled });
  useEffect(() => {
    latest.current = { onUpdate, disabled };
  });
  useEffect(() => {
    let disposed = false;
    let running = false;
    let lastStarted = 0;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const update = async () => {
      if (
        disposed ||
        running ||
        latest.current.disabled ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      // Do not replace a person's data while they are typing or using a dialog.
      const focused = document.activeElement;
      if (
        pauseWhileEditing &&
        (focused?.matches(
          "input, textarea, select, [contenteditable='true']",
        ) ||
          document.querySelector(
            "dialog[open], [role=dialog][aria-modal=true]",
          ))
      )
        return;
      running = true;
      lastStarted = Date.now();
      try {
        await latest.current.onUpdate();
      } catch (error) {
        // Pages own their error UI. Retry on the next timer/reconnect.
        console.warn("Automatic data update failed:", error);
      } finally {
        running = false;
      }
    };
    const schedule = () => {
      if (disposed || pending !== undefined) return;
      // Coalesce bursts without starving updates during a busy event.
      pending = setTimeout(
        () => {
          pending = undefined;
          void update();
        },
        Math.max(750, 5_000 - (Date.now() - lastStarted)),
      );
    };
    const unlisten = listen(schedule);
    const poll = intervalMs > 0 ? setInterval(schedule, intervalMs) : undefined;
    window.addEventListener("focus", schedule);
    window.addEventListener("online", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      disposed = true;
      unlisten();
      if (pending !== undefined) clearTimeout(pending);
      if (poll !== undefined) clearInterval(poll);
      window.removeEventListener("focus", schedule);
      window.removeEventListener("online", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [intervalMs, pauseWhileEditing]);
}

/** Replaces a manual refresh action without reloading the route or form. */
export default function BackgroundDataSync(options: Options) {
  useLiveData(options);
  return null;
}
