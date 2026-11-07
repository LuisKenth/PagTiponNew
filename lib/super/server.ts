import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AccessError } from "@/lib/superAdminAuth";
import { serverAuthClient } from "@/lib/serverAuthClient";
import type { AuditEntry } from "./types";
export const noStore = { "Cache-Control": "no-store" };
export function integer(value: string | null, fallback: number, max: number) {
  if (!value) return fallback;
  if (!/^\d+$/.test(value)) throw new AccessError("Invalid pagination.", 400);
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > max)
    throw new AccessError("Invalid pagination.", 400);
  return n;
}
export function cleanSearch(value: string | null) {
  return (value || "")
    .slice(0, 100)
    .replace(/[^a-zA-Z0-9@ ._-]/g, "")
    .trim();
}
export async function auditNames(
  rows: Record<string, unknown>[],
): Promise<AuditEntry[]> {
  const ids = [
    ...new Set(
      rows
        .flatMap((row) => [row.actor_id, row.target_id])
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name")
      .in("id", ids)
      .in("role", ["super_admin", "provincial_admin"]);
    if (error) throw new Error("Unable to resolve account names.");
    for (const p of data || [])
      names.set(p.id, p.full_name || "Unnamed administrator");
  }
  return rows.map(
    (row) =>
      ({
        ...row,
        actor_name: row.actor_id
          ? names.get(String(row.actor_id)) ||
            (row.details &&
            typeof row.details === "object" &&
            "actorName" in row.details &&
            typeof row.details.actorName === "string"
              ? row.details.actorName
              : "Former administrator")
          : "System / controlled setup",
        target_name:
          names.get(String(row.target_id)) ||
          (row.details &&
          typeof row.details === "object" &&
          "targetName" in row.details &&
          typeof row.details.targetName === "string"
            ? row.details.targetName
            : "Former administrator"),
        details: row.details || {},
      }) as AuditEntry,
  );
}
export function recoveryUrl() {
  const configured = process.env.APP_SITE_URL;
  if (!configured)
    throw new AccessError("APP_SITE_URL is not configured on the server.", 503);
  const url = new URL(configured);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new AccessError(
      "APP_SITE_URL must use HTTPS outside local development.",
      503,
    );
  return new URL("/reset-password", url).toString();
}
export async function verifyOwnPassword(
  user: { id: string; email?: string },
  password: unknown,
) {
  if (
    !user.email ||
    typeof password !== "string" ||
    !password ||
    password.length > 4096
  )
    throw new AccessError("Enter your current Super Admin password.", 400);
  const verifier = serverAuthClient();
  const { data, error } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });
  try {
    if (error || data.user?.id !== user.id)
      throw new AccessError(
        error?.status === 429
          ? "Too many attempts. Try again later."
          : "Current password could not be verified.",
        error?.status === 429 ? 429 : 400,
      );
  } finally {
    if (data.session)
      await verifier.auth.signOut({ scope: "local" }).catch(() => {});
  }
}
export async function writeAudit(
  actor: string,
  target: string,
  action: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await supabaseAdmin
    .from("admin_audit_logs")
    .insert({ actor_id: actor, target_id: target, action, details });
  if (error) throw new Error("Unable to record account activity.");
}
