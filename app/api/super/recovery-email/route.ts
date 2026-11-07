import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  requireSuperAdmin,
  adminError,
  AccessError,
} from "@/lib/superAdminAuth";
import { noStore, verifyOwnPassword, writeAudit } from "@/lib/super/server";
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
      typeof body.newEmail === "string"
        ? body.newEmail.trim().toLowerCase()
        : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (
      !/^[0-9a-f-]{36}$/i.test(targetId) ||
      email.length > 254 ||
      !/^\S+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      throw new AccessError("Provide a valid account and new email.", 400);
    if (
      reason.length < 10 ||
      reason.length > 500 ||
      body.identityVerified !== true
    )
      throw new AccessError(
        "Confirm the identity check and provide a reason of 10–500 characters.",
        400,
      );
    await verifyOwnPassword(caller, body.currentPassword);
    const { data: ticket, error: ticketError } = await supabaseAdmin.rpc(
      "super_prepare_email_correction",
      {
        p_actor: caller.id,
        p_target: targetId,
        p_email: email,
        p_reason: reason,
      },
    );
    if (ticketError || !ticket)
      throw new AccessError(
        "Email change could not be prepared. Check the account, duplicate email, or wait 60 seconds before retrying.",
        400,
      );
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      targetId,
      { email },
    );
    if (error || !data.user) {
      await writeAudit(caller.id, targetId, "email_correction_failed", {
        requestId: ticket,
      }).catch(() => {});
      throw new AccessError(
        "Email was not changed. It may already be registered. Check the account before retrying.",
        400,
      );
    }
    let warning = "";
    try {
      await writeAudit(caller.id, targetId, "email_correction_completed", {
        requestId: ticket,
        newEmail: email,
      });
    } catch {
      warning =
        "Email changed. The synchronized email log records this operation; refresh before any retry.";
    }
    return NextResponse.json(
      {
        message:
          "Recovery email updated. Use Send Reset Email to send a reset link to the new mailbox.",
        warning,
      },
      { headers: noStore },
    );
  } catch (error) {
    return adminError(error);
  }
}
