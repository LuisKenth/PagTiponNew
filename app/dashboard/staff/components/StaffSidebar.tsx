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
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  ScanLine,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type NavigationLink = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  section?: string;
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
        href: "/dashboard/staff",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Attendance Operations",
    links: [
      {
        name: "Event Control",
        href: "/dashboard/staff#event-control",
        icon: ClipboardCheck,
        section: "event-control",
      },
      {
        name: "Attendance Overview",
        href: "/dashboard/staff#attendance-overview",
        icon: BarChart3,
        section: "attendance-overview",
      },
      {
        name: "Participant Check-In",
        href: "/dashboard/staff#participant-check-in",
        icon: QrCode,
        section: "participant-check-in",
      },
      {
        name: "Attendance Records",
        href: "/dashboard/staff#attendance-records",
        icon: ScanLine,
        section: "attendance-records",
      },
    ],
  },
];

export default function StaffSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState("");

  useEffect(() => {
    function updateActiveSection() {
      setActiveSection(
        window.location.hash.replace("#", ""),
      );
    }

    updateActiveSection();

    window.addEventListener(
      "hashchange",
      updateActiveSection,
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        updateActiveSection,
      );
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [mobileOpen]);

  function normalizePath(path: string) {
    const pathWithoutHash =
      path.split("#")[0];

    if (pathWithoutHash === "/") {
      return pathWithoutHash;
    }

    return pathWithoutHash.replace(
      /\/+$/,
      "",
    );
  }

  function isActiveLink(
    link: NavigationLink,
  ) {
    const currentPath =
      normalizePath(pathname);

    const targetPath =
      normalizePath(link.href);

    if (currentPath !== targetPath) {
      return false;
    }

    if (link.section) {
      return activeSection === link.section;
    }

    return activeSection === "";
  }

  function handleNavigation(
    section?: string,
  ) {
    setActiveSection(section ?? "");
    setMobileOpen(false);
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
        "Staff logout error:",
        error,
      );

      alert(
        "Unable to log out. Please try again.",
      );

      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <ScanLine
              className="h-5 w-5"
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-slate-900">
              PagTipon
            </h1>

            <p className="truncate text-xs text-slate-500">
              Event Staff Portal
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              (previous) => !previous,
            )
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
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

      {/* Desktop and mobile sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 transform border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:translate-x-0 lg:shadow-none ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <ScanLine
                    className="h-6 w-6"
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                    PagTipon
                  </h1>

                  <p className="truncate text-xs font-medium text-slate-500">
                    Event Staff Portal
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
          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-6">
              {navigationGroups.map(
                (group) => (
                  <div key={group.label}>
                    <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {group.label}
                    </p>

                    <div className="space-y-1">
                      {group.links.map(
                        (link) => {
                          const active =
                            isActiveLink(link);

                          const Icon =
                            link.icon;

                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() =>
                                handleNavigation(
                                  link.section,
                                )
                              }
                              aria-current={
                                active
                                  ? "page"
                                  : undefined
                              }
                              className={`group flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                active
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <Icon
                                  className={`h-5 w-5 shrink-0 ${
                                    active
                                      ? "text-white"
                                      : "text-slate-400 transition group-hover:text-slate-700"
                                  }`}
                                  aria-hidden="true"
                                />

                                <span className="truncate">
                                  {link.name}
                                </span>
                              </span>

                              <ChevronRight
                                className={`h-4 w-4 shrink-0 ${
                                  active
                                    ? "text-emerald-100"
                                    : "text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
                                }`}
                                aria-hidden="true"
                              />
                            </Link>
                          );
                        },
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </nav>

          {/* Bottom section */}
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Current Workspace
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                Attendance Operations
              </p>

              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                QR check-in and participant monitoring
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