"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/routes";
import { verifyDashboardRole } from "@/lib/access/client";
import { AccessProblem, accessDeadline } from "@/lib/access/errors";
type Gate<T> = {
  path: string;
  status: "checking" | "allowed" | "retry" | "denied";
  message: string;
  value?: T;
};
export function useDashboardAccess<T = undefined>(
  role: UserRole,
  additionalCheck?: (signal: AbortSignal) => Promise<T>,
) {
  const pathname = usePathname(),
    router = useRouter();
  const [gate, setGate] = useState<Gate<T>>({
    path: pathname,
    status: "checking",
    message: "",
  });
  const checker = useRef<(fresh?: boolean) => Promise<void>>(async () => {});
  const refresh = useCallback(async () => {
    await checker.current(true);
  }, []);
  const retry = useCallback(() => {
    setGate({ path: pathname, status: "checking", message: "" });
    void refresh();
  }, [pathname, refresh]);
  useEffect(() => {
    let active = true,
      version = 0,
      running: Promise<void> | null = null;
    let controller: AbortController | undefined;
    let verifiedUserId: string | undefined;
    const timers = new Set<number>();
    const update = (value: Omit<Gate<T>, "path">) => {
      if (active) setGate({ path: pathname, ...value });
    };
    async function perform() {
      if (!active) return;
      const request = ++version;
      controller = new AbortController();
      const current = () => active && request === version;
      try {
        const user = await verifyDashboardRole(role, controller);
        if (!current()) return;
        const value = additionalCheck
          ? await accessDeadline(additionalCheck(controller.signal), controller)
          : undefined;
        if (current()) {
          verifiedUserId = user.id;
          update({ status: "allowed", message: "", value });
        }
      } catch (error) {
        if (!current()) return;
        if (error instanceof AccessProblem) {
          if (error.kind === "redirect") {
            update({ status: "checking", message: "" });
            router.replace(error.destination || "/login");
          } else update({ status: error.kind, message: error.message });
        } else
          update({
            status: "retry",
            message:
              "Unable to connect to verify your account. Check your connection and try again.",
          });
      } finally {
        controller.abort();
      }
    }
    function check(fresh = false): Promise<void> {
      if (!active) return Promise.resolve();
      if (running) return fresh ? running.then(() => check()) : running;
      running = perform().finally(() => {
        running = null;
      });
      return running;
    }
    checker.current = check;
    const schedule = (fresh = false) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        void check(fresh);
      }, 0);
      timers.add(timer);
    };
    schedule();
    const visible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const interval = window.setInterval(visible, 30000);
    window.addEventListener("focus", visible);
    window.addEventListener("online", visible);
    document.addEventListener("visibilitychange", visible);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        verifiedUserId = undefined;
        ++version;
        controller?.abort();
        update({ status: "checking", message: "" });
        router.replace("/login");
      } else if (
        event === "SIGNED_IN" &&
        session?.user.id &&
        session.user.id === verifiedUserId
      ) {
        // Returning to a browser tab can emit SIGNED_IN for the same account.
        // Revalidate without unmounting the dashboard and its unsaved forms.
        schedule();
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        verifiedUserId = undefined;
        ++version;
        controller?.abort();
        update({ status: "checking", message: "" });
        schedule(true);
      } else if (event === "TOKEN_REFRESHED") schedule();
    });
    return () => {
      active = false;
      ++version;
      controller?.abort();
      checker.current = async () => {};
      subscription.unsubscribe();
      timers.forEach(window.clearTimeout);
      window.clearInterval(interval);
      window.removeEventListener("focus", visible);
      window.removeEventListener("online", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [role, pathname, router, additionalCheck]);
  return {
    ...gate,
    status: gate.path === pathname ? gate.status : ("checking" as const),
    refresh,
    retry,
  };
}
