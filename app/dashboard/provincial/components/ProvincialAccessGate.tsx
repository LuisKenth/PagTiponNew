"use client";
import type { ReactNode } from "react";
import { useDashboardAccess } from "@/app/components/useDashboardAccess";
import AccountAccessNotice from "@/app/components/AccountAccessNotice";
export default function ProvincialAccessGate({
  children,
}: {
  children: ReactNode;
}) {
  const gate = useDashboardAccess("provincial_admin");
  return gate.status === "allowed" ? (
    children
  ) : (
    <AccountAccessNotice
      status={gate.status}
      message={gate.message}
      onRetry={gate.retry}
    />
  );
}
