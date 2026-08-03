"use client";

import {
    CalendarDays,
    ClipboardCopy,
    QrCode,
    RefreshCw,
} from "lucide-react";
import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

import QRCodeBox from "../components/QRCodeBox";

type RSVPRow = {
    id: string;
    event_municipality_id: string;
    user_id: string;
    municipality: string;
    qr_token: string | null;
    attendance_code: string | null;
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
};

type AttendancePass = {
    rsvp: RSVPRow;
    assignment: EventAssignmentRow;
    event: EventRow;
};

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

function getStatusLabel(
    status: string | null,
) {
    const normalizedStatus =
        normalizeStatus(status);

    if (normalizedStatus === "ongoing") {
        return "Ongoing";
    }

    if (normalizedStatus === "upcoming") {
        return "Upcoming";
    }

    if (normalizedStatus === "published") {
        return "Scheduled";
    }

    return status || "Event";
}

function getStatusClasses(
    status: string | null,
) {
    const normalizedStatus =
        normalizeStatus(status);

    if (normalizedStatus === "ongoing") {
        return "bg-green-100 text-green-700";
    }

    if (
        normalizedStatus === "upcoming" ||
        normalizedStatus === "published"
    ) {
        return "bg-blue-100 text-blue-700";
    }

    return "bg-slate-100 text-slate-700";
}

const ATTENDANCE_PASS_EVENT_STATUSES = [
    "published",
    "upcoming",
    "ongoing",
];

export default function ParticipantAttendancePassPage() {
    const [
        attendancePasses,
        setAttendancePasses,
    ] = useState<AttendancePass[]>([]);

    const [
        selectedRsvpId,
        setSelectedRsvpId,
    ] = useState("");

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const fetchAttendancePasses =
        useCallback(async (
            refreshOnly = false,
        ) => {
            if (refreshOnly) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

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

                    setAttendancePasses([]);
                    setSelectedRsvpId("");

                    return;
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
                            qr_token,
                            attendance_code,
                            status,
                            registered_at
                        `,
                    )
                    .eq("user_id", user.id)
                    .eq("status", "registered")
                    .order("registered_at", {
                        ascending: false,
                    });

                if (rsvpError) {
                    throw rsvpError;
                }

                const registrations =
                    (rsvpRows || []) as RSVPRow[];

                if (registrations.length === 0) {
                    setAttendancePasses([]);
                    setSelectedRsvpId("");

                    return;
                }

                const assignmentIds =
                    registrations.map(
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
                    setAttendancePasses([]);
                    setSelectedRsvpId("");

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
                            status
                        `,
                    )
                    .in("id", eventIds);

                if (eventsError) {
                    throw eventsError;
                }

                const events =
                    (eventRows || []) as EventRow[];

                const mappedPasses =
                    registrations
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
                            ): item is AttendancePass =>
                                item !== null &&
                                ATTENDANCE_PASS_EVENT_STATUSES.includes(
                                    normalizeStatus(
                                        item.event.status,
                                    ),
                                ),
                        )
                        .sort((first, second) => {
                            const firstStart =
                                first.event.start_at
                                    ? new Date(
                                          first.event.start_at,
                                      ).getTime()
                                    : Number.MAX_SAFE_INTEGER;

                            const secondStart =
                                second.event.start_at
                                    ? new Date(
                                          second.event.start_at,
                                      ).getTime()
                                    : Number.MAX_SAFE_INTEGER;

                            return (
                                firstStart -
                                secondStart
                            );
                        });

                setAttendancePasses(
                    mappedPasses,
                );

                setSelectedRsvpId(
                    (currentSelectedId) => {
                        const selectedStillExists =
                            mappedPasses.some(
                                (item) =>
                                    item.rsvp.id ===
                                    currentSelectedId,
                            );

                        if (
                            selectedStillExists
                        ) {
                            return currentSelectedId;
                        }

                        return (
                            mappedPasses[0]?.rsvp
                                .id || ""
                        );
                    },
                );
            } catch (error) {
                console.error(
                    "Participant attendance passes fetch error:",
                    error,
                );

                setAttendancePasses([]);
                setSelectedRsvpId("");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        }, []);

    useEffect(() => {
        void fetchAttendancePasses();
    }, [fetchAttendancePasses]);

    const selectedPass = useMemo(
        () =>
            attendancePasses.find(
                (item) =>
                    item.rsvp.id ===
                    selectedRsvpId,
            ) ||
            attendancePasses[0] ||
            null,
        [
            attendancePasses,
            selectedRsvpId,
        ],
    );

    const handleCopyAttendanceCode =
        async (
            attendanceCode: string,
        ) => {
            try {
                await navigator.clipboard.writeText(
                    attendanceCode,
                );

                alert(
                    "Manual attendance code copied.",
                );
            } catch (error) {
                console.error(
                    "Attendance code copy error:",
                    error,
                );

                alert(
                    "Unable to copy the code. Please copy it manually.",
                );
            }
        };

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Participant Check-in
                            </p>

                            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                                Attendance Pass
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Present the QR code or
                                manual attendance code
                                assigned to your event
                                registration.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void fetchAttendancePasses(
                                    true,
                                )
                            }
                            disabled={refreshing}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw
                                className={`size-4 ${
                                    refreshing
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

                {loading ? (
                    <section
                        aria-live="polite"
                        className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"
                    >
                        <div className="mx-auto size-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                        <p className="mt-4 text-sm font-medium text-slate-600">
                            Loading attendance
                            passes...
                        </p>
                    </section>
                ) : attendancePasses.length ===
                  0 ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <QrCode
                                className="size-7"
                                aria-hidden="true"
                            />
                        </div>

                        <h2 className="mt-4 text-lg font-semibold text-slate-950">
                            No active attendance pass
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            Register for an available
                            event to receive your QR
                            code and manual attendance
                            code.
                        </p>

                        <Link
                            href="/dashboard/participant/events"
                            className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Browse Available Events
                        </Link>
                    </section>
                ) : (
                    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div>
                                <h2 className="font-semibold text-slate-950">
                                    Registered Events
                                </h2>

                                <p className="mt-1 text-sm leading-5 text-slate-500">
                                    Select the event
                                    pass you need.
                                </p>
                            </div>

                            <div className="mt-4 space-y-2">
                                {attendancePasses.map(
                                    (item) => {
                                        const selected =
                                            item.rsvp.id ===
                                            selectedPass
                                                ?.rsvp.id;

                                        return (
                                            <button
                                                key={
                                                    item
                                                        .rsvp
                                                        .id
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setSelectedRsvpId(
                                                        item
                                                            .rsvp
                                                            .id,
                                                    )
                                                }
                                                className={`w-full rounded-xl border p-4 text-left transition ${
                                                    selected
                                                        ? "border-slate-950 bg-slate-950 text-white"
                                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                <p className="font-semibold">
                                                    {
                                                        item
                                                            .event
                                                            .title
                                                    }
                                                </p>

                                                <p
                                                    className={`mt-1 text-xs ${
                                                        selected
                                                            ? "text-slate-300"
                                                            : "text-slate-500"
                                                    }`}
                                                >
                                                    {formatDateTime(
                                                        item
                                                            .event
                                                            .start_at,
                                                    )}
                                                </p>
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </aside>

                        {selectedPass && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl font-bold text-slate-950">
                                                {
                                                    selectedPass
                                                        .event
                                                        .title
                                                }
                                            </h2>

                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                                    selectedPass
                                                        .event
                                                        .status,
                                                )}`}
                                            >
                                                {getStatusLabel(
                                                    selectedPass
                                                        .event
                                                        .status,
                                                )}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                            {selectedPass
                                                .event
                                                .description ||
                                                "No event description provided."}
                                        </p>
                                    </div>

                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                        <CalendarDays
                                            className="size-6"
                                            aria-hidden="true"
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Event Starts
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {formatDateTime(
                                                selectedPass
                                                    .event
                                                    .start_at,
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Event Ends
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {formatDateTime(
                                                selectedPass
                                                    .event
                                                    .end_at,
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {selectedPass
                                    .assignment
                                    .local_instructions && (
                                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                            Local Instructions
                                        </p>

                                        <p className="mt-1 text-sm leading-6 text-amber-900">
                                            {
                                                selectedPass
                                                    .assignment
                                                    .local_instructions
                                            }
                                        </p>
                                    </div>
                                )}

                                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                                    <div>
                                        {selectedPass
                                            .rsvp
                                            .qr_token ? (
                                            <QRCodeBox
                                                qrToken={
                                                    selectedPass
                                                        .rsvp
                                                        .qr_token
                                                }
                                            />
                                        ) : (
                                            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                                                <p className="text-sm font-semibold text-red-800">
                                                    QR code unavailable
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-red-600">
                                                    Use your
                                                    manual
                                                    attendance
                                                    code during
                                                    check-in.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-blue-950">
                                                    Manual
                                                    Attendance
                                                    Code
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-blue-700">
                                                    Show this
                                                    code to
                                                    event staff
                                                    when your QR
                                                    code cannot
                                                    be scanned.
                                                </p>
                                            </div>

                                            <ClipboardCopy
                                                className="size-5 shrink-0 text-blue-700"
                                                aria-hidden="true"
                                            />
                                        </div>

                                        {selectedPass
                                            .rsvp
                                            .attendance_code ? (
                                            <>
                                                <div className="mt-5 rounded-xl border border-blue-200 bg-white px-4 py-5 text-center">
                                                    <p className="break-all font-mono text-xl font-bold tracking-[0.16em] text-slate-950 sm:text-2xl">
                                                        {
                                                            selectedPass
                                                                .rsvp
                                                                .attendance_code
                                                        }
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void handleCopyAttendanceCode(
                                                            selectedPass
                                                                .rsvp
                                                                .attendance_code!,
                                                        )
                                                    }
                                                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                                                >
                                                    <ClipboardCopy
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />

                                                    Copy Code
                                                </button>
                                            </>
                                        ) : (
                                            <div className="mt-5 rounded-xl border border-blue-200 bg-white p-5 text-center">
                                                <p className="text-sm text-slate-500">
                                                    No manual
                                                    attendance
                                                    code is
                                                    available
                                                    for this
                                                    registration.
                                                </p>
                                            </div>
                                        )}

                                        <p className="mt-4 text-xs leading-5 text-blue-700">
                                            Keep your
                                            attendance pass
                                            private. It is
                                            assigned only to
                                            your event
                                            registration.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}