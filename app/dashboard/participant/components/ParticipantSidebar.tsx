"use client";

import {
  TicketCheck,
  Bell,
  CalendarDays,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import {useParticipantVerification} from "./ParticipantVerificationProvider";
import { useParticipantUnreadCount } from "../hooks/useParticipantUnreadCount";

type ParticipantNavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  showUnreadBadge?: boolean;
  requiresVerification?: boolean;
};



const participantNavigation: ParticipantNavigationItem[] = [
  { label: "Home", href: "/dashboard/participant", icon: LayoutDashboard },
  { label: "Available Events", href: "/dashboard/participant/events", icon: CalendarDays },
  { label: "My Events", href: "/dashboard/participant/my-events", icon: TicketCheck, requiresVerification: true },
  { label: "My Account", href: "/dashboard/participant/account", icon: UserRound },
  { label: "Notifications", href: "/dashboard/participant/notifications", icon: Bell, showUnreadBadge: true },
];
function navigationGroup(pathname: string) {
  if (/\/(registrations|attendance-pass|attendance-history|certificates)(\/|$)/.test(pathname)) return "/dashboard/participant/my-events";
  if (/\/(profile|verification)(\/|$)/.test(pathname)) return "/dashboard/participant/account";
  return pathname;
}

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/dashboard/participant") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatUnreadCount(unreadCount: number) {
  return unreadCount > 99 ? "99+" : String(unreadCount);
}

export default function ParticipantSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { unreadCount, refreshUnreadCount } = useParticipantUnreadCount();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const {status:verificationStatus}=useParticipantVerification();

  useEffect(() => {
    setMobileSidebarOpen(false);
    void refreshUnreadCount();
  }, [pathname, refreshUnreadCount]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileSidebarOpen]);

  const handleLogout = async () => {
    if (loggingOut) return;

    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Participant logout error:", error);
      alert("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const verified = verificationStatus === "verified";

  const lockedReason =
    verificationStatus === "checking"
      ? "Checking account verification."
      : verificationStatus === "error"
        ? "Unable to check verification. Refresh the page to try again."
        : "Complete account verification to access.";

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-20 shrink-0 items-center border-b border-slate-200 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <UserRound className="size-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-950">
              PagTipon
            </p>

            <p className="truncate text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Participant Portal
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mb-3 px-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Navigation
          </p>
        </div>

        <nav aria-label="Participant navigation" className="space-y-1.5">
          {participantNavigation.map((item) => {
            const Icon = item.icon;
            const active = isNavigationItemActive(navigationGroup(pathname), item.href);

            const locked =
              item.requiresVerification === true && !verified;

            const showBadge =
              item.showUnreadBadge === true && unreadCount > 0;

            if (locked) {
              return (
                <div
                  key={item.href}
                  role="link"
                  aria-disabled="true"
                  aria-label={`${item.label}. ${lockedReason}`}
                  title={lockedReason}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-400"
                >
                  <Icon
                    className="size-5 shrink-0"
                    aria-hidden="true"
                  />

                  <span className="min-w-0 flex-1 truncate">
                    {item.label}
                  </span>

                  {verificationStatus === "checking" ? (
                    <Loader2
                      className="size-4 shrink-0 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <LockKeyhole
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Icon
                  className={`size-5 shrink-0 ${
                    active
                      ? "text-white"
                      : "text-slate-400 transition group-hover:text-slate-700"
                  }`}
                  aria-hidden="true"
                />

                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="truncate">{item.label}</span>

                  {showBadge && (
                    <span
                      aria-label={`${unreadCount} unread notifications`}
                      className={`inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                        active
                          ? "bg-white text-slate-950"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {formatUnreadCount(unreadCount)}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 border-t border-slate-200 p-4">
        <div
          className={`mb-3 rounded-xl border p-3 ${
            verified
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              verified ? "text-emerald-900" : "text-amber-900"
            }`}
          >
            {verificationStatus === "checking"
              ? "Checking Verification"
              : verified
                ? "Verified Account"
                : verificationStatus === "error"
                  ? "Verification Unavailable"
                  : "Limited Account Access"}
          </p>

          <p
            className={`mt-1 text-xs leading-5 ${
              verified ? "text-emerald-800" : "text-amber-800"
            }`}
          >
            {verified
              ? "Your residency and participant category are approved."
              : verificationStatus === "checking"
                ? "Please wait while we check your account status."
                : verificationStatus === "error"
                  ? "Unable to check your status. Refresh the page to try again."
                  : "Complete account verification to unlock the restricted features."}
          </p>

          {!verified && (
            <Link
              href="/dashboard/participant/account?tab=verification"
              onClick={() => setMobileSidebarOpen(false)}
              className="mt-2 inline-block text-xs font-bold text-amber-900 underline underline-offset-2"
            >
              Open Account Verification
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white">
            <UserRound className="size-4" aria-hidden="true" />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-950">PagTipon</p>
            <p className="text-[11px] font-medium text-slate-500">
              Participant Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/participant/notifications" aria-label={`Notifications, ${unreadCount} unread`} className="relative flex size-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700">
            <Bell className="size-5" aria-hidden="true" />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">{formatUnreadCount(unreadCount)}</span>}
          </Link>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open participant navigation"
            aria-expanded={mobileSidebarOpen}
            className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>


        </div>
      </header>

      <nav aria-label="Mobile primary navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-sm lg:hidden">
        {participantNavigation.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isNavigationItemActive(navigationGroup(pathname), item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold ${active ? "bg-violet-50 text-violet-700" : "text-slate-600"}`}><Icon className="size-5" aria-hidden="true" /><span>{item.label === "Available Events" ? "Events" : item.label === "My Account" ? "Account" : item.label}</span></Link>;
        })}
      </nav>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white lg:block">
        {sidebarContent}
      </aside>

      {mobileSidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close participant navigation"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
          />

          <aside
            aria-label="Participant sidebar"
            className="fixed inset-y-0 left-0 z-50 w-[86%] max-w-72 border-r border-slate-200 bg-white shadow-2xl lg:hidden"
          >
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close participant navigation"
              className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <X className="size-4" aria-hidden="true" />
            </button>

            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}