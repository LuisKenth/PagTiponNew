import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export class EventRequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function eventActor(
  request: Request,
  role: "municipal_admin" | "provincial_admin",
) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new EventRequestError("Please log in again.", 401);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user)
    throw new EventRequestError("Please log in again.", 401);
  const { data: account, error: accountError } =
    await supabaseAdmin.auth.admin.getUserById(data.user.id);
  if (
    accountError ||
    !account.user ||
    (account.user.banned_until &&
      new Date(account.user.banned_until).getTime() > Date.now())
  )
    throw new EventRequestError("This account is inactive.", 403);
  if (account.user.app_metadata?.must_change_password === true)
    throw new EventRequestError(
      "Change your initial password before managing events.",
      403,
    );
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,role,municipality,verification_status")
    .eq("id", data.user.id)
    .single();
  if (
    profileError ||
    !profile ||
    profile.role !== role ||
    profile.verification_status !== "approved" ||
    (role === "municipal_admin" && !profile.municipality)
  )
    throw new EventRequestError("You do not have access to this page.", 403);
  return profile as { id: string; role: string; municipality: string };
}
export const eventColumns =
  "id,title,description,start_at,end_at,status,certificates_enabled,owner_municipality,created_by,updated_at,audience_type,audience_categories,audience_category_other,memo_url,memo_filename,municipal_approval_recorded_at,event_municipalities(id,local_venue_id,local_instructions,registration_open,municipal_status)";
export function eventFailure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Unable to complete event request.",
    },
    { status: error instanceof EventRequestError ? error.status : 500 },
  );
}

// Page through Supabase's result limit so title search and counts cover every event.
export async function readMunicipalEventRows(scope: {
  municipality?: string;
  monitor?: boolean;
  id?: string | null;
}) {
  const rows: import("./types").MunicipalEvent[] = [];
  for (let from = 0; ; from += 500) {
    let query = supabaseAdmin
      .from("events")
      .select(eventColumns)
      .eq("event_origin", "municipal")
      .order("created_at", { ascending: false })
      .order("id");
    if (scope.monitor)
      query = query
        .neq("status", "draft")
        .not("municipal_approval_recorded_at", "is", null)
        .not("municipal_approval_recorded_by", "is", null);
    else if (scope.municipality)
      query = query.eq("owner_municipality", scope.municipality);
    else throw new EventRequestError("Municipality scope is required.", 403);
    if (scope.id) query = query.eq("id", scope.id);
    const { data, error } = await query.range(from, from + 499);
    if (error)
      throw new EventRequestError(
        "Unable to load municipal events. Try again.",
        503,
      );
    rows.push(
      ...((data ?? []) as unknown as import("./types").MunicipalEvent[]),
    );
    if ((data ?? []).length < 500) return rows;
  }
}
