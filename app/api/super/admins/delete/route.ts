import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  requireSuperAdmin,
  AccessError,
  adminError,
} from "@/lib/superAdminAuth";
import { verifyOwnPassword, noStore } from "@/lib/super/server";

export async function POST(request: Request) {
  try {
    const caller = await requireSuperAdmin(request);
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      throw new AccessError("Invalid request.", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new AccessError("Invalid request.", 400);
    const targetId = typeof body.targetId === "string" ? body.targetId : "";
    const email =
      typeof body.confirmEmail === "string"
        ? body.confirmEmail.trim().toLowerCase()
        : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        targetId,
      ) ||
      targetId === caller.id
    )
      throw new AccessError("Invalid target account.", 400);
    if (
      !email ||
      email.length > 254 ||
      reason.length < 10 ||
      reason.length > 500 ||
      body.confirmPermanent !== true
    )
      throw new AccessError(
        "Confirm the account email, permanent deletion, and a reason of 10–500 characters.",
        400,
      );
    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("role,verification_status")
      .eq("id", targetId)
      .maybeSingle();
    if (targetError) throw new Error("Unable to check account.");
    if (!target || target.role !== "provincial_admin")
      throw new AccessError("Provincial Admin not found.", 404);
    if (target.verification_status === "approved")
      throw new AccessError(
        "Deactivate the Provincial Admin before deleting the account.",
        409,
      );
    await verifyOwnPassword(caller, body.currentPassword);
    // Revalidate the caller after password reauthentication before recording intent.
    await requireSuperAdmin(request);
    const { data: ticket, error: prepareError } = await supabaseAdmin.rpc(
      "super_prepare_provincial_deletion",
      {
        p_actor: caller.id,
        p_target: targetId,
        p_email: email,
        p_reason: reason,
      },
    );
    if (prepareError || !ticket)
      throw new AccessError(
        "Deletion was not prepared. Check the email and inactive status, then refresh and try again.",
        409,
      );
    // The database guard rechecks inactive status under a row lock in this Auth transaction.
    await supabaseAdmin.auth.admin.deleteUser(targetId, false);
    // Auth can wrap a database/network error; report success only with committed audit evidence.
    const { data: completed, error: completionError } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("id")
      .eq("target_id", targetId)
      .eq("action", "account_deleted")
      .eq("details->>requestId", ticket)
      .maybeSingle();
    if (completionError)
      throw new AccessError(
        "Unable to confirm deletion. Refresh the account list and audit logs before retrying.",
        503,
      );
    if (!completed) {
      const { error: cancelError } = await supabaseAdmin.rpc(
        "super_cancel_provincial_deletion",
        { p_actor: caller.id, p_ticket: ticket },
      );
      if (cancelError)
        throw new AccessError(
          "Deletion is not confirmed. Refresh the list and audit logs; a pending request expires after 10 minutes.",
          503,
        );
      throw new AccessError(
        "Deletion was not completed. The account may have been activated, or linked records/files may prevent deletion. Refresh the list; keep it inactive if related records must be retained.",
        409,
      );
    }
    return NextResponse.json(
      {
        message:
          "Inactive Provincial Admin account deleted. Its audit history was retained.",
      },
      { headers: noStore },
    );
  } catch (error) {
    return adminError(error);
  }
}
