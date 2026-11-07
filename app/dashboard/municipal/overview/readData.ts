import { supabase } from "@/lib/supabase";
import {
  EMPTY_OVERVIEW,
  type MunicipalAssignment,
  type MunicipalAttendance,
  type MunicipalEvent,
  type MunicipalOverviewData,
  type MunicipalRegistration,
} from "./model";
const PAGE_SIZE = 500,
  BATCH_SIZE = 100;
type QueryResult<T> = { data: T[] | null; error: { message: string } | null };
export async function overviewPages<T>(
  query: (from: number, to: number) => PromiseLike<QueryResult<T>>,
  signal?: AbortSignal,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    signal?.throwIfAborted();
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error)
      throw new Error(
        "Unable to load the municipal overview. Please refresh and try again.",
      );
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
async function batches<T>(
  ids: string[],
  query: (
    ids: string[],
    from: number,
    to: number,
  ) => PromiseLike<QueryResult<T>>,
  signal: AbortSignal,
) {
  const rows: T[] = [];
  for (let index = 0; index < ids.length; index += BATCH_SIZE) {
    const batch = ids.slice(index, index + BATCH_SIZE);
    rows.push(
      ...(await overviewPages((from, to) => query(batch, from, to), signal)),
    );
  }
  return rows;
}
export async function readMunicipalOverview(
  signal: AbortSignal,
): Promise<MunicipalOverviewData> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  signal.throwIfAborted();
  if (userError || !user)
    throw new Error("Your session has expired. Please sign in again.");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,verification_status,municipality,full_name")
    .eq("id", user.id)
    .abortSignal(signal)
    .single();
  if (
    profileError ||
    profile?.role !== "municipal_admin" ||
    profile.verification_status !== "approved" ||
    !profile.municipality?.trim() ||
    user.app_metadata?.must_change_password === true
  )
    throw new Error(
      "An active Municipal Admin account with an assigned municipality is required.",
    );
  const municipality = String(profile.municipality).trim();
  const allAssignments = await overviewPages<MunicipalAssignment>(
    (from, to) =>
      supabase
        .from("event_municipalities")
        .select("id,event_id,municipality,municipal_status,created_at")
        .ilike("municipality", municipality.replace(/[\\%_]/g, "\\$&"))
        .order("id")
        .range(from, to)
        .abortSignal(signal),
    signal,
  );
  const own = allAssignments.filter(
    (row) =>
      row.municipality?.trim().toLowerCase() === municipality.toLowerCase(),
  );
  const events = await batches<MunicipalEvent>(
    [...new Set(own.map((row) => row.event_id))],
    (ids, from, to) =>
      supabase
        .from("events")
        .select("id,title,status,start_at,end_at")
        .in("id", ids)
        .neq("status", "draft")
        .order("id")
        .range(from, to)
        .abortSignal(signal),
    signal,
  );
  const visible = new Set(
    events
      .filter((row) => row.status?.trim().toLowerCase() !== "draft")
      .map((row) => row.id),
  );
  const assignments = own.filter((row) => visible.has(row.event_id));
  const registrations = await batches<MunicipalRegistration>(
    assignments.map((row) => row.id),
    (ids, from, to) =>
      supabase
        .from("rsvps")
        .select("id,event_municipality_id,status")
        .in("event_municipality_id", ids)
        .eq("status", "registered")
        .order("id")
        .range(from, to)
        .abortSignal(signal),
    signal,
  );
  const attendance = await batches<MunicipalAttendance>(
    registrations.map((row) => row.id),
    (ids, from, to) =>
      supabase
        .from("attendance")
        .select("id,rsvp_id,event_municipality_id,status")
        .in("rsvp_id", ids)
        .in("status", ["present", "late"])
        .order("id")
        .range(from, to)
        .abortSignal(signal),
    signal,
  );
  return {
    ...EMPTY_OVERVIEW,
    municipality,
    fullName: profile.full_name || null,
    events,
    assignments,
    registrations,
    attendance,
    loadedAt: new Date().toISOString(),
  };
}
