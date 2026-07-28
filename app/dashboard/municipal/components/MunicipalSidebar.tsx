"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import { useMunicipalUnreadCount } from "../hooks/useMunicipalUnreadCount";
import MunicipalNotificationBadge from "./MunicipalNotificationBadge";

const navigationLinks = [
  {
    name: "Dashboard",
    href: "/dashboard/municipal",
    icon: LayoutDashboard,
  },
  {
    name: "Venues",
    href: "/dashboard/municipal/venues",
    icon: Building2,
  },
  {
    name: "Notifications",
    href: "/dashboard/municipal/notifications",
    icon: Bell,
  },
];

export default function MunicipalSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { unreadCount } =
    useMunicipalUnreadCount();

  function normalizePath(path: string) {
    if (path === "/") {
      return path;
    }

    return path.replace(/\/+$/, "");
  }

  function isActiveLink(href: string) {
    const currentPath = normalizePath(pathname);
    const targetPath = normalizePath(href);

    if (targetPath === "/dashboard/municipal") {
      return currentPath === targetPath;
    }

    return (
      currentPath === targetPath ||
      currentPath.startsWith(`${targetPath}/`)
    );
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Municipal logout error:",
        error,
      );

      alert("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            PagTipon
          </h1>

          <p className="text-xs text-slate-500">
            Municipal Admin
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              (previous) => !previous,
            )
          }
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700"
          aria-label={
            mobileOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}

          <MunicipalNotificationBadge
            count={unreadCount}
            floating
          />
        </button>
      </header>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 transform border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  PagTipon
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Municipal Admin
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {navigationLinks.map((link) => {
              const active = isActiveLink(
                link.href,
              );

              const Icon = link.icon;

              const isNotificationsLink =
                link.href ===
                "/dashboard/municipal/notifications";

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{link.name}</span>
                  </span>

                  {isNotificationsLink && (
                    <MunicipalNotificationBadge
                      count={unreadCount}
                      active={active}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />

              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}