"use client";

import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";
import { emptyReportData, type ReportData } from "../simpleReportData";

// Realtime + polling retain the current automatic attendance monitoring.
const FALLBACK_REFRESH_MS = 15_000;
const REALTIME_DEBOUNCE_MS = 750;

export default function useSimpleReports() {
  const [data, setData] = useState<ReportData>(emptyReportData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const mounted = useRef(false);
  const generation = useRef(0);

  // silent refresh keeps report cards visible while new data is fetched.
  const refresh = useCallback(async (silent = false) => {
    const current = ++generation.current;
    if (!silent) setLoading(true);
    setError("");

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        throw new Error("Please log in again to view provincial reports.");
      }

      // Approved provincial admin only: the server validates the bearer token
      // before reading both provincial-created and approved municipal-created events.
      const response = await fetch("/api/provincial/reports", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const payload: ReportData & { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load provincial reports.");
      }
      const reportData: ReportData = payload;

      if (mounted.current && current === generation.current) {
        setData(reportData);
        setLoadedAt(Date.now());
      }
    } catch (e) {
      if (mounted.current && current === generation.current) {
        setError(e instanceof Error ? e.message : "Unable to load reports.");
        if (!silent) {
          setData(emptyReportData);
          setLoadedAt(null);
        }
      }
    } finally {
      if (mounted.current && current === generation.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const firstLoadTimer = window.setTimeout(() => void refresh(), 0);
    let changeTimer: number | null = null;

    const scheduleRefresh = () => {
      if (document.visibilityState !== "visible") return;
      if (changeTimer !== null) window.clearTimeout(changeTimer);
      changeTimer = window.setTimeout(() => {
        changeTimer = null;
        if (document.visibilityState === "visible") void refresh(true);
      }, REALTIME_DEBOUNCE_MS);
    };

    // Postgres Changes requires tables in the supabase_realtime
    // publication and appropriate RLS SELECT policies.
    const channel = supabase
      .channel("pagtipon-provincial-reports-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_municipalities" },
        scheduleRefresh,
      )
      .subscribe();

    // Fallback if Realtime replication is not enabled or misses an event.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, FALLBACK_REFRESH_MS);

    const onFocus = () => scheduleRefresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      mounted.current = false;
      ++generation.current;
      window.clearTimeout(firstLoadTimer);
      window.clearInterval(interval);
      if (changeTimer !== null) window.clearTimeout(changeTimer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { data, loading, error, loadedAt, refresh };
}
