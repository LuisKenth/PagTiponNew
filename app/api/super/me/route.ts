import { NextResponse } from "next/server";
import {
  requireSuperAdmin,
  adminError,
  AccessError,
} from "@/lib/superAdminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { noStore, verifyOwnPassword, writeAudit } from "@/lib/super/server";
import {
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/passwordPolicy";
export async function GET(request: Request) {
  try {
    const user = await requireSuperAdmin(request);
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,email,role,verification_status,created_at")
      .eq("id", user.id)
      .single();
    if (error || !profile) throw new Error("Unable to load profile.");
    return NextResponse.json(
      {
        profile: {
          ...profile,
          email: user.email,
          pendingEmail: user.new_email || null,
          factorCount: (user.factors || []).filter(
            (f) => f.status === "verified" && f.factor_type === "totp",
          ).length,
        },
      },
      { headers: noStore },
    );
  } catch (error) {
    return adminError(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireSuperAdmin(request);
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      throw new AccessError("Invalid request.", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new AccessError("Invalid request.", 400);
    if (body.action === "name") {
      const name =
        typeof body.fullName === "string" ? body.fullName.trim() : "";
      if (!name || name.length > 100)
        throw new AccessError("Enter a name of up to 100 characters.", 400);
      const { error } = await supabaseAdmin.rpc("super_update_own_name", {
        p_actor: user.id,
        p_name: name,
      });
      if (error) throw new Error("Unable to update profile.");
      return NextResponse.json(
        { message: "Your name was updated." },
        { headers: noStore },
      );
    }
    if (body.action === "password") {
      if (!isStrongPassword(body.newPassword))
        throw new AccessError(PASSWORD_POLICY_MESSAGE, 400);
      if (body.newPassword === body.currentPassword)
        throw new AccessError("Choose a different new password.", 400);
      await verifyOwnPassword(user, body.currentPassword);
      await writeAudit(user.id, user.id, "password_change_requested");
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: body.newPassword,
      });
      if (error)
        throw new AccessError(
          "Unable to change password. Please try again.",
          400,
        );
      // Password update succeeded even if recording the secondary completion fails.
      let warning = "";
      try {
        await writeAudit(user.id, user.id, "password_changed");
      } catch {
        warning =
          "Password changed, but the completion log could not be recorded.";
      }
      return NextResponse.json(
        {
          message: "Password updated. Sign in again with your new password.",
          warning,
        },
        { headers: noStore },
      );
    }
    if (body.action === "email-request-log") {
      const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 ||
        email === user.email
      )
        throw new AccessError("Enter a different valid email.", 400);
      // Client uses the standard Supabase secure email-confirmation flow afterwards.
      await writeAudit(user.id, user.id, "self_email_change_requested", {
        newEmail: email,
      });
      return NextResponse.json(
        { message: "Email change request recorded." },
        { headers: noStore },
      );
    }
    throw new AccessError("Invalid action.", 400);
  } catch (error) {
    return adminError(error);
  }
}
