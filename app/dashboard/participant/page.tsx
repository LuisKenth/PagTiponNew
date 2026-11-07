"use client";

import {
    ArrowRight,
    CalendarDays,
    ClipboardCheck,
    History,
    MapPin,
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

import { useParticipantVerification } from "./components/ParticipantVerificationProvider";

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
    local_venue_id: string | null;
    local_instructions: string | null;
};

type VenueRow = {
    id: string;
    venue_name: string;
    municipality: string;
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
    venue: VenueRow | null;
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

type FetchMode =
    | "initial"
    | "refresh"
    | "silent";

const REGISTRATION_ALLOWED_STATUSES = [
    "published",
    "upcoming",
];

const ACTIVE_PASS_STATUSES = [
    "published",
    "upcoming",
    "ongoing",
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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not set";
    }

    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
    });
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

async function getAuthenticatedUser() {
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
        throw new Error(
            error?.message ||
            "Your login session is unavailable. Please log in again.",
        );
    }

    return session.user;
}

export default function ParticipantDashboardPage() {
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
        return () => window.clearInterval(timer);
    }, []);

    const [
        dashboardData,
        setDashboardData,
    ] =
        useState<ParticipantDashboardData>(
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
        useCallback(
            async (
                mode: FetchMode = "initial",
            ) => {
                if (mode === "initial") {
                    setLoading(true);
                }

                if (mode === "refresh") {
                    setRefreshing(true);
                }

                if (mode !== "silent") {
                    setErrorMessage("");
                }

                try {
                    const user =
                        await getAuthenticatedUser();

                    /*
                     * PARTICIPANT PROFILE
                     */
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

                    /*
                     * LOAD OPEN ASSIGNMENTS,
                     * REGISTERED RSVPS,
                     * AND ATTENDANCE.
                     */
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
                                    local_venue_id,
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
                                    ascending:
                                        false,
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

                    if (
                        attendanceResult.error
                    ) {
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

                    /*
                     * LOAD ASSIGNMENTS USED BY
                     * REGISTERED RSVPS.
                     */
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
                                    local_venue_id,
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

                    /*
                     * REMOVE DUPLICATE ASSIGNMENTS.
                     */
                    const assignmentMap =
                        new Map<
                            string,
                            EventAssignmentRow
                        >();

                    [
                        ...openAssignments,
                        ...registeredAssignments,
                    ].forEach(
                        (assignment) => {
                            assignmentMap.set(
                                String(
                                    assignment.id,
                                ),
                                assignment,
                            );
                        },
                    );

                    const allAssignments =
                        Array.from(
                            assignmentMap.values(),
                        );

                    /*
                     * LOAD EVENTS.
                     */
                    const eventIds =
                        Array.from(
                            new Set(
                                allAssignments.map(
                                    (
                                        assignment,
                                    ) =>
                                        assignment.event_id,
                                ),
                            ),
                        );

                    let events: EventRow[] =
                        [];

                    if (
                        eventIds.length > 0
                    ) {
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
                            .in(
                                "id",
                                eventIds,
                            );

                        if (eventError) {
                            throw eventError;
                        }

                        events =
                            (eventRows ||
                                []) as EventRow[];
                    }

                    const eventMap =
                        new Map<
                            string,
                            EventRow
                        >();

                    events.forEach(
                        (event) => {
                            eventMap.set(
                                String(event.id),
                                event,
                            );
                        },
                    );

                    /*
                     * LOAD VENUES.
                     *
                     * Venue failure is non-fatal.
                     */
                    const venueIds =
                        Array.from(
                            new Set(
                                allAssignments
                                    .map(
                                        (
                                            assignment,
                                        ) =>
                                            assignment.local_venue_id,
                                    )
                                    .filter(
                                        (
                                            venueId,
                                        ): venueId is string =>
                                            Boolean(
                                                venueId,
                                            ),
                                    ),
                            ),
                        );

                    let venues: VenueRow[] =
                        [];

                    if (
                        venueIds.length > 0
                    ) {
                        const {
                            data: venueRows,
                            error: venueError,
                        } = await supabase
                            .from("venues")
                            .select(
                                `
                                    id,
                                    venue_name,
                                    municipality
                                `,
                            )
                            .in(
                                "id",
                                venueIds,
                            );

                        if (venueError) {
                            console.warn(
                                "Participant dashboard venue fetch error:",
                                venueError.message,
                            );
                        } else {
                            venues =
                                (venueRows ||
                                    []) as VenueRow[];
                        }
                    }

                    const venueMap =
                        new Map<
                            string,
                            VenueRow
                        >();

                    venues.forEach(
                        (venue) => {
                            venueMap.set(
                                String(venue.id),
                                venue,
                            );
                        },
                    );

                    /*
                     * RSVP LOOKUP.
                     */
                    const rsvpMap =
                        new Map<
                            string,
                            RSVPRow
                        >();

                    rsvps.forEach(
                        (rsvp) => {
                            rsvpMap.set(
                                String(
                                    rsvp.event_municipality_id,
                                ),
                                rsvp,
                            );
                        },
                    );

                    /*
                     * AVAILABLE EVENTS
                     *
                     * IMPORTANT:
                     * Registered events are excluded
                     * so this matches the Available
                     * Events page.
                     */
                    const availableEvents: DashboardEventItem[] =
                        [];

                    for (
                        const assignment of
                        openAssignments
                    ) {
                        const event =
                            eventMap.get(
                                String(
                                    assignment.event_id,
                                ),
                            );

                        if (!event) {
                            continue;
                        }

                        const eventStatus =
                            normalizeStatus(
                                event.status,
                            );

                        if (
                            !REGISTRATION_ALLOWED_STATUSES.includes(
                                eventStatus,
                            )
                        ) {
                            continue;
                        }

                        const existingRsvp =
                            rsvpMap.get(
                                String(
                                    assignment.id,
                                ),
                            );

                        /*
                         * Already registered events
                         * are NOT available anymore.
                         */
                        if (existingRsvp) {
                            continue;
                        }

                        const venue =
                            assignment.local_venue_id
                                ? venueMap.get(
                                    String(
                                        assignment.local_venue_id,
                                    ),
                                ) ??
                                null
                                : null;

                        availableEvents.push(
                            {
                                event,
                                assignment,
                                venue,
                                rsvp: null,
                                registered:
                                    false,
                            },
                        );
                    }

                    availableEvents.sort(
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

                    /*
                     * REGISTRATIONS.
                     */
                    const registrations: DashboardEventItem[] =
                        [];

                    for (
                        const rsvp of rsvps
                    ) {
                        const assignment =
                            assignmentMap.get(
                                String(
                                    rsvp.event_municipality_id,
                                ),
                            );

                        if (!assignment) {
                            continue;
                        }

                        const event =
                            eventMap.get(
                                String(
                                    assignment.event_id,
                                ),
                            );

                        if (!event) {
                            continue;
                        }

                        const venue =
                            assignment.local_venue_id
                                ? venueMap.get(
                                    String(
                                        assignment.local_venue_id,
                                    ),
                                ) ??
                                null
                                : null;

                        registrations.push(
                            {
                                event,
                                assignment,
                                venue,
                                rsvp,
                                registered:
                                    true,
                            },
                        );
                    }

                    registrations.sort(
                        (
                            first,
                            second,
                        ) =>
                            getTimeValue(
                                second.rsvp
                                    ?.registered_at ??
                                null,
                                0,
                            ) -
                            getTimeValue(
                                first.rsvp
                                    ?.registered_at ??
                                null,
                                0,
                            ),
                    );

                    /*
                     * NEXT EVENT.
                     *
                     * Priority:
                     * 1. registered active event
                     * 2. available event
                     */
                    const currentTime =
                        Date.now();

                    const activeRegisteredEvents =
                        registrations
                            .filter(
                                (
                                    item,
                                ) => {
                                    const eventStatus =
                                        normalizeStatus(
                                            item
                                                .event
                                                .status,
                                        );

                                    const eventEndTime =
                                        getTimeValue(
                                            item
                                                .event
                                                .end_at,
                                        );

                                    return (
                                        ACTIVE_PASS_STATUSES.includes(
                                            eventStatus,
                                        ) &&
                                        eventEndTime >=
                                        currentTime
                                    );
                                },
                            )
                            .sort(
                                (
                                    first,
                                    second,
                                ) =>
                                    getTimeValue(
                                        first
                                            .event
                                            .start_at,
                                    ) -
                                    getTimeValue(
                                        second
                                            .event
                                            .start_at,
                                    ),
                            );

                    const availableFutureEvents =
                        availableEvents.filter(
                            (item) =>
                                getTimeValue(
                                    item.event
                                        .end_at,
                                ) >=
                                currentTime,
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

                    /*
                     * Silent refresh failures should
                     * not erase working dashboard data.
                     */
                    if (
                        mode !== "silent"
                    ) {
                        setDashboardData(
                            initialDashboardData,
                        );

                        setErrorMessage(
                            error instanceof
                                Error
                                ? error.message
                                : "Unable to load the participant dashboard.",
                        );
                    }
                } finally {
                    if (
                        mode === "initial"
                    ) {
                        setLoading(false);
                    }

                    if (
                        mode === "refresh"
                    ) {
                        setRefreshing(
                            false,
                        );
                    }
                }
            },
            [],
        );

    /*
     * Initial fetch and silent refresh.
     */
    useEffect(() => {
        void fetchDashboardData(
            "initial",
        );

        const refreshSilently =
            () => {
                void fetchDashboardData(
                    "silent",
                );
            };

        const handleVisibilityChange =
            () => {
                if (
                    document.visibilityState ===
                    "visible"
                ) {
                    refreshSilently();
                }
            };

        const intervalId =
            window.setInterval(
                () => {
                    if (
                        document.visibilityState ===
                        "visible"
                    ) {
                        refreshSilently();
                    }
                },
                30000,
            );

        window.addEventListener(
            "focus",
            refreshSilently,
        );

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );

        return () => {
            window.clearInterval(
                intervalId,
            );

            window.removeEventListener(
                "focus",
                refreshSilently,
            );

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, [fetchDashboardData]);

    /*
     * DASHBOARD COUNTS.
     */
    const dashboardCounts =
        useMemo(() => {


            const activePasses =
                dashboardData.registrations.filter(
                    (item) => {
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
                    },
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
                    dashboardData
                        .availableEvents
                        .length,

                registrations:
                    dashboardData
                        .registrations
                        .length,

                activePasses,

                presentAttendance,

                attendanceTotal:
                    dashboardData
                        .attendanceRecords
                        .length,
            };
        }, [dashboardData, currentTime]);


    const { status: verificationStatus } = useParticipantVerification();
    const nextEvent = dashboardData.registrations
        .filter((item) => ACTIVE_PASS_STATUSES.includes(normalizeStatus(item.event.status))
            && getTimeValue(item.event.end_at) >= currentTime
            && normalizeStatus(item.assignment.municipal_status) !== "cancelled")
        .sort((a, b) => getTimeValue(a.event.start_at) - getTimeValue(b.event.start_at))[0];
    const verified = verificationStatus === "verified";
    const button = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition";
    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <header className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-slate-300">{dashboardData.municipality || "PagTipon Participant Portal"}</p>
                            <h1 className="mt-2 text-3xl font-bold">Home</h1>
                            <p className="mt-3 text-sm leading-6 text-slate-300">Find an event, register, and show your attendance pass at the venue.</p>
                        </div>
                        <button type="button" disabled={loading || refreshing} onClick={() => void fetchDashboardData("refresh")} className={button + " border border-slate-600 hover:bg-slate-800 disabled:opacity-50"}>
                            <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> {refreshing ? "Refreshing…" : "Refresh"}
                        </button>
                    </div>
                </header>
                {errorMessage && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorMessage}</div>}
                {verificationStatus === "unverified" && (
                    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <div><h2 className="font-semibold text-amber-950">Complete account verification</h2><p className="mt-1 text-sm text-amber-900">Submit your residency and category documents. Both need approval before you can register.</p></div>
                        <Link href="/dashboard/participant/account?tab=verification" className={button + " bg-amber-900 text-white"}>View Verification <ArrowRight className="h-4 w-4" /></Link>
                    </section>
                )}
                {loading ? <p role="status" className="py-12 text-center text-slate-600">Loading your events…</p> : (
                    <>
                        <div className="mobile-summary-grid grid gap-4 sm:grid-cols-3">
                            {[{label: "Find Events", value: dashboardCounts.available, detail: "Open for registration", href: "events", icon: CalendarDays},
                              {label: "My Events", value: dashboardCounts.activePasses, detail: "Upcoming and ongoing", href: "my-events", icon: ClipboardCheck},
                              {label: "Attendance History", value: dashboardCounts.attendanceTotal, detail: "Review your records", href: "my-events?tab=history", icon: History}].map(({label, value, detail, href, icon: Icon}) => (
                                <Link key={href} href={"/dashboard/participant/" + (href !== "events" && !verified ? "account?tab=verification" : href)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-300">
                                    <div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-slate-800">{label}</h2><Icon className="h-5 w-5 text-violet-600" /></div>
                                    <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p><p className="mt-2 text-sm text-slate-500">{detail}</p>
                                </Link>
                            ))}
                        </div>
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                            <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-50 p-3 text-violet-700"><TicketCheck className="h-6 w-6" /></span><h2 className="text-xl font-bold text-slate-950">My Next Event</h2></div>
                            {nextEvent ? <div className="mt-6">
                                <span className={"rounded-full px-3 py-1 text-xs font-semibold " + getEventStatusClasses(nextEvent.event.status)}>{getEventStatusLabel(nextEvent.event.status)}</span>
                                <h3 className="mt-4 break-words text-2xl font-bold text-slate-950">{nextEvent.event.title}</h3>
                                <div className="mt-5 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
                                    <p className="flex items-start gap-2"><CalendarDays className="h-5 w-5 shrink-0 text-slate-400" />{formatDateTime(nextEvent.event.start_at)}</p>
                                    <p className="flex items-start gap-2"><MapPin className="h-5 w-5 shrink-0 text-slate-400" />{nextEvent.venue?.venue_name || "Venue to be announced"}</p>
                                </div>
                                {nextEvent.assignment.local_instructions && <p className="mt-5 line-clamp-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{nextEvent.assignment.local_instructions}</p>}
                                <div className="mt-6 flex flex-wrap gap-3">
                                    {verified && <Link href={"/dashboard/participant/my-events?tab=pass&assignment=" + encodeURIComponent(nextEvent.assignment.id)} className={button + " bg-violet-600 text-white hover:bg-violet-700"}><QrCode className="h-5 w-5" />View QR Code</Link>}
                                    <Link href="/dashboard/participant/my-events" className={button + " border border-slate-200 text-slate-700 hover:bg-slate-50"}>My Events</Link>
                                </div>
                                <p className="mt-4 text-sm text-slate-500">Show your QR code or manual code to Event Staff for time in and time out.</p>
                            </div> : <div className="mt-6 rounded-xl bg-slate-50 p-6">
                                <h3 className="font-semibold text-slate-900">Your next event starts here</h3>
                                <p className="mt-2 text-sm text-slate-600">Browse events in your municipality and register for one you want to attend.</p>
                                <Link href="/dashboard/participant/events" className={button + " mt-5 bg-violet-600 text-white hover:bg-violet-700"}>Find Events <ArrowRight className="h-4 w-4" /></Link>
                            </div>}
                        </section>

                    </>
                )}
            </div>
        </main>
    );
}
