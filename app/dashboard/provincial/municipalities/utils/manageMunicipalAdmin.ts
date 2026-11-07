import { supabase } from "@/lib/supabase";
export async function manageMunicipalAdmin(
  targetId: string,
  action: "activate" | "deactivate" | "delete",
  extra: Record<string, unknown> = {},
) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session)
    throw new Error("Your session has expired. Please sign in again.");
  const response = await fetch("/api/provincial/municipal-admins/manage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ targetId, action, ...extra }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Unable to update this account.");
  return result.message as string;
}
