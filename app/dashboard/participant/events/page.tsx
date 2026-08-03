"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

type EventRow = {
    id: string;
    title: string;
    description: string | null;
    start_at: string | null;
    end_at: string | null;
    memo_url: string | null;
    memo_filename: string | null;
    status: string | null;
    created_at: string;
};

type OpenEvent = {
    id: string;
    event_id: string;
    municipality: string;
    municipal_status: string | null;
    registration_open: boolean | null;
    local_instructions: string | null;
    created_at: string;
    event: EventRow | null;
};

type RSVP = {
    id: string;
    event_municipality_id: string;
    user_id: string;
    municipality: string;
    status: string | null;
    registered_at: string | null;
};

type EventAssignmentCheck = {
    id: string;
    event_id: string;
    municipality: string;
    municipal_status: string | null;
    registration_open: boolean | null;
};

type EventStatusCheck = {
    id: string;
    title: string;
    status: string | null;
};

const REGISTRATION_ALLOWED_EVENT_STATUSES = [
    "published",
    "upcoming",
];

function normalizeStatus(
    value: string | null | undefined,
) {
    return value?.trim().toLowerCase() ?? "";
}

function getErrorMessage(error: unknown) {
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message;
    }

    return "An unexpected registration error occurred.";
}

function getFriendlyRegistrationError(
    message: string,
) {
    const normalizedMessage =
        message.toLowerCase();

    if (
        normalizedMessage.includes(
            "event has been cancelled",
        ) ||
        normalizedMessage.includes("cancelled")
    ) {
        return "Registration is no longer allowed because this event has been cancelled.";
    }

    if (
        normalizedMessage.includes(
            "duplicate key",
        ) ||
        normalizedMessage.includes(
            "unique constraint",
        ) ||
        normalizedMessage.includes(
            "already exists",
        )
    ) {
        return "You are already registered for this event.";
    }

    if (
        normalizedMessage.includes(
            "registration_open",
        ) ||
        normalizedMessage.includes(
            "registration is closed",
        )
    ) {
        return "Registration for this event is already closed.";
    }

    if (
        normalizedMessage.includes(
            "row-level security",
        )
    ) {
        return "Registration was rejected. Please refresh the page and check whether the event is still available.";
    }

    return message;
}

export default function ParticipantEventsPage() {
    const [userId, setUserId] =
        useState("");

    const [municipality, setMunicipality] =
        useState("");

    const [openEvents, setOpenEvents] =
        useState<OpenEvent[]>([]);

    const [rsvps, setRsvps] =
        useState<RSVP[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [
        registeringId,
        setRegisteringId,
    ] = useState<string | null>(null);

    const fetchOpenEvents =
        useCallback(async () => {
            setLoading(true);

            try {
                const {
                    data: { user },
                    error: userError,
                } =
                    await supabase.auth.getUser();

                if (userError || !user) {
                    console.error(
                        userError?.message ||
                            "Participant user not found.",
                    );

                    setUserId("");
                    setMunicipality("");
                    setOpenEvents([]);
                    setRsvps([]);

                    return;
                }

                setUserId(user.id);

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
                    console.error(
                        profileError?.message ||
                            "Participant municipality not found.",
                    );

                    setMunicipality("");
                    setOpenEvents([]);
                    setRsvps([]);

                    return;
                }

                const participantMunicipality =
                    profile.municipality;

                setMunicipality(
                    participantMunicipality,
                );

                const {
                    data: localEvents,
                    error: localEventsError,
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
                            local_instructions,
                            created_at
                        `,
                    )
                    .eq(
                        "municipality",
                        participantMunicipality,
                    )
                    .eq(
                        "municipal_status",
                        "prepared",
                    )
                    .eq(
                        "registration_open",
                        true,
                    )
                    .order("created_at", {
                        ascending: false,
                    });

                if (localEventsError) {
                    console.error(
                        localEventsError.message,
                    );

                    setOpenEvents([]);

                    return;
                }

                const {
                    data: rsvpData,
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
                    .eq("user_id", user.id);

                if (rsvpError) {
                    console.error(
                        rsvpError.message,
                    );

                    setRsvps([]);
                } else {
                    setRsvps(rsvpData || []);
                }

                if (
                    !localEvents ||
                    localEvents.length === 0
                ) {
                    setOpenEvents([]);

                    return;
                }

                const eventIds =
                    localEvents.map(
                        (item) =>
                            item.event_id,
                    );

                const {
                    data: events,
                    error: eventsError,
                } = await supabase
                    .from("events")
                    .select(
                        `
                            id,
                            title,
                            description,
                            start_at,
                            end_at,
                            memo_url,
                            memo_filename,
                            status,
                            created_at
                        `,
                    )
                    .in("id", eventIds)
                    .in(
                        "status",
                        REGISTRATION_ALLOWED_EVENT_STATUSES,
                    );

                if (eventsError) {
                    console.error(
                        eventsError.message,
                    );

                    setOpenEvents([]);

                    return;
                }

                const mappedEvents: OpenEvent[] =
                    localEvents.map(
                        (item) => ({
                            ...item,
                            event:
                                events?.find(
                                    (
                                        event,
                                    ) =>
                                        String(
                                            event.id,
                                        ) ===
                                        String(
                                            item.event_id,
                                        ),
                                ) || null,
                        }),
                    );

                setOpenEvents(
                    mappedEvents.filter(
                        (item) =>
                            item.event !==
                                null &&
                            normalizeStatus(
                                item.event
                                    .status,
                            ) !==
                                "cancelled",
                    ),
                );
            } catch (error) {
                console.error(
                    "Participant events fetch error:",
                    error,
                );

                setOpenEvents([]);
            } finally {
                setLoading(false);
            }
        }, []);

    useEffect(() => {
        void fetchOpenEvents();
    }, [fetchOpenEvents]);

    const isRegistered = (
        eventMunicipalityId: string,
    ) => {
        return rsvps.some(
            (rsvp) =>
                String(
                    rsvp.event_municipality_id,
                ) ===
                    String(
                        eventMunicipalityId,
                    ) &&
                normalizeStatus(
                    rsvp.status,
                ) === "registered",
        );
    };

    const handleRegister = async (
        item: OpenEvent,
    ) => {
        if (!userId) {
            alert(
                "User not found. Please log in again.",
            );

            return;
        }

        if (!municipality) {
            alert(
                "Your municipality could not be verified. Please refresh the page.",
            );

            return;
        }

        if (isRegistered(item.id)) {
            alert(
                "You are already registered for this event.",
            );

            return;
        }

        setRegisteringId(item.id);

        try {
            /*
             * Verify the authenticated user again.
             * Do not rely only on the user ID stored
             * in the browser state.
             */
            const {
                data: { user },
                error: userError,
            } =
                await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "Your login session has expired. Please log in again.",
                );
            }

            if (user.id !== userId) {
                throw new Error(
                    "Your account session changed. Please refresh the page before registering.",
                );
            }

            /*
             * Freshly check the municipality-event
             * assignment immediately before registration.
             */
            const {
                data: currentAssignment,
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
                        registration_open
                    `,
                )
                .eq("id", item.id)
                .maybeSingle<EventAssignmentCheck>();

            if (assignmentError) {
                throw assignmentError;
            }

            if (!currentAssignment) {
                throw new Error(
                    "This event assignment is no longer available.",
                );
            }

            if (
                currentAssignment.municipality !==
                municipality
            ) {
                throw new Error(
                    "You cannot register for an event assigned to another municipality.",
                );
            }

            if (
                currentAssignment.registration_open !==
                true
            ) {
                throw new Error(
                    "Registration for this event is closed.",
                );
            }

            if (
                normalizeStatus(
                    currentAssignment.municipal_status,
                ) !== "prepared"
            ) {
                throw new Error(
                    "This event is not yet prepared for participant registration.",
                );
            }

            /*
             * Fetch the actual event status again.
             * This catches cancellations made after
             * the participant page was initially loaded.
             */
            const {
                data: currentEvent,
                error: eventError,
            } = await supabase
                .from("events")
                .select(
                    "id, title, status",
                )
                .eq(
                    "id",
                    currentAssignment.event_id,
                )
                .maybeSingle<EventStatusCheck>();

            if (eventError) {
                throw eventError;
            }

            if (!currentEvent) {
                throw new Error(
                    "This event no longer exists.",
                );
            }

            const currentEventStatus =
                normalizeStatus(
                    currentEvent.status,
                );

            if (
                currentEventStatus ===
                "cancelled"
            ) {
                throw new Error(
                    "Registration is not allowed because this event has been cancelled.",
                );
            }

            if (
                !REGISTRATION_ALLOWED_EVENT_STATUSES.includes(
                    currentEventStatus,
                )
            ) {
                throw new Error(
                    "Registration is no longer available for this event.",
                );
            }

            /*
             * Fresh duplicate check from the database.
             * Do not rely only on the rsvps state
             * that was loaded with the page.
             */
            const {
                data: existingRsvp,
                error:
                    existingRsvpError,
            } = await supabase
                .from("rsvps")
                .select("id, status")
                .eq(
                    "event_municipality_id",
                    currentAssignment.id,
                )
                .eq(
                    "user_id",
                    user.id,
                )
                .eq(
                    "status",
                    "registered",
                )
                .limit(1)
                .maybeSingle();

            if (existingRsvpError) {
                throw existingRsvpError;
            }

            if (existingRsvp) {
                await fetchOpenEvents();

                throw new Error(
                    "You are already registered for this event.",
                );
            }

            const confirmRegister =
                window.confirm(
                    `Are you sure you want to register for ${
                        currentEvent.title ||
                        "this event"
                    }?`,
                );

            if (!confirmRegister) {
                return;
            }

            const qrToken = [
                user.id,
                currentAssignment.id,
                crypto.randomUUID(),
            ].join("-");

            const { error: insertError } =
                await supabase
                    .from("rsvps")
                    .insert({
                        event_municipality_id:
                            currentAssignment.id,
                        user_id: user.id,
                        municipality:
                            currentAssignment.municipality,
                        qr_token:
                            qrToken,
                        status:
                            "registered",
                    });

            if (insertError) {
                /*
                 * The database trigger catches the
                 * cancellation if it happens after
                 * the checks above but before INSERT.
                 */
                throw insertError;
            }

            alert(
                "Registration successful.",
            );

            await fetchOpenEvents();
        } catch (error) {
            const message =
                getErrorMessage(error);

            const friendlyMessage =
                getFriendlyRegistrationError(
                    message,
                );

            const expectedValidationError =
                friendlyMessage
                    .toLowerCase()
                    .includes(
                        "cancelled",
                    ) ||
                friendlyMessage
                    .toLowerCase()
                    .includes("closed") ||
                friendlyMessage
                    .toLowerCase()
                    .includes(
                        "already registered",
                    ) ||
                friendlyMessage
                    .toLowerCase()
                    .includes(
                        "not yet prepared",
                    ) ||
                friendlyMessage
                    .toLowerCase()
                    .includes(
                        "no longer available",
                    );

            if (
                expectedValidationError
            ) {
                console.warn(
                    "Registration blocked:",
                    friendlyMessage,
                );
            } else {
                console.error(
                    "Participant registration error:",
                    error,
                );
            }

            alert(friendlyMessage);

            if (
                friendlyMessage
                    .toLowerCase()
                    .includes(
                        "cancelled",
                    ) ||
                friendlyMessage
                    .toLowerCase()
                    .includes("closed") ||
                friendlyMessage
                    .toLowerCase()
                    .includes("no longer")
            ) {
                await fetchOpenEvents();
            }
        } finally {
            setRegisteringId(null);
        }
    };

    const formatDateTime = (
        dateValue: string | null,
    ) => {
        if (!dateValue) {
            return "Not set";
        }

        return new Date(
            dateValue,
        ).toLocaleString("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Participant Events
                    </p>

                    <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                        Available Events
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Browse events currently
                        open for registration in{" "}
                        <span className="font-semibold text-slate-900">
                            {municipality ||
                                "your municipality"}
                        </span>
                        .
                    </p>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-950">
                            Open for Registration
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Select an event below
                            to register and receive
                            your attendance pass.
                        </p>
                    </div>

                    {loading ? (
                        <div
                            aria-live="polite"
                            className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center"
                        >
                            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                            <p className="mt-3 text-sm font-medium text-slate-600">
                                Loading available
                                events...
                            </p>
                        </div>
                    ) : openEvents.length ===
                      0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                            <p className="font-semibold text-slate-800">
                                No available events
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                There are no events
                                open for registration
                                in your municipality
                                yet.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 grid gap-5 lg:grid-cols-2">
                            {openEvents.map(
                                (item) => {
                                    const registered =
                                        isRegistered(
                                            item.id,
                                        );

                                    const eventStatus =
                                        normalizeStatus(
                                            item
                                                .event
                                                ?.status,
                                        );

                                    const cancelled =
                                        eventStatus ===
                                        "cancelled";

                                    const registrationClosed =
                                        item.registration_open !==
                                        true;

                                    const eventNotReady =
                                        normalizeStatus(
                                            item.municipal_status,
                                        ) !==
                                        "prepared";

                                    const buttonDisabled =
                                        cancelled ||
                                        registrationClosed ||
                                        eventNotReady ||
                                        registeringId ===
                                            item.id;

                                    let buttonLabel =
                                        "Register for Event";

                                    if (
                                        registeringId ===
                                        item.id
                                    ) {
                                        buttonLabel =
                                            "Checking registration...";
                                    } else if (
                                        cancelled
                                    ) {
                                        buttonLabel =
                                            "Event Cancelled";
                                    } else if (
                                        registrationClosed
                                    ) {
                                        buttonLabel =
                                            "Registration Closed";
                                    } else if (
                                        eventNotReady
                                    ) {
                                        buttonLabel =
                                            "Event Not Ready";
                                    }

                                    return (
                                        <article
                                            key={
                                                item.id
                                            }
                                            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-semibold text-slate-950">
                                                        {item
                                                            .event
                                                            ?.title ||
                                                            "Untitled Event"}
                                                    </h3>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {!cancelled &&
                                                        !registrationClosed &&
                                                        !eventNotReady && (
                                                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                                                Open
                                                                Registration
                                                            </span>
                                                        )}

                                                    {cancelled && (
                                                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                                            Cancelled
                                                        </span>
                                                    )}

                                                    {registered && (
                                                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                                            Registered
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                                {item
                                                    .event
                                                    ?.description ||
                                                    "No description provided."}
                                            </p>

                                            <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                        Starts
                                                    </p>

                                                    <p className="mt-1 font-medium text-slate-700">
                                                        {formatDateTime(
                                                            item
                                                                .event
                                                                ?.start_at ||
                                                                null,
                                                        )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                        Ends
                                                    </p>

                                                    <p className="mt-1 font-medium text-slate-700">
                                                        {formatDateTime(
                                                            item
                                                                .event
                                                                ?.end_at ||
                                                                null,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {item.local_instructions && (
                                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                                        Local
                                                        Instructions
                                                    </p>

                                                    <p className="mt-1 text-sm leading-6 text-amber-900">
                                                        {
                                                            item.local_instructions
                                                        }
                                                    </p>
                                                </div>
                                            )}

                                            <div className="mt-auto pt-5">
                                                {registered ? (
                                                    <div className="space-y-3">
                                                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                                            <p className="text-sm font-semibold text-blue-900">
                                                                Registration
                                                                Confirmed
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-blue-700">
                                                                You
                                                                are
                                                                already
                                                                registered
                                                                for
                                                                this
                                                                event.
                                                                Open
                                                                your
                                                                attendance
                                                                pass
                                                                to
                                                                view
                                                                your
                                                                QR
                                                                code
                                                                and
                                                                manual
                                                                attendance
                                                                code.
                                                            </p>
                                                        </div>

                                                        <Link
                                                            href="/dashboard/participant/attendance-pass"
                                                            className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                                                        >
                                                            View
                                                            Attendance
                                                            Pass
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void handleRegister(
                                                                item,
                                                            )
                                                        }
                                                        disabled={
                                                            buttonDisabled
                                                        }
                                                        className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {
                                                            buttonLabel
                                                        }
                                                    </button>
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