"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  UserRoundCog,
  Users,
  UserX,
} from "lucide-react";
import { superRequest, message } from "@/lib/super/client";
import type { OverviewResult } from "@/lib/super/types";
import { useSuperAccount } from "./components/SuperContext";
import {
  PageHeader,
  RefreshButton,
  Loading,
  ErrorMessage,
  primaryClass,
} from "./components/ui";
import ActivityList from "./components/ActivityList";
export default function SuperDashboard() {
  const { profile } = useSuperAccount();
  const [data, setData] = useState<OverviewResult | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await superRequest<OverviewResult>("/api/super/admins?view=overview"),
      );
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const cards = [
    {
      label: "Provincial Admins",
      value: data?.total,
      caption: "Total administrator accounts",
      icon: Users,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Active Accounts",
      value: data?.active,
      caption: "Approved for provincial access",
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Inactive Accounts",
      value: data?.inactive,
      caption: "Currently restricted accounts",
      icon: UserX,
      color: "bg-slate-100 text-slate-500",
    },
    {
      label: "Account Activity",
      value: data?.recentActivityCount,
      caption: "Recorded in the last 7 days",
      icon: Activity,
      color: "bg-amber-50 text-amber-600",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Workspace overview"
        title="Super Admin Dashboard"
        description={`Welcome, ${profile.full_name || "Super Admin"}. Manage administrator access and keep account recovery information up to date.`}
        icon={ShieldCheck}
      >
        <RefreshButton busy={loading} onClick={() => void load()} />
      </PageHeader>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <section
        aria-label="Account summary"
        className="mobile-summary-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map(({ label, value, caption, icon: Icon, color }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <span className={`rounded-xl p-2.5 ${color}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {loading ? "—" : (value ?? "—")}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">{caption}</p>
          </article>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Recent Account Activity</h2>
              <p className="mt-1 text-xs text-slate-400">
                Latest administrator actions · Philippine time
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600"
              href="/dashboard/super/audit-logs"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3">
            {loading ? (
              <Loading />
            ) : (
              <ActivityList entries={data?.recent || []} />
            )}
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Users className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold">Manage Provincial Admins</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Create an administrator account, manage its status, or help the
              owner recover access.
            </p>
            <Link
              href="/dashboard/super/admins"
              className={`${primaryClass} mt-5 w-full`}
            >
              Open Admin Management
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6">
            <div className="flex items-center gap-2 font-bold text-indigo-800">
              <ShieldCheck className="h-5 w-5" />
              Your account is protected
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {profile.factorCount} verified authenticator
              {profile.factorCount === 1 ? "" : "s"} linked. Keep an accessible
              recovery email and verify a backup before removing an
              authenticator.
            </p>
            <Link
              href="/dashboard/super/settings"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
            >
              <UserRoundCog className="h-4 w-4" />
              Review Account Security
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
