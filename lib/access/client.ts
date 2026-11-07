"use client";
import { supabase } from "@/lib/supabase";
import { getDashboardPath, type UserRole } from "@/lib/routes";
import { AccessProblem, accessDeadline, invalidAuthSession } from "./errors";
export async function verifyDashboardRole(
  role: UserRole,
  controller: AbortController,
) {
  const {
    data: { user },
    error,
  } = await accessDeadline(supabase.auth.getUser());
  if (error || !user) {
    if (invalidAuthSession(error))
      throw new AccessProblem("redirect", "Please sign in.", "/login");
    throw new AccessProblem(
      "retry",
      "Unable to connect to Supabase to verify your login. Check your connection and try again.",
    );
  }
  const { data: profile, error: profileError } = await accessDeadline(
    supabase
      .from("profiles")
      .select("role,verification_status")
      .eq("id", user.id)
      .abortSignal(controller.signal)
      .maybeSingle<{ role: UserRole; verification_status: string }>(),
    controller,
  );
  if (profileError)
    throw new AccessProblem(
      "retry",
      "Unable to verify your account access. Check your connection and try again.",
    );
  if (!profile)
    throw new AccessProblem(
      "denied",
      "Your account profile is unavailable. Contact your administrator.",
    );
  if (
    ![
      "super_admin",
      "provincial_admin",
      "municipal_admin",
      "event_staff",
      "participant",
    ].includes(profile.role)
  )
    throw new AccessProblem(
      "denied",
      "Your account role is unavailable. Contact your administrator.",
    );
  if (profile.role !== role)
    throw new AccessProblem(
      "redirect",
      "Opening your dashboard.",
      getDashboardPath(profile.role),
    );
  // Participants may submit documents while pending. Protected features still require the eligibility RPC.
  const approved =
    profile.verification_status === "approved" ||
    (role === "participant" && profile.verification_status === "pending");
  if (
    !approved ||
    (user.banned_until && Date.parse(user.banned_until) > Date.now())
  )
    throw new AccessProblem(
      "denied",
      profile.verification_status === "pending"
        ? "Your account is still pending approval. Contact your administrator."
        : "Your account is inactive or restricted. Contact your administrator to restore access.",
    );
  if (
    ["super_admin", "provincial_admin", "municipal_admin", "event_staff"].includes(role) &&
    user.app_metadata?.must_change_password === true
  )
    throw new AccessProblem(
      "redirect",
      "Change your initial password first.",
      "/change-password",
    );
  return user;
}
