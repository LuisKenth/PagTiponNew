import "server-only";
import { invalidAuthSession } from "@/lib/access/errors";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export class AccessError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}
export async function requireSuperAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new AccessError("Please sign in.", 401);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user)
    throw new AccessError(
      invalidAuthSession(error)
        ? "Your session has expired."
        : "Unable to verify your session. Try again.",
      invalidAuthSession(error) ? 401 : 503,
    );
  if (user.banned_until && Date.parse(user.banned_until) > Date.now())
    throw new AccessError("This account is inactive.");
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role,verification_status")
    .eq("id", user.id)
    .single();
  if (profileError)
    throw new AccessError("Unable to verify account access. Try again.", 503);
  if (
    profile?.role !== "super_admin" ||
    profile.verification_status !== "approved"
  )
    throw new AccessError(
      "Only approved Super Admins may manage Provincial Admin accounts.",
    );
  if (user.app_metadata?.must_change_password === true)
    throw new AccessError("Change your initial password first.");
  // The exact token above was validated by Supabase Auth; read its signed AAL claim.
  let aal: string | undefined;
  try {
    aal = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    ).aal;
  } catch {
    throw new AccessError("Invalid authentication token.", 401);
  }
  if (aal !== "aal2")
    throw new AccessError("Authenticator verification is required.");
  return user;
}
export function adminError(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof AccessError
          ? error.message
          : "Unable to complete the administrator request.",
    },
    {
      status: error instanceof AccessError ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
