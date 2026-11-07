"use client";

import { useDashboardAccess } from "@/app/components/useDashboardAccess";
import AccountAccessNotice from "@/app/components/AccountAccessNotice";
import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, LockKeyhole, RefreshCw } from "lucide-react";

import ParticipantVerificationProvider, {
  useParticipantVerification,
} from "./components/ParticipantVerificationProvider";
import ParticipantSidebar from "./components/ParticipantSidebar";

type ParticipantLayoutProps = {
  children: ReactNode;
};

const unrestrictedRoutes = [
  "/dashboard/participant",
  "/dashboard/participant/events",
  "/dashboard/participant/account",
  "/dashboard/participant/profile",
  "/dashboard/participant/notifications",
  "/dashboard/participant/verification",
];

function isUnrestrictedRoute(pathname: string) {
  const path = pathname.replace(/\/+$/, "");

  return unrestrictedRoutes.some((route) => {
    if (route === "/dashboard/participant") {
      return path === route;
    }

    return path === route || path.startsWith(`${route}/`);
  });
}

function ParticipantAccess({ children }: ParticipantLayoutProps) {
  const pathname = usePathname();

  const { status: accessStatus, refresh: checkAccess } =
    useParticipantVerification();
  const unrestricted = isUnrestrictedRoute(pathname);

  if (accessStatus === "error")
    return (
      <AccountAccessNotice
        status="retry"
        message="Unable to check your verification. Check your connection and try again."
        onRetry={checkAccess}
      />
    );
  return (
    <div className="min-h-screen bg-slate-100">
      <ParticipantSidebar />

      <div className="lg:pl-72">
        <div className="min-h-screen pb-24 lg:pb-0">
          {unrestricted ? (
            children
          ) : accessStatus === "checking" ? (
            <div
              role="status"
              className="flex min-h-[60vh] items-center justify-center gap-3 p-6 text-slate-600"
            >
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Checking account verification...
            </div>
          ) : accessStatus === "verified" ? (
            children
          ) : (
            <main className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <LockKeyhole className="h-7 w-7" aria-hidden="true" />
                </div>

                <h1 className="mt-5 text-2xl font-bold text-slate-950">
                  Account Verification Required
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Your residency and participant category must both be approved
                  before you can access this feature.
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  You can still browse available events, update your profile,
                  view notifications, and submit verification documents. Your
                  existing records are retained.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/participant/account?tab=verification"
                    className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Go to Account Verification
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      void checkAccess();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Check Again
                  </button>
                </div>
              </section>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
export default function ParticipantLayout({
  children,
}: ParticipantLayoutProps) {
  const gate = useDashboardAccess("participant");
  if (gate.status !== "allowed")
    return (
      <AccountAccessNotice
        status={gate.status}
        message={gate.message}
        onRetry={gate.retry}
      />
    );
  return (
    <ParticipantVerificationProvider>
      <ParticipantAccess>{children}</ParticipantAccess>
    </ParticipantVerificationProvider>
  );
}
