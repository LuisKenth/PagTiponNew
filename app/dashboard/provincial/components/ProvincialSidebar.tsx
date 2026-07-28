"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { useState } from "react";

import { supabase } from "@/lib/supabase";

import { useUnreadNotificationCount } from "../hooks/useUnreadNotificationCount";
import NotificationBadge from "../notifications/components/NotificationBadge";

const navLinks = [
  {
    name: "Dashboard",
    href: "/dashboard/provincial",
  },
  {
    name: "Create Events",
    href: "/dashboard/provincial/events/create",
  },
  {
    name: "Provincial Events",
    href: "/dashboard/provincial/events",
  },
  {
    name: "Official Memos",
    href: "/dashboard/provincial/memos",
  },
  {
    name: "Municipalities",
    href: "/dashboard/provincial/municipalities",
  },
  {
    name: "Reports",
    href: "/dashboard/provincial/reports",
  },
  {
    name: "Notifications",
    href: "/dashboard/provincial/notifications",
  },
  {
    name: "Settings",
    href: "/dashboard/provincial/settings",
  },
];

export default function ProvincialSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const { unreadCount } =
    useUnreadNotificationCount();

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
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  }

  function normalizePath(path: string) {
    if (path === "/") {
      return path;
    }

    return path.replace(/\/+$/, "");
  }

  function isActiveLink(href: string) {
    const currentPath = normalizePath(pathname);
    const targetPath = normalizePath(href);

    const createEventsPath =
      "/dashboard/provincial/events/create";

    const provincialEventsPath =
      "/dashboard/provincial/events";

    if (targetPath === "/dashboard/provincial") {
      return currentPath === targetPath;
    }

    if (targetPath === createEventsPath) {
      return currentPath === createEventsPath;
    }

    if (targetPath === provincialEventsPath) {
      return (
        currentPath === provincialEventsPath ||
        (currentPath.startsWith(
          `${provincialEventsPath}/`,
        ) &&
          !currentPath.startsWith(
            createEventsPath,
          ))
      );
    }

    return (
      currentPath === targetPath ||
      currentPath.startsWith(`${targetPath}/`)
    );
  }

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            PagTipon
          </h1>

          <p className="text-xs text-slate-500">
            Provincial Admin
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              (previous) => !previous,
            )
          }
          className="relative rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Menu

          <NotificationBadge
            count={unreadCount}
            floating
          />
        </button>
      </div>

      {mobileOpen && (
        <div
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
            <h1 className="text-2xl font-bold text-slate-900">
              PagTipon
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Provincial Admin
            </p>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {navLinks.map((link) => {
              const active = isActiveLink(
                link.href,
              );

              const isNotificationLink =
                link.href ===
                "/dashboard/provincial/notifications";

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>{link.name}</span>

                    {isNotificationLink && (
                      <NotificationBadge
                        count={unreadCount}
                        active={active}
                      />
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
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