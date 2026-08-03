"use client";

import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    History,
    QrCode,
    RefreshCw,
    TicketCheck,
} from "lucide-react";
import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

type EventRow = {
    id: string;
    title: string;
    description: string | null;
    start_at: string | null;
    end_at: string | null;
    status: string | null;
};

type EventAssignmentRow = {
    id: string;
    event_id: string;
    municipality: string;
    municipal_status: string | null;
    registration_open: boolean | null;
    local_instructions: string | null;
};

type RSVPRow = {
    id: string;
    event_municipality_id: string;
    status: string | null;
    registered_at: string | null;
};

type AttendanceRow = {
    id: string;
    status: string;
    checked_in_at: string | null;
};

type DashboardEventItem = {
    event: EventRow;
    assignment: EventAssignmentRow;
    rsvp: RSVPRow | null;
    registered: boolean;
};

type ParticipantDashboardData = {
    municipality: string;
    availableEvents: DashboardEventItem[];
    registrations: DashboardEventItem[];
    attendanceRecords: AttendanceRow[];
    nextEvent: DashboardEventItem | null;
};

const REGISTRATION_ALLOWED_STATUSES = [
    "published",
    "upcoming",
];

const ACTIVE_PASS_STATUSES = [
    "published",
    "upcoming",
    "ongoing",
];

const participantActions = [
    {
        title: "Available Events",
        description:
            "Browse events currently open for registration.",
        href: "/dashboard/participant/events",
        icon: CalendarDays,
    },
    {
        title: "My Registrations",
        description:
            "View active, completed, and cancelled registrations.",
        href: "/dashboard/participant/registrations",
        icon: ClipboardCheck,
    },
    {
        title: "Attendance Pass",
        description:
            "Open your QR code and manual attendance code.",
        href: "/dashboard/participant/attendance-pass",
        icon: QrCode,
    },
    {
        title: "Attendance History",
        description:
            "Review your attendance results and check-in records.",
        href: "/dashboard/participant/attendance-history",
        icon: History,
    },
];

const initialDashboardData: ParticipantDashboardData = {
    municipality: "",
    availableEvents: [],
    registrations: [],
    attendanceRecords: [],
    nextEvent: null,
};

function normalizeStatus(
    value: string | null | undefined,
) {
    return value?.trim().toLowerCase() ?? "";
}

function formatDateTime(
    value: string | null,
) {
    if (!value) {
        return "Not set";
    }

    return new Date(value).toLocaleString(
        "en-PH",
        {
            dateStyle: "medium",
            timeStyle: "short",
        },
    );
}

function getTimeValue(
    value: string | null,
    fallback = Number.MAX_SAFE_INTEGER,
) {
    if (!value) {
        return fallback;
    }

    const time = new Date(value).getTime();

    return Number.isNaN(time)
        ? fallback
        : time;
}

function getEventStatusLabel(
    status: string | null,
) {
    const normalizedStatus =
        normalizeStatus(status);

    if (normalizedStatus === "published") {
        return "Scheduled";
    }

    if (normalizedStatus === "upcoming") {
        return "Upcoming";
    }

    if (normalizedStatus === "ongoing") {
        return "Ongoing";
    }

    if (normalizedStatus === "completed") {
        return "Completed";
    }

    if (normalizedStatus === "cancelled") {
        return "Cancelled";
    }

    return status || "Unknown";
}

function getEventStatusClasses(
    status: string | null,
) {
    const normalizedStatus =
        normalizeStatus(status);

    if (normalizedStatus === "ongoing") {
        return "bg-green-100 text-green-700";
    }

    if (
        normalizedStatus === "published" ||
        normalizedStatus === "upcoming"
    ) {
        return "bg-blue-100 text-blue-700";
    }

    if (normalizedStatus === "completed") {
        return "bg-slate-100 text-slate-700";
    }

    if (normalizedStatus === "cancelled") {
        return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-600";
}

export default function ParticipantDashboardPage() {
    const [
        dashboardData,
        setDashboardData,
    ] = useState<ParticipantDashboardData>(
        initialDashboardData,
    );

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const fetchDashboardData =
        useCallback(async (
            refreshOnly = false,
        ) => {
            if (refreshOnly) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setErrorMessage("");

            try {
                const {
                    data: { user },
                    error: userError,
                } =
                    await supabase.auth.getUser();

                if (userError || !user) {
                    throw new Error(
                        userError?.message ||
                        "Participant user not found.",
                    );
                }

                const {
                    data: profile,
                    error: profileError,
                } = await supabase
                    .from("profiles")
                    .select("municipality")
                    .eq("id", user.id)
                    .maybeSingle();

                if (
                    profileError ||
                    !profile?.municipality
                ) {
                    throw new Error(
                        profileError?.message ||
                        "Participant municipality not found.",
                    );
                }

                const municipality =
                    profile.municipality;

                const [
                    openAssignmentsResult,
                    rsvpsResult,
                    attendanceResult,
                ] = await Promise.all([
                    supabase
                        .from(
                            "event_municipalities",
                        )
                        .select(
                            `
                                id,
                                event_id,
                                municipality,
                                municipal_status,
                                registration_open,
                                local_instructions
                            `,
                        )
                        .eq(
                            "municipality",
                            municipality,
                        )
                        .eq(
                            "municipal_status",
                            "prepared",
                        )
                        .eq(
                            "registration_open",
                            true,
                        ),

                    supabase
                        .from("rsvps")
                        .select(
                            `
                                id,
                                event_municipality_id,
                                status,
                                registered_at
                            `,
                        )
                        .eq(
                            "user_id",
                            user.id,
                        )
                        .eq(
                            "status",
                            "registered",
                        )
                        .order(
                            "registered_at",
                            {
                                ascending: false,
                            },
                        ),

                    supabase
                        .from("attendance")
                        .select(
                            `
                                id,
                                status,
                                checked_in_at
                            `,
                        )
                        .eq(
                            "user_id",
                            user.id,
                        ),
                ]);

                if (
                    openAssignmentsResult.error
                ) {
                    throw openAssignmentsResult.error;
                }

                if (rsvpsResult.error) {
                    throw rsvpsResult.error;
                }

                if (attendanceResult.error) {
                    throw attendanceResult.error;
                }

                const openAssignments =
                    (openAssignmentsResult.data ||
                        []) as EventAssignmentRow[];

                const rsvps =
                    (rsvpsResult.data ||
                        []) as RSVPRow[];

                const attendanceRecords =
                    (attendanceResult.data ||
                        []) as AttendanceRow[];

                const registeredAssignmentIds =
                    Array.from(
                        new Set(
                            rsvps.map(
                                (rsvp) =>
                                    rsvp.event_municipality_id,
                            ),
                        ),
                    );

                let registeredAssignments: EventAssignmentRow[] =
                    [];

                if (
                    registeredAssignmentIds.length >
                    0
                ) {
                    const {
                        data:
                        registeredAssignmentRows,
                        error:
                        registeredAssignmentError,
                    } = await supabase
                        .from(
                            "event_municipalities",
                        )
                        .select(
                            `
                                id,
                                event_id,
                                municipality,
                                municipal_status,
                                registration_open,
                                local_instructions
                            `,
                        )
                        .in(
                            "id",
                            registeredAssignmentIds,
                        );

                    if (
                        registeredAssignmentError
                    ) {
                        throw registeredAssignmentError;
                    }

                    registeredAssignments =
                        (registeredAssignmentRows ||
                            []) as EventAssignmentRow[];
                }

                const assignmentMap =
                    new Map<
                        string,
                        EventAssignmentRow
                    >();

                [
                    ...openAssignments,
                    ...registeredAssignments,
                ].forEach((assignment) => {
                    assignmentMap.set(
                        String(assignment.id),
                        assignment,
                    );
                });

                const allAssignments =
                    Array.from(
                        assignmentMap.values(),
                    );

                const eventIds = Array.from(
                    new Set(
                        allAssignments.map(
                            (assignment) =>
                                assignment.event_id,
                        ),
                    ),
                );

                let events: EventRow[] = [];

                if (eventIds.length > 0) {
                    const {
                        data: eventRows,
                        error: eventError,
                    } = await supabase
                        .from("events")
                        .select(
                            `
                                id,
                                title,
                                description,
                                start_at,
                                end_at,
                                status
                            `,
                        )
                        .in("id", eventIds);

                    if (eventError) {
                        throw eventError;
                    }

                    events =
                        (eventRows ||
                            []) as EventRow[];
                }

                const eventMap = new Map<
                    string,
                    EventRow
                >();

                events.forEach((event) => {
                    eventMap.set(
                        String(event.id),
                        event,
                    );
                });

                const rsvpMap = new Map<
                    string,
                    RSVPRow
                >();

                rsvps.forEach((rsvp) => {
                    rsvpMap.set(
                        String(
                            rsvp.event_municipality_id,
                        ),
                        rsvp,
                    );
                });

                const availableEvents: DashboardEventItem[] = [];

                for (const assignment of openAssignments) {
                    const event = eventMap.get(
                        String(assignment.event_id),
                    );

                    if (!event) {
                        continue;
                    }

                    const eventStatus = normalizeStatus(
                        event.status,
                    );

                    if (
                        !REGISTRATION_ALLOWED_STATUSES.includes(
                            eventStatus,
                        )
                    ) {
                        continue;
                    }

                    const rsvp =
                        rsvpMap.get(
                            String(assignment.id),
                        ) ?? null;

                    availableEvents.push({
                        event,
                        assignment,
                        rsvp,
                        registered: Boolean(rsvp),
                    });
                }

                availableEvents.sort(
                    (first, second) =>
                        getTimeValue(
                            first.event.start_at,
                        ) -
                        getTimeValue(
                            second.event.start_at,
                        ),
                );

                const registrations: DashboardEventItem[] =
                    [];

                for (const rsvp of rsvps) {
                    const assignment = assignmentMap.get(
                        String(
                            rsvp.event_municipality_id,
                        ),
                    );

                    if (!assignment) {
                        continue;
                    }

                    const event = eventMap.get(
                        String(assignment.event_id),
                    );

                    if (!event) {
                        continue;
                    }

                    registrations.push({
                        event,
                        assignment,
                        rsvp,
                        registered: true,
                    });
                }

                registrations.sort(
                    (first, second) =>
                        getTimeValue(
                            second.rsvp?.registered_at ??
                            null,
                            0,
                        ) -
                        getTimeValue(
                            first.rsvp?.registered_at ??
                            null,
                            0,
                        ),
                );

                const currentTime =
                    Date.now();

                const activeRegisteredEvents =
                    registrations
                        .filter((item) => {
                            const eventStatus =
                                normalizeStatus(
                                    item.event
                                        .status,
                                );

                            const eventEndTime =
                                getTimeValue(
                                    item.event
                                        .end_at,
                                );

                            return (
                                ACTIVE_PASS_STATUSES.includes(
                                    eventStatus,
                                ) &&
                                eventEndTime >=
                                currentTime
                            );
                        })
                        .sort(
                            (
                                first,
                                second,
                            ) =>
                                getTimeValue(
                                    first.event
                                        .start_at,
                                ) -
                                getTimeValue(
                                    second.event
                                        .start_at,
                                ),
                        );

                const availableFutureEvents =
                    availableEvents.filter(
                        (item) =>
                            getTimeValue(
                                item.event.end_at,
                            ) >= currentTime,
                    );

                const nextEvent =
                    activeRegisteredEvents[0] ||
                    availableFutureEvents[0] ||
                    null;

                setDashboardData({
                    municipality,
                    availableEvents,
                    registrations,
                    attendanceRecords,
                    nextEvent,
                });
            } catch (error) {
                console.error(
                    "Participant dashboard fetch error:",
                    error,
                );

                setDashboardData(
                    initialDashboardData,
                );

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to load the participant dashboard.",
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        }, []);

    useEffect(() => {
        void fetchDashboardData();
    }, [fetchDashboardData]);

    const dashboardCounts =
        useMemo(() => {
            const activePasses =
                dashboardData.registrations.filter(
                    (item) =>
                        ACTIVE_PASS_STATUSES.includes(
                            normalizeStatus(
                                item.event.status,
                            ),
                        ),
                ).length;

            const presentAttendance =
                dashboardData.attendanceRecords.filter(
                    (record) =>
                        normalizeStatus(
                            record.status,
                        ) === "present",
                ).length;

            return {
                available:
                    dashboardData.availableEvents
                        .length,

                registrations:
                    dashboardData.registrations
                        .length,

                activePasses,

                presentAttendance,

                attendanceTotal:
                    dashboardData
                        .attendanceRecords.length,
            };
        }, [dashboardData]);

    const recentRegistrations =
        useMemo(
            () =>
                dashboardData.registrations.slice(
                    0,
                    3,
                ),
            [dashboardData.registrations],
        );

    const nextEvent =
        dashboardData.nextEvent;

    const nextEventRegistered =
        Boolean(nextEvent?.registered);

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Participant Portal
                            </p>

                            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                                Participant Dashboard
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                View events,
                                registrations,
                                attendance passes,
                                and attendance records
                                for{" "}
                                <span className="font-semibold text-slate-900">
                                    {dashboardData.municipality ||
                                        "your municipality"}
                                </span>
                                .
                            </p>

                            <Link
                                href="/dashboard/participant/events"
                                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Browse Available Events

                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Link>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void fetchDashboardData(
                                    true,
                                )
                            }
                            disabled={refreshing}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw
                                className={`size-4 ${refreshing
                                        ? "animate-spin"
                                        : ""
                                    }`}
                                aria-hidden="true"
                            />

                            {refreshing
                                ? "Refreshing..."
                                : "Refresh"}
                        </button>
                    </div>
                </section>

                {errorMessage && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-4"
                    >
                        <p className="text-sm font-semibold text-red-800">
                            Unable to load dashboard
                        </p>

                        <p className="mt-1 text-sm text-red-600">
                            {errorMessage}
                        </p>
                    </div>
                )}

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Link
                        href="/dashboard/participant/events"
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    Available Events
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {loading
                                        ? "—"
                                        : dashboardCounts.available}
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <CalendarDays
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/participant/registrations"
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    Registrations
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {loading
                                        ? "—"
                                        : dashboardCounts.registrations}
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                                <TicketCheck
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/participant/attendance-pass"
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    Active Passes
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {loading
                                        ? "—"
                                        : dashboardCounts.activePasses}
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                <QrCode
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/participant/attendance-history"
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    Attendance
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {loading
                                        ? "—"
                                        : `${dashboardCounts.presentAttendance}/${dashboardCounts.attendanceTotal}`}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    Present / Total
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                <CheckCircle2
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </Link>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-950">
                                    Next Event
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Your nearest active
                                    or available event.
                                </p>
                            </div>

                            <CalendarDays
                                className="size-5 text-slate-400"
                                aria-hidden="true"
                            />
                        </div>

                        {loading ? (
                            <div className="mt-5 rounded-xl bg-slate-50 p-8 text-center">
                                <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                                <p className="mt-3 text-sm text-slate-500">
                                    Loading next
                                    event...
                                </p>
                            </div>
                        ) : nextEvent ? (
                            <div className="mt-5 rounded-2xl border border-slate-200 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-950">
                                            {
                                                nextEvent
                                                    .event
                                                    .title
                                            }
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {
                                                nextEvent
                                                    .assignment
                                                    .municipality
                                            }
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {nextEventRegistered && (
                                            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                                                Registered
                                            </span>
                                        )}

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventStatusClasses(
                                                nextEvent
                                                    .event
                                                    .status,
                                            )}`}
                                        >
                                            {getEventStatusLabel(
                                                nextEvent
                                                    .event
                                                    .status,
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                    {nextEvent.event
                                        .description ||
                                        "No event description provided."}
                                </p>

                                <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Starts
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {formatDateTime(
                                                nextEvent
                                                    .event
                                                    .start_at,
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Ends
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {formatDateTime(
                                                nextEvent
                                                    .event
                                                    .end_at,
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {nextEvent.assignment
                                    .local_instructions && (
                                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                                Local Instructions
                                            </p>

                                            <p className="mt-1 text-sm leading-6 text-amber-900">
                                                {
                                                    nextEvent
                                                        .assignment
                                                        .local_instructions
                                                }
                                            </p>
                                        </div>
                                    )}

                                <Link
                                    href={
                                        nextEventRegistered
                                            ? "/dashboard/participant/attendance-pass"
                                            : "/dashboard/participant/events"
                                    }
                                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                    {nextEventRegistered
                                        ? "View Attendance Pass"
                                        : "View Available Event"}

                                    <ArrowRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </div>
                        ) : (
                            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                <p className="font-semibold text-slate-800">
                                    No upcoming event
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    There are currently
                                    no active or
                                    available events.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-950">
                                Recent Registrations
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Your latest registered
                                events.
                            </p>
                        </div>

                        {loading ? (
                            <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                                Loading registrations...
                            </div>
                        ) : recentRegistrations.length >
                            0 ? (
                            <div className="mt-5 space-y-3">
                                {recentRegistrations.map(
                                    (item) => (
                                        <div
                                            key={
                                                item.rsvp
                                                    ?.id ||
                                                item.assignment
                                                    .id
                                            }
                                            className="rounded-xl border border-slate-200 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-slate-900">
                                                        {
                                                            item
                                                                .event
                                                                .title
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Registered{" "}
                                                        {formatDateTime(
                                                            item
                                                                .rsvp
                                                                ?.registered_at ||
                                                            null,
                                                        )}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getEventStatusClasses(
                                                        item
                                                            .event
                                                            .status,
                                                    )}`}
                                                >
                                                    {getEventStatusLabel(
                                                        item
                                                            .event
                                                            .status,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ),
                                )}

                                <Link
                                    href="/dashboard/participant/registrations"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    View All Registrations

                                    <ArrowRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </div>
                        ) : (
                            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                                <p className="font-semibold text-slate-800">
                                    No registrations
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    Your registered
                                    events will appear
                                    here.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <section>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-950">
                            Quick Access
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Select a participant
                            service below.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {participantActions.map(
                            (item) => {
                                const Icon =
                                    item.icon;

                                return (
                                    <Link
                                        key={
                                            item.href
                                        }
                                        href={
                                            item.href
                                        }
                                        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                                    >
                                        <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white">
                                            <Icon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </div>

                                        <h3 className="mt-4 font-semibold text-slate-950">
                                            {
                                                item.title
                                            }
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            {
                                                item.description
                                            }
                                        </p>
                                    </Link>
                                );
                            },
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}