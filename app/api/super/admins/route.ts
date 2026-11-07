import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverAuthClient } from "@/lib/serverAuthClient";
import {
  requireSuperAdmin,
  adminError,
  AccessError,
} from "@/lib/superAdminAuth";
import { isStrongPassword } from "@/lib/passwordPolicy";
import {
  provincialCapacity,
  requireProvincialSlot,
  PROVINCIAL_LIMIT_MESSAGE,
} from "@/lib/super/capacity";
import {
  auditNames,
  cleanSearch,
  integer,
  noStore,
  recoveryUrl,
} from "@/lib/super/server";

export const runtime = "nodejs";

function password() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*?";
  for (;;) {
    const value = Array.from(
      { length: 16 },
      () => chars[randomInt(chars.length)],
    ).join("");
    if (isStrongPassword(value)) return value;
  }
}

function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character] ?? character;
  });
}

async function sendProvincialAdminVerificationEmail(params: {
  email: string;
  fullName: string;
  actionLink: string;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "PagTipon";

  if (!apiKey || !senderEmail) {
    throw new Error("Brevo email configuration is incomplete.");
  }

  const safeName = escapeEmailHtml(params.fullName);
  const safeLink = escapeEmailHtml(params.actionLink);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: params.email, name: params.fullName }],
      subject: "PagTipon – Verify Your Provincial Admin Email",
      htmlContent: `
        <html>
          <body style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.6">
            <h2>Verify your PagTipon Provincial Administrator email</h2>
            <p>Hello, ${safeName}!</p>
            <p>A Super Administrator has created a Provincial Administrator
               account for you. Please verify your email address before signing in.</p>
            <p><a href="${safeLink}"
              style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">
              Verify Email Address</a></p>
            <p>After verification, sign in using the initial password given to you
               by the Super Administrator. You will be required to change it.</p>
            <p>If you did not expect this invitation, you may ignore this email.</p>
            <p>PagTipon</p>
          </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    // Do not log API keys, passwords, or the one-time confirmation link.
    console.error("Brevo Provincial Admin verification error status:", response.status);
    throw new Error("Brevo did not accept the Provincial Admin verification email.");
  }
}

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);
    const url = new URL(request.url);
    if (url.searchParams.get("view") === "overview") {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [total, active, activity, recent] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "provincial_admin"),
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "provincial_admin")
          .eq("verification_status", "approved"),
        supabaseAdmin
          .from("admin_audit_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since),
        supabaseAdmin
          .from("admin_audit_logs")
          .select("id,actor_id,target_id,action,created_at,details")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(6),
      ]);
      if (total.error || active.error || activity.error || recent.error)
        throw new Error("Unable to load overview.");
      return NextResponse.json(
        {
          total: total.count || 0,
          active: active.count || 0,
          inactive: (total.count || 0) - (active.count || 0),
          recentActivityCount: activity.count || 0,
          recent: await auditNames(recent.data || []),
        },
        { headers: noStore },
      );
    }
    const page = integer(url.searchParams.get("page"), 1, 100000);
    const pageSize = 10;
    const search = cleanSearch(url.searchParams.get("search"));
    const status = url.searchParams.get("status") || "all";
    if (!["all", "active", "inactive"].includes(status))
      throw new AccessError("Invalid status filter.", 400);
    let query = supabaseAdmin
      .from("profiles")
      .select(
        "id,first_name,middle_name,last_name,suffix,full_name,email,verification_status,created_at",
        {
          count: "exact",
        },
      )
      .eq("role", "provincial_admin");
    if (search)
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    if (status === "active")
      query = query.eq("verification_status", "approved");
    if (status === "inactive")
      query = query.neq("verification_status", "approved");
    const [{ data, count, error }, capacity] = await Promise.all([
      query
        .order("full_name")
        .order("id")
        .range((page - 1) * pageSize, page * pageSize - 1),
      provincialCapacity(),
    ]);
    if (error) throw new Error("Unable to load accounts.");
    return NextResponse.json(
      { admins: data, total: count || 0, page, pageSize, capacity },
      { headers: noStore },
    );
  } catch (error) {
    return adminError(error);
  }
}

export async function POST(request: Request) {
  // Only a newly created user is eligible for rollback.
  let createdUserId: string | null = null;

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

    if (body.action === "create") {
      const firstName =
        typeof body.firstName === "string" ? body.firstName.trim() : "";
      const middleName =
        typeof body.middleName === "string" ? body.middleName.trim() : "";
      const lastName =
        typeof body.lastName === "string" ? body.lastName.trim() : "";
      const suffix = typeof body.suffix === "string" ? body.suffix.trim() : "";
      const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (
        !firstName ||
        !lastName ||
        [firstName, middleName, lastName, suffix].some(
          (name) => name.length > 100,
        )
      )
        throw new AccessError(
          "First and last name are required. Each name field must not exceed 100 characters.",
          400,
        );
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new AccessError(
          "Provide a valid email address that the administrator controls.",
          400,
        );
      const fullName = [firstName, middleName, lastName, suffix]
        .filter(Boolean)
        .join(" ");

      // The database trigger remains the final, atomic capacity enforcement.
      await requireProvincialSlot();
      const initialPassword = password();

      const appSiteUrl = process.env.APP_SITE_URL?.trim().replace(/\/$/, "");
      if (!appSiteUrl || !/^https?:\/\//i.test(appSiteUrl)) {
        throw new AccessError("APP_SITE_URL is missing or invalid.", 500);
      }
      if (!process.env.BREVO_API_KEY?.trim() || !process.env.BREVO_SENDER_EMAIL?.trim()) {
        throw new AccessError("Brevo email configuration is incomplete.", 500);
      }

      // Set the trusted role BEFORE the handle_new_user() trigger runs.
      // Creating an unconfirmed user prevents password login until email confirmation.
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: initialPassword,
        email_confirm: false,
        app_metadata: {
          provisioned_role: "provincial_admin",
          provisioned_by: caller.id,
          must_change_password: true,
        },
        user_metadata: {
          first_name: firstName,
          middle_name: middleName || null,
          last_name: lastName,
          suffix: suffix || null,
          full_name: fullName,
        },
      });
      if (error || !data.user) {
        // Keep the existing concurrent-slot conflict detection.
        await requireProvincialSlot();
        throw new AccessError(
          "Unable to create account. The email may already be registered.",
          400,
        );
      }
      createdUserId = data.user.id;

      // Generate a confirmation link for the same unconfirmed Auth user.
      // Keep the structured names consistent with the initial Auth metadata.
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "signup",
          email,
          password: initialPassword,
          options: {
            redirectTo: `${appSiteUrl}/login`,
            data: {
              first_name: firstName,
              middle_name: middleName || null,
              last_name: lastName,
              suffix: suffix || null,
              full_name: fullName,
            },
          },
        });

      if (linkError || !linkData.properties?.action_link) {
        console.error("Generate Provincial Admin verification link error:", linkError);
        throw new Error("Unable to generate the Provincial Admin verification link.");
      }
      if (linkData.user && linkData.user.id !== createdUserId) {
        throw new Error("Verification link account ID mismatch.");
      }

      // Do not include the initial password or link in logs.
      // If Brevo rejects the email, the catch block deletes the new account.
      await sendProvincialAdminVerificationEmail({
        email,
        fullName,
        actionLink: linkData.properties.action_link,
      });

      createdUserId = null; // Account is now successfully created; do not roll it back.
      return NextResponse.json(
        {
          message: "Provincial Admin created successfully. A verification email has been sent.",
          credentials: { email, password: initialPassword },
        },
        { status: 201, headers: noStore },
      );
    }

    const targetId = typeof body.targetId === "string" ? body.targetId : "";
    if (!/^[0-9a-f-]{36}$/i.test(targetId))
      throw new AccessError("Invalid account.", 400);
    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id,role,verification_status")
      .eq("id", targetId)
      .single();
    if (targetError || target?.role !== "provincial_admin")
      throw new AccessError("Provincial Admin not found.", 404);
    if (body.action === "activate" || body.action === "deactivate") {
      if (
        body.action === "activate" &&
        target.verification_status !== "approved"
      )
        await requireProvincialSlot();
      const { error } = await supabaseAdmin.rpc("super_set_provincial_status", {
        p_actor: caller.id,
        p_target: targetId,
        p_active: body.action === "activate",
      });
      if (error?.code === "PT409")
        throw new AccessError(PROVINCIAL_LIMIT_MESSAGE, 409);
      if (error) throw new Error("Unable to change account status.");
      return NextResponse.json(
        {
          message:
            body.action === "activate"
              ? "Account activated."
              : "Account deactivated.",
        },
        { headers: noStore },
      );
    }
    if (body.action === "recovery") {
      const redirectTo = recoveryUrl();
      const { data: auth, error: authError } =
        await supabaseAdmin.auth.admin.getUserById(targetId);
      if (authError || !auth.user?.email)
        throw new AccessError("Account email is unavailable.", 400);
      const { error } = await supabaseAdmin.rpc("super_reserve_recovery", {
        p_actor: caller.id,
        p_target: targetId,
      });
      if (error)
        throw new AccessError(
          "Wait at least 60 seconds between recovery requests.",
          429,
        );
      const { error: sendError } =
        await serverAuthClient().auth.resetPasswordForEmail(auth.user.email, {
          redirectTo,
        });
      if (sendError)
        throw new AccessError(
          "Unable to send reset email. Check SMTP settings or try again later.",
          400,
        );
      return NextResponse.json(
        {
          message:
            "Password reset email requested. Ask the owner to check their inbox and spam folder.",
        },
        { headers: noStore },
      );
    }
    throw new AccessError("Invalid action.", 400);
  } catch (error) {
    if (createdUserId) {
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      if (rollbackError) {
        console.error("Provincial Admin creation rollback failed:", rollbackError);
      }
    }
    return adminError(error);
  }
}
