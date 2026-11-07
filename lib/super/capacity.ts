import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AccessError } from "@/lib/superAdminAuth";
import type { ProvincialCapacity } from "./types";

export const PROVINCIAL_LIMIT_MESSAGE =
  "Maximum of 2 active Provincial Admin accounts reached. Deactivate an existing Provincial Admin before adding or activating another.";

export async function provincialCapacity(): Promise<ProvincialCapacity> {
  const { data, error } = await supabaseAdmin.rpc("super_provincial_capacity");
  if (
    error ||
    !data ||
    data.activeLimit !== 2 ||
    !Number.isInteger(data.activeCount) ||
    data.activeCount < 0 ||
    data.activeCount > 2 ||
    data.remaining !== data.activeLimit - data.activeCount
  ) {
    throw new AccessError(
      "Unable to check Provincial Admin slots. Install the Provincial Admin limit migration or refresh and try again.",
      503,
    );
  }
  return data as ProvincialCapacity;
}

export async function requireProvincialSlot() {
  if ((await provincialCapacity()).remaining === 0)
    throw new AccessError(PROVINCIAL_LIMIT_MESSAGE, 409);
}
