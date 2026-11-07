"use client";
import type { ReactNode } from "react";
import { useDashboardAccess } from "@/app/components/useDashboardAccess";
import AccountAccessNotice from "@/app/components/AccountAccessNotice";
import MunicipalSidebar from "./components/MunicipalSidebar";

export default function Layout({ children }: { children: ReactNode }) {
  const gate = useDashboardAccess("municipal_admin");
  if (gate.status !== "allowed")
    return (
      <AccountAccessNotice
        status={gate.status}
        message={gate.message}
        onRetry={gate.retry}
      />
    );
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <MunicipalSidebar />
      <div className="min-w-0">
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 xl:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
