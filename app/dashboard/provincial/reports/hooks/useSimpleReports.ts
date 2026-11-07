"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  emptyReportData,
  type ReportData,
  type ReportEvent,
  type ReportTarget,
  type ReportRegistration,
  type ReportAttendance,
  type ReportProfile,
} from "../simpleReportData";
const PAGE_SIZE = 500;
async function readAll<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await query(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (data || []) as T[];
    result.push(...rows);
    if (rows.length < PAGE_SIZE) return result;
  }
}
async function batches<T>(
  ids: string[],
  query: (
    ids: string[],
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
) {
  const result: T[] = [];
  for (let i = 0; i < ids.length; i += 100)
    result.push(
      ...(await readAll<T>((from, to) =>
        query(ids.slice(i, i + 100), from, to),
      )),
    );
  return result;
}
export default function useSimpleReports() {
  const [data, setData] = useState<ReportData>(emptyReportData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const mounted = useRef(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const events = await readAll<ReportEvent>((from, to) =>
        supabase
          .from("events")
          .select("id,title,status,start_at,end_at,created_at")
          .eq("event_origin", "provincial")
          .order("id")
          .range(from, to),
      );
      const targets = await batches<ReportTarget>(
        events.map((e) => e.id),
        (ids, from, to) =>
          supabase
            .from("event_municipalities")
            .select("id,event_id,municipality")
            .in("event_id", ids)
            .order("id")
            .range(from, to),
      );
      const registrations = await batches<ReportRegistration>(
        targets.map((t) => t.id),
        (ids, from, to) =>
          supabase
            .from("rsvps")
            .select("id,event_municipality_id,user_id,status")
            .in("event_municipality_id", ids)
            .eq("status", "registered")
            .order("id")
            .range(from, to),
      );
      const [attendance, profiles] = await Promise.all([
        batches<ReportAttendance>(
          registrations.map((r) => r.id),
          (ids, from, to) =>
            supabase
              .from("attendance")
              .select("id,rsvp_id,status,checked_in_at,updated_at")
              .in("rsvp_id", ids)
              .order("id")
              .range(from, to),
        ),
        batches<ReportProfile>(
          [...new Set(registrations.map((r) => r.user_id))],
          (ids, from, to) =>
            supabase
              .from("profiles")
              .select(
                "id,full_name,participant_category,participant_category_other",
              )
              .in("id", ids)
              .order("id")
              .range(from, to),
        ),
      ]);
      if (mounted.current && current === generation.current) {
        setData({ events, targets, registrations, attendance, profiles });
        setLoadedAt(Date.now());
      }
    } catch (e) {
      if (mounted.current && current === generation.current) {
        setError(e instanceof Error ? e.message : "Unable to load reports.");
        setData(emptyReportData);
        setLoadedAt(null);
      }
    } finally {
      if (mounted.current && current === generation.current) setLoading(false);
    }
  }, []);
  const invalidateRequests = useCallback(() => {
    ++generation.current;
  }, []);
  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => {
      mounted.current = false;
      invalidateRequests();
      window.clearTimeout(timer);
    };
  }, [refresh, invalidateRequests]);
  return { data, loading, error, loadedAt, refresh };
}
