import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  requireSuperAdmin,
  adminError,
  AccessError,
} from "@/lib/superAdminAuth";
import { auditNames, cleanSearch, integer, noStore } from "@/lib/super/server";
import { auditActions } from "@/lib/super/types";
export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);
    const params = new URL(request.url).searchParams;
    const page = integer(params.get("page"), 1, 100000),
      pageSize = 15;
    const action = params.get("action") || "all",
      search = cleanSearch(params.get("search"));
    if (action !== "all" && !Object.hasOwn(auditActions, action))
      throw new AccessError("Invalid action filter.", 400);
    let query = supabaseAdmin
      .from("admin_audit_logs")
      .select("id,actor_id,target_id,action,created_at,details", {
        count: "exact",
      });
    if (action !== "all") query = query.eq("action", action);
    const from = params.get("from"),
      to = params.get("to");
    for (const date of [from, to])
      if (
        date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)))
      )
        throw new AccessError("Invalid date range.", 400);
    if (from && to && from > to)
      throw new AccessError("Start date must not be after end date.", 400);
    if (from)
      query = query.gte(
        "created_at",
        new Date(`${from}T00:00:00+08:00`).toISOString(),
      );
    if (to)
      query = query.lte(
        "created_at",
        new Date(`${to}T23:59:59.999+08:00`).toISOString(),
      );
    if (search) {
      const { data: people, error } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .in("role", ["super_admin", "provincial_admin"])
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(200);
      if (error) throw new Error("Unable to search audit logs.");
      const ids = (people || []).map((p) => p.id).join(",");
      const snapshots = ["actorName", "targetName", "targetEmail"].map(
        (key) => `details->>${key}.ilike.%${search}%`,
      );
      query = query.or(
        [
          ...(ids ? [`actor_id.in.(${ids})`, `target_id.in.(${ids})`] : []),
          ...snapshots,
        ].join(","),
      );
    }
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw new Error("Unable to load audit logs.");
    return NextResponse.json(
      {
        entries: await auditNames(data || []),
        total: count || 0,
        page,
        pageSize,
      },
      { headers: noStore },
    );
  } catch (error) {
    return adminError(error);
  }
}
