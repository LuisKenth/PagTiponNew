import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_CATEGORIES,
  philippineDateBoundary,
} from "@/lib/provincialActivity";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
class LogError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function numberParam(value: string | null, fallback: number, max: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max)
    throw new LogError("Invalid pagination.");
  return Number(value);
}
export async function GET(request: Request) {
  try {
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new LogError("Please sign in.", 401);
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user)
      throw new LogError("Your session has expired.", 401);
    const { data: actor, error: actorError } = await supabaseAdmin
      .from("profiles")
      .select("role,verification_status")
      .eq("id", user.id)
      .single();
    if (
      actorError ||
      actor?.role !== "provincial_admin" ||
      actor.verification_status !== "approved" ||
      user.app_metadata?.must_change_password === true ||
      (user.banned_until && Date.parse(user.banned_until) > Date.now())
    )
      throw new LogError(
        "Only approved Provincial Admins may view activity logs.",
        403,
      );
    const params = new URL(request.url).searchParams;
    const page = numberParam(params.get("page"), 1, 100000),
      pageSize = numberParam(params.get("pageSize"), 20, 100);
    const q = (params.get("q") || "").trim(),
      category = params.get("category") || "all",
      action = params.get("action") || "all";
    if (q.length > 120)
      throw new LogError("Search must be at most 120 characters.");
    if (category !== "all" && !Object.hasOwn(ACTIVITY_CATEGORIES, category))
      throw new LogError("Invalid activity category.");
    if (action !== "all" && !Object.hasOwn(ACTIVITY_ACTIONS, action))
      throw new LogError("Invalid activity action.");
    const from = params.get("from") || "",
      to = params.get("to") || "";
    let start: string | undefined, end: string | undefined;
    try {
      if (from) start = philippineDateBoundary(from);
      if (to) end = philippineDateBoundary(to, true);
    } catch (error) {
      throw new LogError(
        error instanceof Error ? error.message : "Invalid date.",
      );
    }
    if (from && to && from > to)
      throw new LogError("From date must be on or before To date.");
    let query = supabaseAdmin
      .from("provincial_activity_logs")
      .select(
        "id,actor_id,actor_name,actor_email,category,action,target_id,target_name,municipality,event_id,event_title,details,created_at",
        { count: "exact" },
      );
    // A single escaped ILIKE value, not an interpolated PostgREST OR expression.
    if (q)
      query = query.ilike(
        "search_text",
        "%" + q.replace(/[\\%_]/g, "\\$&") + "%",
      );
    if (category !== "all") query = query.eq("category", category);
    if (action !== "all") query = query.eq("action", action);
    if (start) query = query.gte("created_at", start);
    if (end) query = query.lt("created_at", end);
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error)
      throw new LogError(
        "Unable to load activity logs. Please retry. If this is the first installation, run the Activity Logs SQL migration.",
        503,
      );
    return NextResponse.json(
      { entries: data || [], total: count || 0, page, pageSize },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof LogError
            ? error.message
            : "Unable to load activity logs. Please try again.",
      },
      { status: error instanceof LogError ? error.status : 500, headers },
    );
  }
}
