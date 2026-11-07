"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { accessDeadline } from "@/lib/access/errors";
type AccessStatus = "checking" | "verified" | "unverified" | "error";
const Context = createContext<{
  status: AccessStatus;
  refresh: () => void;
} | null>(null);
export function useParticipantVerification() {
  const value = useContext(Context);
  if (!value) throw new Error("Participant verification provider is missing.");
  return value;
}
export default function ParticipantVerificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [proof, setProof] = useState<{
    path: string;
    revision: number;
    status: AccessStatus;
  }>({ path: pathname, revision: 0, status: "checking" });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    let active = true,
      version = 0;
    const controller = new AbortController();
    const setStatus = (status: AccessStatus) =>
      setProof({ path: pathname, revision, status });
    let timer: number | undefined;
    let busy = false;
    async function check() {
      if (busy) return;
      busy = true;
      const request = ++version;
      const current = () => active && request === version;
      try {
        // Local session supplies identity only; the RPC validates auth.uid() in PostgreSQL.
        const {
          data: { session },
          error: sessionError,
        } = await accessDeadline(supabase.auth.getSession());
        if (!current()) return;
        if (sessionError || !session) {
          setStatus("error");
          return;
        }
        const { data, error } = await accessDeadline(
          supabase
            .rpc("participant_can_register", {
              p_participant_id: session.user.id,
            })
            .abortSignal(controller.signal),
          controller,
        );
        if (current())
          setStatus(
            error ? "error" : data === true ? "verified" : "unverified",
          );
      } catch {
        if (current()) setStatus("error");
      } finally {
        busy = false;
      }
    }
    void check();
    const visible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const interval = window.setInterval(visible, 30000);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (
        event === "SIGNED_OUT" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED"
      ) {
        ++version;
        setStatus("checking");
        window.clearTimeout(timer);
        // Recreate this effect; previous responses cannot restore access.
        timer = window.setTimeout(() => {
          if (active) refresh();
        }, 0);
      }
    });
    return () => {
      controller.abort();
      active = false;
      ++version;
      subscription.unsubscribe();
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [pathname, revision, refresh]);
  return (
    <Context.Provider
      value={{
        status:
          proof.path === pathname && proof.revision === revision
            ? proof.status
            : "checking",
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
