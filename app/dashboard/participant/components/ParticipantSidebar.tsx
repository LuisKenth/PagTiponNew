"use client";

import {
    Bell,
    CalendarDays,
    ClipboardCheck,
    History,
    LayoutDashboard,
    LogOut,
    Menu,
    QrCode,
    UserRound,
    X,
} from "lucide-react";
import Link from "next/link";
import {
    usePathname,
    useRouter,
} from "next/navigation";
import {
    useEffect,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

import { useParticipantUnreadCount } from "../hooks/useParticipantUnreadCount";

type ParticipantNavigationItem = {
    label: string;
    href: string;
    icon: typeof LayoutDashboard;
    showUnreadBadge?: boolean;
};

const participantNavigation: ParticipantNavigationItem[] =
    [
        {
            label: "Dashboard",
            href: "/dashboard/participant",
            icon: LayoutDashboard,
        },
        {
            label: "Available Events",
            href: "/dashboard/participant/events",
            icon: CalendarDays,
        },
        {
            label: "My Registrations",
            href: "/dashboard/participant/registrations",
            icon: ClipboardCheck,
        },
        {
            label: "Attendance Pass",
            href: "/dashboard/participant/attendance-pass",
            icon: QrCode,
        },
        {
            label: "Attendance History",
            href: "/dashboard/participant/attendance-history",
            icon: History,
        },
        {
            label: "My Profile",
            href: "/dashboard/participant/profile",
            icon: UserRound,
        },
        {
            label: "Notifications",
            href: "/dashboard/participant/notifications",
            icon: Bell,
            showUnreadBadge: true,
        },
    ];

function isNavigationItemActive(
    pathname: string,
    href: string,
) {
    if (href === "/dashboard/participant") {
        return pathname === href;
    }

    return (
        pathname === href ||
        pathname.startsWith(`${href}/`)
    );
}

function formatUnreadCount(
    unreadCount: number,
) {
    if (unreadCount > 99) {
        return "99+";
    }

    return String(unreadCount);
}

export default function ParticipantSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const {
        unreadCount,
        refreshUnreadCount,
    } = useParticipantUnreadCount();

    const [
        mobileSidebarOpen,
        setMobileSidebarOpen,
    ] = useState(false);

    const [loggingOut, setLoggingOut] =
        useState(false);

    useEffect(() => {
        setMobileSidebarOpen(false);

        void refreshUnreadCount();
    }, [pathname, refreshUnreadCount]);

    useEffect(() => {
        if (!mobileSidebarOpen) {
            return;
        }

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (event.key === "Escape") {
                setMobileSidebarOpen(false);
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [mobileSidebarOpen]);

    const handleLogout = async () => {
        if (loggingOut) {
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to log out?",
        );

        if (!confirmed) {
            return;
        }

        setLoggingOut(true);

        try {
            const { error } =
                await supabase.auth.signOut();

            if (error) {
                throw error;
            }

            router.replace("/login");
            router.refresh();
        } catch (error) {
            console.error(
                "Participant logout error:",
                error,
            );

            alert(
                "Unable to log out. Please try again.",
            );
        } finally {
            setLoggingOut(false);
        }
    };

    const sidebarContent = (
        <div className="flex h-full flex-col">
            <div className="flex h-20 items-center border-b border-slate-200 px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                        <UserRound
                            className="size-5"
                            aria-hidden="true"
                        />
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

            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="mb-3 px-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Navigation
                    </p>
                </div>

                <nav
                    aria-label="Participant navigation"
                    className="space-y-1.5"
                >
                    {participantNavigation.map(
                        (item) => {
                            const Icon =
                                item.icon;

                            const active =
                                isNavigationItemActive(
                                    pathname,
                                    item.href,
                                );

                            const showBadge =
                                item.showUnreadBadge ===
                                true &&
                                unreadCount > 0;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={
                                        active
                                            ? "page"
                                            : undefined
                                    }
                                    className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active
                                            ? "bg-slate-950 text-white shadow-sm"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                                        }`}
                                >
                                    <Icon
                                        className={`size-5 shrink-0 ${active
                                                ? "text-white"
                                                : "text-slate-400 transition group-hover:text-slate-700"
                                            }`}
                                        aria-hidden="true"
                                    />

                                    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                                        <span className="truncate">
                                            {item.label}
                                        </span>

                                        {showBadge && (
                                            <span
                                                aria-label={`${unreadCount} unread notifications`}
                                                className={`inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${active
                                                        ? "bg-white text-slate-950"
                                                        : "bg-red-500 text-white"
                                                    }`}
                                            >
                                                {formatUnreadCount(
                                                    unreadCount,
                                                )}
                                            </span>
                                        )}
                                    </span>
                                </Link>
                            );
                        },
                    )}
                </nav>
            </div>

            <div className="border-t border-slate-200 p-4">
                <div className="mb-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                        Participant Account
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        View events, registration
                        passes, notifications, and
                        attendance records.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        void handleLogout()
                    }
                    disabled={loggingOut}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <LogOut
                        className="size-4"
                        aria-hidden="true"
                    />

                    {loggingOut
                        ? "Logging out..."
                        : "Logout"}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile header */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                        <UserRound
                            className="size-4"
                            aria-hidden="true"
                        />
                    </div>

                    <div>
                        <p className="text-sm font-bold text-slate-950">
                            PagTipon
                        </p>

                        <p className="text-[11px] font-medium text-slate-500">
                            Participant Portal
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() =>
                            setMobileSidebarOpen(
                                true,
                            )
                        }
                        aria-label="Open participant navigation"
                        aria-expanded={
                            mobileSidebarOpen
                        }
                        className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                    >
                        <Menu
                            className="size-5"
                            aria-hidden="true"
                        />
                    </button>

                    {unreadCount > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white"
                        >
                            {formatUnreadCount(
                                unreadCount,
                            )}
                        </span>
                    )}
                </div>
            </header>

            {/* Desktop sidebar */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white lg:block">
                {sidebarContent}
            </aside>

            {/* Mobile backdrop */}
            {mobileSidebarOpen && (
                <button
                    type="button"
                    aria-label="Close participant navigation"
                    onClick={() =>
                        setMobileSidebarOpen(
                            false,
                        )
                    }
                    className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
                />
            )}

            {/* Mobile sidebar */}
            <aside
                aria-label="Participant sidebar"
                className={`fixed inset-y-0 left-0 z-50 w-[86%] max-w-72 border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 lg:hidden ${mobileSidebarOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                    }`}
            >
                <button
                    type="button"
                    onClick={() =>
                        setMobileSidebarOpen(
                            false,
                        )
                    }
                    aria-label="Close participant navigation"
                    className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                >
                    <X
                        className="size-4"
                        aria-hidden="true"
                    />
                </button>

                {sidebarContent}
            </aside>
        </>
    );
}