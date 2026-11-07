"use client";
import { createContext, useContext } from "react";
import type { SuperProfile } from "@/lib/super/types";
export const SuperContext = createContext<{
  profile: SuperProfile;
  refreshProfile: () => Promise<void>;
} | null>(null);
export function useSuperAccount() {
  const context = useContext(SuperContext);
  if (!context) throw new Error("Super Admin context unavailable.");
  return context;
}
