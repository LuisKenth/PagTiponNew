"use client";

import {
    CalendarCheck2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    History,
    RefreshCw,
    TicketCheck,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

type RSVPRow = {
    id: string;
    event_municipality_id: string;
    user_id: string;
    municipality: string;
    status: string | null;
    registered_at: string | null;
};

type EventAssignmentRow = {
    id: string;
    event_id: string;
    municipality: string;
    municipal_status: string | null;
    registration_open: boolean | null;
    local_instructions: string | null;
};

type EventRow = {
    id: string;
    title: string;
    description: string | null;
    start_at: string | null;
    end_at: string | null;
    status: string | null;
    created_at: string;
};

type RegistrationItem = {
    rsvp: RSVPRow;
    assignment: EventAssignmentRow;
    event: EventRow;
};

type RegistrationFilter =
    | "all"
    | "active"
    | "completed"
    | "cancelled";

function normalizeStatus(
    value: string | null | undefined,
) {
    return value?.trim().toLowerCase() ?? "";
}

function formatDateTime(
    dateValue: string | null,
) {
    if (!dateValue) {
        return "Not set";
    }

    return new Date(
        dateValue,
    ).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function isActiveEventStatus(
    status: string | null,
) {
    const normalizedStatus =
        normalizeStatus(status);

    return [
        "published",
        "upcoming",
        "ongoing",
    ].includes(normalizedStatus);
}

function isCancelledRegistration(
    item: RegistrationItem,
) {
    return (
        normalizeStatus(
            item.rsvp.status,
        ) === "cancelled" ||
        normalizeStatus(
            item.event.status,
        ) === "cancelled"
    );
}

function isActiveRegistration(
    item: RegistrationItem,
) {
    return (
        normalizeStatus(
            item.rsvp.status,
        ) === "registered" &&
        isActiveEventStatus(
            item.event.status,
        )
    );
}

function isCompletedRegistration(
    item: RegistrationItem,
) {
    return (
        !isCancelledRegistration(item) &&
        normalizeStatus(
            item.event.status,
        ) === "completed"
    );
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

export default function ParticipantRegistrationsPage() {
    const [
        registrations,
        setRegistrations,
    ] = useState<RegistrationItem[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const [activeFilter, setActiveFilter] =
        useState<RegistrationFilter>("all");

    const fetchRegistrations =
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
                    data: rsvpRows,
                    error: rsvpError,
                } = await supabase
                    .from("rsvps")
                    .select(
                        `
                            id,
                            event_municipality_id,
                            user_id,
                            municipality,
                            status,
                            registered_at
                        `,
                    )
                    .eq("user_id", user.id)
                    .in("status", [
                        "registered",
                        "cancelled",
                    ])
                    .order("registered_at", {
                        ascending: false,
                    });

                if (rsvpError) {
                    throw rsvpError;
                }

                const registeredRsvps =
                    (rsvpRows || []) as RSVPRow[];

                if (
                    registeredRsvps.length === 0
                ) {
                    setRegistrations([]);
                    return;
                }

                const assignmentIds =
                    registeredRsvps.map(
                        (rsvp) =>
                            rsvp.event_municipality_id,
                    );

                const {
                    data: assignmentRows,
                    error: assignmentError,
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
                    .in("id", assignmentIds);

                if (assignmentError) {
                    throw assignmentError;
                }

                const assignments =
                    (assignmentRows ||
                        []) as EventAssignmentRow[];

                if (assignments.length === 0) {
                    setRegistrations([]);
                    return;
                }

                const eventIds = Array.from(
                    new Set(
                        assignments.map(
                            (assignment) =>
                                assignment.event_id,
                        ),
                    ),
                );

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
                            status,
                            created_at
                        `,
                    )
                    .in("id", eventIds);

                if (eventError) {
                    throw eventError;
                }

                const events =
                    (eventRows ||
                        []) as EventRow[];

                const mappedRegistrations =
                    registeredRsvps
                        .map((rsvp) => {
                            const assignment =
                                assignments.find(
                                    (item) =>
                                        String(
                                            item.id,
                                        ) ===
                                        String(
                                            rsvp.event_municipality_id,
                                        ),
                                );

                            if (!assignment) {
                                return null;
                            }

                            const event =
                                events.find(
                                    (item) =>
                                        String(
                                            item.id,
                                        ) ===
                                        String(
                                            assignment.event_id,
                                        ),
                                );

                            if (!event) {
                                return null;
                            }

                            return {
                                rsvp,
                                assignment,
                                event,
                            };
                        })
                        .filter(
                            (
                                item,
                            ): item is RegistrationItem =>
                                item !== null,
                        )
                        .sort(
                            (
                                first,
                                second,
                            ) => {
                                const firstActive =
                                    isActiveEventStatus(
                                        first.event
                                            .status,
                                    );

                                const secondActive =
                                    isActiveEventStatus(
                                        second.event
                                            .status,
                                    );

                                if (
                                    firstActive &&
                                    !secondActive
                                ) {
                                    return -1;
                                }

                                if (
                                    !firstActive &&
                                    secondActive
                                ) {
                                    return 1;
                                }

                                const firstDate =
                                    first.event
                                        .start_at
                                        ? new Date(
                                            first.event.start_at,
                                        ).getTime()
                                        : 0;

                                const secondDate =
                                    second.event
                                        .start_at
                                        ? new Date(
                                            second.event.start_at,
                                        ).getTime()
                                        : 0;

                                if (
                                    firstActive &&
                                    secondActive
                                ) {
                                    return (
                                        firstDate -
                                        secondDate
                                    );
                                }

                                return (
                                    secondDate -
                                    firstDate
                                );
                            },
                        );

                setRegistrations(
                    mappedRegistrations,
                );
            } catch (error) {
                console.error(
                    "Participant registrations fetch error:",
                    error,
                );

                setRegistrations([]);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to load your registrations.",
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        }, []);

    useEffect(() => {
        void fetchRegistrations();
    }, [fetchRegistrations]);

    const registrationCounts =
        useMemo(() => {
            return {
                total: registrations.length,

                active:
                    registrations.filter(
                        isActiveRegistration,
                    ).length,

                completed:
                    registrations.filter(
                        isCompletedRegistration,
                    ).length,

                cancelled:
                    registrations.filter(
                        isCancelledRegistration,
                    ).length,
            };
        }, [registrations]);

    const filteredRegistrations =
        useMemo(() => {
            if (
                activeFilter === "active"
            ) {
                return registrations.filter(
                    isActiveRegistration,
                );
            }

            if (
                activeFilter ===
                "completed"
            ) {
                return registrations.filter(
                    isCompletedRegistration,
                );
            }

            if (
                activeFilter ===
                "cancelled"
            ) {
                return registrations.filter(
                    isCancelledRegistration,
                );
            }

            return registrations;
        }, [
            activeFilter,
            registrations,
        ]);

    const filters: {
        value: RegistrationFilter;
        label: string;
        count: number;
    }[] = [
            {
                value: "all",
                label: "All",
                count:
                    registrationCounts.total,
            },
            {
                value: "active",
                label: "Active",
                count:
                    registrationCounts.active,
            },
            {
                value: "completed",
                label: "Completed",
                count:
                    registrationCounts.completed,
            },
            {
                value: "cancelled",
                label: "Cancelled",
                count:
                    registrationCounts.cancelled,
            },
        ];

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Participant Events
                            </p>

                            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                                My Registrations
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Review your active,
                                completed, and
                                cancelled event
                                registrations.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void fetchRegistrations(
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

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    Total
                                    Registrations
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {
                                        registrationCounts.total
                                    }
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <TicketCheck
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    Active Events
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {
                                        registrationCounts.active
                                    }
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <CalendarDays
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    Completed
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {
                                        registrationCounts.completed
                                    }
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                <CheckCircle2
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    Cancelled
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {
                                        registrationCounts.cancelled
                                    }
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
                                <XCircle
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-950">
                                Registered Events
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                View your registration
                                details and available
                                actions.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {filters.map(
                                (filter) => {
                                    const selected =
                                        activeFilter ===
                                        filter.value;

                                    return (
                                        <button
                                            key={
                                                filter.value
                                            }
                                            type="button"
                                            onClick={() =>
                                                setActiveFilter(
                                                    filter.value,
                                                )
                                            }
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selected
                                                ? "bg-slate-950 text-white"
                                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                                                }`}
                                        >
                                            {
                                                filter.label
                                            }{" "}
                                            <span
                                                className={
                                                    selected
                                                        ? "text-slate-300"
                                                        : "text-slate-400"
                                                }
                                            >
                                                {
                                                    filter.count
                                                }
                                            </span>
                                        </button>
                                    );
                                },
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div
                            aria-live="polite"
                            className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center"
                        >
                            <div className="mx-auto size-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                            <p className="mt-4 text-sm font-medium text-slate-600">
                                Loading your
                                registrations...
                            </p>
                        </div>
                    ) : errorMessage ? (
                        <div
                            role="alert"
                            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center"
                        >
                            <p className="font-semibold text-red-800">
                                Unable to load
                                registrations
                            </p>

                            <p className="mt-1 text-sm text-red-600">
                                {errorMessage}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    void fetchRegistrations()
                                }
                                className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : registrations.length ===
                        0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                                <CalendarCheck2
                                    className="size-7"
                                    aria-hidden="true"
                                />
                            </div>

                            <h3 className="mt-4 text-lg font-semibold text-slate-950">
                                No registrations yet
                            </h3>

                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                Register for an
                                available event to
                                see it on this page.
                            </p>

                            <Link
                                href="/dashboard/participant/events"
                                className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Browse Available
                                Events
                            </Link>
                        </div>
                    ) : filteredRegistrations.length ===
                        0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                            <p className="font-semibold text-slate-800">
                                No matching
                                registrations
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                There are no
                                registrations under
                                the selected filter.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-5 xl:grid-cols-2">
                            {filteredRegistrations.map(
                                (item) => {
                                    const eventStatus =
                                        normalizeStatus(
                                            item.event
                                                .status,
                                        );

                                    const active =
                                        isActiveRegistration(item);

                                    const cancelled =
                                        isCancelledRegistration(item);

                                    const completed =
                                        isCompletedRegistration(item);

                                    const rsvpCancelled =
                                        normalizeStatus(
                                            item.rsvp.status,
                                        ) === "cancelled";

                                    return (
                                        <article
                                            key={
                                                item
                                                    .rsvp
                                                    .id
                                            }
                                            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-semibold text-slate-950">
                                                        {
                                                            item
                                                                .event
                                                                .title
                                                        }
                                                    </h3>

                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {
                                                            item
                                                                .assignment
                                                                .municipality
                                                        }
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${rsvpCancelled
                                                                ? "bg-red-100 text-red-700"
                                                                : "bg-violet-100 text-violet-700"
                                                            }`}
                                                    >
                                                        {rsvpCancelled
                                                            ? "Registration Cancelled"
                                                            : "Registered"}
                                                    </span>

                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventStatusClasses(
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

                                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                                {item
                                                    .event
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
                                                            item
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
                                                            item
                                                                .event
                                                                .end_at,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {item
                                                .assignment
                                                .local_instructions && (
                                                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                                            Local
                                                            Instructions
                                                        </p>

                                                        <p className="mt-1 text-sm leading-6 text-amber-900">
                                                            {
                                                                item
                                                                    .assignment
                                                                    .local_instructions
                                                            }
                                                        </p>
                                                    </div>
                                                )}

                                            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                                                <Clock3
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />

                                                Registered on{" "}
                                                {formatDateTime(
                                                    item
                                                        .rsvp
                                                        .registered_at,
                                                )}
                                            </div>

                                            <div className="mt-auto pt-5">
                                                {active && (
                                                    <Link
                                                        href="/dashboard/participant/attendance-pass"
                                                        className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                                                    >
                                                        View
                                                        Attendance
                                                        Pass
                                                    </Link>
                                                )}

                                                {completed && (
                                                    <Link
                                                        href="/dashboard/participant/attendance-history"
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                                    >
                                                        <History
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />

                                                        View
                                                        Attendance
                                                        Result
                                                    </Link>
                                                )}

                                                {cancelled && (
                                                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                                                        <p className="text-sm font-semibold text-red-800">
                                                            Event
                                                            Cancelled
                                                        </p>

                                                        <p className="mt-1 text-xs leading-5 text-red-600">
                                                            This
                                                            registration
                                                            is kept
                                                            for your
                                                            records,
                                                            but the
                                                            event is
                                                            no longer
                                                            active.
                                                        </p>
                                                    </div>
                                                )}

                                                {!active &&
                                                    !completed &&
                                                    !cancelled && (
                                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                                            No
                                                            participant
                                                            action is
                                                            currently
                                                            available
                                                            for this
                                                            registration.
                                                        </div>
                                                    )}
                                            </div>
                                        </article>
                                    );
                                },
                            )}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}