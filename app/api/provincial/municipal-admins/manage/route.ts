import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverAuthClient } from "@/lib/serverAuthClient";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
class ManagementError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
async function requireProvincial(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ManagementError("Please sign in.", 401);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user)
    throw new ManagementError("Your session has expired.", 401);
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role,verification_status")
    .eq("id", user.id)
    .single();
  if (
    profileError ||
    profile?.role !== "provincial_admin" ||
    profile.verification_status !== "approved" ||
    user.app_metadata?.must_change_password === true ||
    (user.banned_until && Date.parse(user.banned_until) > Date.now())
  )
    throw new ManagementError(
      "Only approved Provincial Admins may manage Municipal Admins.",
      403,
    );
  return user;
}
function rpcError(error: { code?: string; message: string }) {
  if (error.code === "42501")
    return new ManagementError(
      "You are not authorized to manage this account.",
      403,
    );
  if (error.code === "PT404")
    return new ManagementError("Municipal Admin not found.", 404);
  if (error.message.includes("Maximum 2"))
    return new ManagementError(
      "This municipality already has 2 active Municipal Admins. Deactivate one before activating another.",
      409,
    );
  if (error.code === "PT409") return new ManagementError(error.message, 409);
  return new ManagementError(
    "Unable to update this account. Refresh and try again. Make sure the Municipal Admin SQL migrations have been installed.",
    409,
  );
}
export async function POST(request: Request) {
  try {
    const actor = await requireProvincial(request);
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      throw new ManagementError("Invalid request.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new ManagementError("Invalid request.");
    const targetId = typeof body.targetId === "string" ? body.targetId : "";
    const action = body.action;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        targetId,
      ) ||
      targetId === actor.id ||
      !["activate", "deactivate", "delete"].includes(String(action))
    )
      throw new ManagementError("Invalid target account or action.");
    if (action !== "delete") {
      const { error } = await supabaseAdmin.rpc(
        "provincial_set_municipal_admin_status",
        {
          p_actor: actor.id,
          p_target: targetId,
          p_action: action,
        },
      );
      if (error) throw rpcError(error);
      return NextResponse.json(
        {
          message:
            action === "activate"
              ? "Municipal Admin activated successfully."
              : "Municipal Admin deactivated successfully.",
        },
        { headers },
      );
    }
    const email =
      typeof body.confirmEmail === "string"
        ? body.confirmEmail.trim().toLowerCase()
        : "";
    const password =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    if (
      !email ||
      email.length > 254 ||
      !password ||
      password.length > 128 ||
      body.confirmPermanent !== true
    )
      throw new ManagementError(
        "Enter the account email and your current Provincial Admin password, then confirm permanent deletion.",
      );
    if (!actor.email)
      throw new ManagementError("Your account has no email address.", 403);
    const client = serverAuthClient();
    const { data: verified, error: passwordError } =
      await client.auth.signInWithPassword({ email: actor.email, password });
    if (verified.session) await client.auth.signOut({ scope: "local" });
    if (passwordError || verified.user?.id !== actor.id)
      throw new ManagementError(
        "Your current Provincial Admin password is incorrect.",
        403,
      );
    await requireProvincial(request);
    const { data: ticket, error: prepareError } = await supabaseAdmin.rpc(
      "provincial_prepare_municipal_deletion",
      {
        p_actor: actor.id,
        p_target: targetId,
        p_email: email,
      },
    );
    if (prepareError) throw rpcError(prepareError);
    if (!ticket) throw new ManagementError("Unable to prepare deletion.", 409);
    // Never delete profiles alone. Auth deletes its profile in the same guarded cascade transaction.
    let deletionFailed = false;
    try {
      const result = await supabaseAdmin.auth.admin.deleteUser(targetId, false);
      deletionFailed = Boolean(result.error);
    } catch {
      deletionFailed = true;
    }
    const { data: completed, error: completionError } = await supabaseAdmin
      .from("municipal_admin_account_logs")
      .select("id")
      .eq("target_id", targetId)
      .eq("action", "deleted")
      .eq("details->>requestId", ticket)
      .maybeSingle();
    if (completionError)
      throw new ManagementError(
        "Unable to confirm deletion. Refresh the account list before retrying.",
        503,
      );
    if (!completed) {
      const { error: cancelError } = await supabaseAdmin.rpc(
        "provincial_cancel_municipal_deletion",
        { p_actor: actor.id, p_ticket: ticket },
      );
      if (cancelError)
        throw new ManagementError(
          "Deletion is not confirmed. Refresh the list; the pending request expires after 10 minutes.",
          503,
        );
      throw new ManagementError(
        deletionFailed
          ? "The account could not be deleted. It remains inactive. Linked files or records may prevent deletion; refresh before retrying."
          : "Deletion was not confirmed. Refresh the account list before retrying.",
        409,
      );
    }
    return NextResponse.json(
      {
        message:
          "Municipal Admin account deleted. Event, attendance, and staff assignment records were retained.",
      },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ManagementError
            ? error.message
            : "Unable to complete this request. Please try again.",
      },
      {
        status: error instanceof ManagementError ? error.status : 500,
        headers,
      },
    );
  }
}
