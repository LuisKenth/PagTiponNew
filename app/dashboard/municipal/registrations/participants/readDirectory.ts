import { supabase } from "@/lib/supabase";
import {
  participantDirectory,
  normalizeSearch,
  type Participant,
  type Proof,
} from "./model";
type Result<T> = { data: T[] | null; error: { message: string } | null };
export async function directoryPages<T>(
  query: (from: number, to: number) => PromiseLike<Result<T>>,
  signal: AbortSignal,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    signal.throwIfAborted();
    const { data, error } = await query(from, from + 499);
    if (error)
      throw new Error(
        "Unable to load participants. Please refresh and try again.",
      );
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}
export async function readParticipantDirectory(signal: AbortSignal) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  signal.throwIfAborted();
  if (authError || !user)
    throw new Error("Your session has expired. Please sign in again.");
  const { data: actor, error: actorError } = await supabase
    .from("profiles")
    .select("role,verification_status,municipality")
    .eq("id", user.id)
    .abortSignal(signal)
    .single();
  if (
    actorError ||
    actor?.role !== "municipal_admin" ||
    actor.verification_status !== "approved" ||
    !actor.municipality?.trim() ||
    user.app_metadata?.must_change_password === true
  )
    throw new Error(
      "An active Municipal Admin account with an assigned municipality is required.",
    );
  const municipality = String(actor.municipality).trim();
  const participants = await directoryPages<Participant>(
    (from, to) =>
      supabase
        .from("profiles")
        .select(
          "id,role,full_name,email,mobile_number,municipality,participant_category,participant_category_other,verification_status,verification_revision,created_at",
        )
        .eq("role", "participant")
        .ilike("municipality", municipality.replace(/[\\%_]/g, "\\$&"))
        .order("id")
        .range(from, to)
        .abortSignal(signal),
    signal,
  );
  const own = participants.filter(
    (row) =>
      row.role === "participant" &&
      normalizeSearch(row.municipality) === normalizeSearch(municipality),
  );
  const proofs: Proof[] = [];
  for (let offset = 0; offset < own.length; offset += 100) {
    const ids = own.slice(offset, offset + 100).map((row) => row.id);
    proofs.push(
      ...(await directoryPages<Proof>(
        (from, to) =>
          supabase
            .from("participant_verifications")
            .select(
              "id,participant_id,verification_type,municipality,participant_category,participant_category_other,profile_revision,status,submitted_at,invalidated_at,withdrawn_at",
            )
            .in("participant_id", ids)
            .order("id")
            .range(from, to)
            .abortSignal(signal),
        signal,
      )),
    );
  }
  return {
    municipality,
    rows: participantDirectory(own, proofs, municipality),
  };
}
