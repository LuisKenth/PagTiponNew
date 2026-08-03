"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import { useUnreadNotificationCount } from "../hooks/useUnreadNotificationCount";
import NotificationBadge from "../notifications/components/NotificationBadge";

type NavigationLink = {
  name: string;
  href: string;
  icon: LucideIcon;
  notification?: boolean;
};

type NavigationGroup = {
  label: string;
  links: NavigationLink[];
};

const navigationGroups: NavigationGroup[] = [
  {
    label: "Overview",
    links: [
      {
        name: "Dashboard",
        href: "/dashboard/provincial",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Event Management",
    links: [
      {
        name: "Create Events",
        href: "/dashboard/provincial/events/create",
        icon: CalendarPlus,
      },
      {
        name: "Provincial Events",
        href: "/dashboard/provincial/events",
        icon: CalendarDays,
      },
      {
        name: "Official Memos",
        href: "/dashboard/provincial/memos",
        icon: FileText,
      },
    ],
  },
  {
    label: "Coordination",
    links: [
      {
        name: "Municipalities",
        href: "/dashboard/provincial/municipalities",
        icon: Building2,
      },
      {
        name: "Reports",
        href: "/dashboard/provincial/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Administration",
    links: [
      {
        name: "Notifications",
        href: "/dashboard/provincial/notifications",
        icon: Bell,
        notification: true,
      },
      {
        name: "Settings",
        href: "/dashboard/provincial/settings",
        icon: Settings,
      },
    ],
  },
];

function normalizePath(path: string) {
  if (path === "/") {
    return path;
  }

  return path.replace(/\/+$/, "");
}

export default function ProvincialSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const { unreadCount } =
    useUnreadNotificationCount();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [mobileOpen]);

  function isActiveLink(href: string) {
    const currentPath =
      normalizePath(pathname);

    const targetPath =
      normalizePath(href);

    const dashboardPath =
      "/dashboard/provincial";

    const createEventsPath =
      "/dashboard/provincial/events/create";

    const provincialEventsPath =
      "/dashboard/provincial/events";

    if (targetPath === dashboardPath) {
      return currentPath === dashboardPath;
    }

    if (targetPath === createEventsPath) {
      return currentPath === createEventsPath;
    }

    if (targetPath === provincialEventsPath) {
      return (
        currentPath === provincialEventsPath ||
        (
          currentPath.startsWith(
            `${provincialEventsPath}/`
          ) &&
          !currentPath.startsWith(
            createEventsPath
          )
        )
      );
    }

    return (
      currentPath === targetPath ||
      currentPath.startsWith(
        `${targetPath}/`
      )
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

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Provincial logout error:",
        error
      );

      alert(
        "Unable to log out. Please try again."
      );

      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-700 text-white shadow-sm">
            <Landmark
              className="h-5 w-5"
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-slate-900">
              PagTipon
            </h1>

            <p className="truncate text-xs text-slate-500">
              Provincial Admin Portal
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              (previous) => !previous
            )
          }
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
          aria-label={
            mobileOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}

          <NotificationBadge
            count={unreadCount}
            floating
          />
        </button>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 transform border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:translate-x-0 lg:shadow-none ${mobileOpen
          ? "translate-x-0"
          : "-translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-700 text-white shadow-sm">
                  <Landmark
                    className="h-6 w-6"
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                    PagTipon
                  </h1>

                  <p className="truncate text-xs font-medium text-slate-500">
                    Provincial Admin Portal
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileOpen(false)
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {navigationGroups.map(
                (group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {group.label}
                    </p>

                    <div className="space-y-1">
                      {group.links.map(
                        (link) => {
                          const active =
                            isActiveLink(
                              link.href
                            );

                          const Icon =
                            link.icon;

                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() =>
                                setMobileOpen(
                                  false
                                )
                              }
                              aria-current={
                                active
                                  ? "page"
                                  : undefined
                              }
                              className={`group flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active
                                ? "bg-indigo-700 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                                }`}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <Icon
                                  className={`h-5 w-5 shrink-0 ${active
                                    ? "text-white"
                                    : "text-slate-400 transition group-hover:text-slate-700"
                                    }`}
                                  aria-hidden={true}
                                />

                                <span className="truncate">
                                  {link.name}
                                </span>
                              </span>

                              <span className="flex shrink-0 items-center gap-2">
                                {link.notification && (
                                  <NotificationBadge
                                    count={
                                      unreadCount
                                    }
                                    active={
                                      active
                                    }
                                  />
                                )}

                                <ChevronRight
                                  className={`h-4 w-4 ${active
                                    ? "text-indigo-100"
                                    : "text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
                                    }`}
                                  aria-hidden="true"
                                />
                              </span>
                            </Link>
                          );
                        }
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </nav>

          {/* Bottom section */}
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                Current Workspace
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                Provincial Administration
              </p>

              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Event coordination and municipal
                oversight
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut
                className="h-4 w-4"
                aria-hidden="true"
              />

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