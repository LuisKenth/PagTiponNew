import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/passwordPolicy";

export const runtime = "nodejs";

function reply(error: string, status: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(request: Request) {
  try {
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/)?.[1];

    if (!token) {
      return reply("Please sign in again.", 401);
    }

    // Verify the authenticated user.
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return reply("Your session has expired. Please sign in again.", 401);
    }

    // Load the user's current profile.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, verification_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return reply("Unable to verify account access. Please try again.", 503);
    }

    // Only approved administrator and staff accounts.
    const allowedRoles = [
      "super_admin",
      "provincial_admin",
      "municipal_admin",
      "event_staff",
    ];

    if (
      !allowedRoles.includes(profile.role) ||
      profile.verification_status !== "approved"
    ) {
      return reply("This account is not authorized.", 403);
    }

    /*
     * EMAIL VERIFICATION PROTECTION
     *
     * Provincial Admin, Municipal Admin, and Event Staff
     * must verify their email addresses before changing
     * their initial passwords.
     */
    if (
      ["event_staff", "provincial_admin", "municipal_admin"].includes(
        profile.role,
      ) &&
      !user.email_confirmed_at
    ) {
      return reply(
        "Please verify your email address before changing your initial password.",
        403,
      );
    }

    // Require the initial-password-change flag.
    if (user.app_metadata?.must_change_password !== true) {
      return reply("Initial password change is no longer required.", 409);
    }

    // Read request data.
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return reply("Invalid request.", 400);
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return reply("Invalid request.", 400);
    }

    const body = payload as Record<string, unknown>;

    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";

    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    // Validate current password input.
    if (!currentPassword || currentPassword.length > 4096) {
      return reply("Enter your current password.", 400);
    }

    // Enforce PagTipon password policy.
    if (!isStrongPassword(newPassword)) {
      return reply(PASSWORD_POLICY_MESSAGE, 400);
    }

    if (currentPassword === newPassword) {
      return reply(
        "Your new password must be different from your initial password.",
        400,
      );
    }

    if (!user.email) {
      return reply("Your account email could not be verified.", 400);
    }

    /*
     * Verify the current password using
     * a separate non-persistent Supabase client.
     */
    const verifier = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );

    const { data: verified, error: verifyError } =
      await verifier.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

    if (verifyError || verified.user?.id !== user.id) {
      if (verifyError?.status === 429) {
        return reply("Too many attempts. Please try again later.", 429);
      }

      return reply(
        "Unable to verify your current password. Check it and try again.",
        400,
      );
    }

    /*
     * Update the password and remove
     * the first-login requirement.
     */
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword,
        app_metadata: {
          ...user.app_metadata,
          must_change_password: false,
        },
      });

    // Discard temporary verification session.
    await verifier.auth.signOut({ scope: "local" }).catch(() => {});

    if (updateError) {
      return reply("Unable to update your password. Please try again.", 400);
    }

    return NextResponse.json(
      {
        message: "Password updated successfully.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return reply("Unable to update your password. Please try again.", 500);
  }
}
