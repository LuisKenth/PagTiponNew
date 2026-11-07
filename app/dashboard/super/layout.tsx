"use client";
import { useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { useDashboardAccess } from "@/app/components/useDashboardAccess";
import AccountAccessNotice from "@/app/components/AccountAccessNotice";
import { AccessProblem } from "@/lib/access/errors";
import { superRequest, SuperApiError } from "@/lib/super/client";
import type { SuperProfile } from "@/lib/super/types";
import { SuperContext } from "./components/SuperContext";
import SuperSidebar from "./components/SuperSidebar";

export default function SuperLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const checkServer = useCallback(async (signal: AbortSignal) => {
    try {
      return (
        await superRequest<{ profile: SuperProfile }>(
          "/api/super/me",
          undefined,
          "POST",
          signal,
        )
      ).profile;
    } catch (error) {
      if (error instanceof SuperApiError) {
        if (error.status === 401)
          throw new AccessProblem("redirect", error.message, "/login");
        if (error.status === 403) {
          if (error.message.includes("Authenticator verification"))
            throw new AccessProblem(
              "redirect",
              error.message,
              "/super-admin-security",
            );
          if (error.message.includes("Change your initial password"))
            throw new AccessProblem(
              "redirect",
              error.message,
              "/change-password",
            );
          throw new AccessProblem("denied", error.message);
        }
      }
      throw error;
    }
  }, []);
  const gate = useDashboardAccess("super_admin", checkServer);
  const profile = gate.value;
  const refreshProfile = gate.refresh;
  if (gate.status !== "allowed")
    return (
      <AccountAccessNotice
        status={gate.status}
        message={gate.message}
        onRetry={gate.retry}
      />
    );
  if (!profile) return null;
  const title = pathname.includes("/admins")
    ? "Provincial Admins"
    : pathname.includes("/audit-logs")
      ? "Audit Logs"
      : pathname.includes("/settings")
        ? "My Account & Security"
        : "Dashboard";
  return (
    <SuperContext.Provider value={{ profile, refreshProfile }}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <SuperSidebar />
        <div className="min-w-0 lg:pl-72">
          <header className="hidden h-20 items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex">
            <p className="text-sm text-slate-400">
              Super Admin <span className="mx-3 text-slate-300">/</span>
              <span className="font-semibold text-slate-700">{title}</span>
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <LockKeyhole className="h-3.5 w-3.5" />
              MFA verified
            </span>
          </header>
          <main
            id="main-content"
            className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8"
          >
            {children}
          </main>
        </div>
      </div>
    </SuperContext.Provider>
  );
}
