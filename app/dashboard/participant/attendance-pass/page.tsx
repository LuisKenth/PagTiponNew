"use client";

import {
    CalendarDays,
    ChevronDown,
    ChevronUp,
    ClipboardCopy,
    Clock3,
    MapPin,
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

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

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
    local_venue_id: string | null;
    local_instructions: string | null;

    check_in_opened_at: string | null;
    check_in_closed_at: string | null;

    check_out_opened_at: string | null;
    check_out_closed_at: string | null;
};

type VenueRow = {
    id: string;
    venue_name: string;
    municipality: string;
};

type EventRow = {
    id: string;
    title: string;
    description: string | null;
    start_at: string | null;
    end_at: string | null;
    status: string | null;
};

type AttendanceRow = {
    id: string;
    rsvp_id: string;
    status: string | null;
    method: string | null;

    checked_in_at: string | null;
    checked_out_at: string | null;
};

type AttendancePass = {
    rsvp: RSVPRow;
    assignment: EventAssignmentRow;
    event: EventRow;
    venue: VenueRow | null;
    attendance: AttendanceRow | null;
};

type FetchMode =
    | "initial"
    | "refresh"
    | "silent";

type AttendancePassState =
    | "waiting_for_check_in"
    | "check_in_open"
    | "check_in_closed"
    | "waiting_for_check_out"
    | "check_out_open"
    | "check_out_closed";

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const ACTIVE_EVENT_STATUSES = [
    "published",
    "upcoming",
    "ongoing",
];

const PASSES_PER_PAGE = 5;

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

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

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return date.toLocaleString("en-PH", {
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

    if (normalizedStatus === "completed") {
        return "Completed";
    }

    if (normalizedStatus === "cancelled") {
        return "Cancelled";
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

    if (normalizedStatus === "completed") {
        return "bg-slate-100 text-slate-700";
    }

    if (normalizedStatus === "cancelled") {
        return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
}

/*
 * Keep the pass visible when:
 *
 * 1. Event is still scheduled/upcoming/ongoing.
 *
 * OR
 *
 * 2. Event is completed, participant already has a
 *    successful Check-In, but still has no Check-Out.
 *
 * Once Check-Out is completed, the completed event pass
 * no longer needs to remain active.
 */
function shouldKeepAttendancePass(
    pass: AttendancePass,
) {
    const eventStatus =
        normalizeStatus(
            pass.event.status,
        );

    if (
        ACTIVE_EVENT_STATUSES.includes(
            eventStatus,
        )
    ) {
        return true;
    }

    if (eventStatus === "completed") {
        const hasCheckedIn =
            Boolean(
                pass.attendance
                    ?.checked_in_at,
            );

        const hasCheckedOut =
            Boolean(
                pass.attendance
                    ?.checked_out_at,
            );

        return (
            hasCheckedIn &&
            !hasCheckedOut
        );
    }

    return false;
}

/*
 * Determine which attendance operation is currently
 * relevant to the participant.
 *
 * We intentionally do NOT use the old 30-minute rule.
 * Event Staff controls when Check-In is opened.
 */
function getAttendancePassState(
    pass: AttendancePass,
): AttendancePassState {
    const hasCheckedIn =
        Boolean(
            pass.attendance?.checked_in_at,
        );

    const hasCheckedOut =
        Boolean(
            pass.attendance?.checked_out_at,
        );

    const checkInOpen =
        Boolean(
            pass.assignment
                .check_in_opened_at,
        ) &&
        !pass.assignment
            .check_in_closed_at;

    const checkOutOpen =
        Boolean(
            pass.assignment
                .check_out_opened_at,
        ) &&
        !pass.assignment
            .check_out_closed_at;

    /*
     * Successful Check-In already exists.
     * Participant is now waiting for Check-Out.
     */
    if (
        hasCheckedIn &&
        !hasCheckedOut
    ) {
        if (checkOutOpen) {
            return "check_out_open";
        }

        if (
            pass.assignment
                .check_out_closed_at
        ) {
            return "check_out_closed";
        }

        return "waiting_for_check_out";
    }

    /*
     * Participant has not checked in yet.
     */
    if (checkInOpen) {
        return "check_in_open";
    }

    if (
        pass.assignment
            .check_in_closed_at
    ) {
        return "check_in_closed";
    }

    return "waiting_for_check_in";
}

function getAttendanceStateLabel(
    state: AttendancePassState,
) {
    if (
        state ===
        "waiting_for_check_in"
    ) {
        return "Waiting for Check-In";
    }

    if (state === "check_in_open") {
        return "Check-In Open";
    }

    if (
        state === "check_in_closed"
    ) {
        return "Check-In Closed";
    }

    if (
        state ===
        "waiting_for_check_out"
    ) {
        return "Check-Out Required";
    }

    if (
        state === "check_out_open"
    ) {
        return "Check-Out Open";
    }

    return "Check-Out Closed";
}

function getAttendanceStateClasses(
    state: AttendancePassState,
) {
    if (state === "check_in_open") {
        return {
            badge:
                "bg-green-100 text-green-700",
            container:
                "border-green-200 bg-green-50",
            title:
                "text-green-800",
            description:
                "text-green-700",
            dot: "bg-green-500",
        };
    }

    if (
        state ===
        "check_out_open"
    ) {
        return {
            badge:
                "bg-blue-100 text-blue-700",
            container:
                "border-blue-200 bg-blue-50",
            title:
                "text-blue-800",
            description:
                "text-blue-700",
            dot: "bg-blue-500",
        };
    }

    if (
        state ===
        "waiting_for_check_out"
    ) {
        return {
            badge:
                "bg-amber-100 text-amber-700",
            container:
                "border-amber-200 bg-amber-50",
            title:
                "text-amber-800",
            description:
                "text-amber-700",
            dot: "bg-amber-500",
        };
    }

    if (
        state ===
        "waiting_for_check_in"
    ) {
        return {
            badge:
                "bg-amber-100 text-amber-700",
            container:
                "border-amber-200 bg-amber-50",
            title:
                "text-amber-800",
            description:
                "text-amber-700",
            dot: "bg-amber-500",
        };
    }

    if (
        state ===
        "check_out_closed"
    ) {
        return {
            badge:
                "bg-amber-100 text-amber-700",
            container:
                "border-amber-200 bg-amber-50",
            title:
                "text-amber-800",
            description:
                "text-amber-700",
            dot: "bg-amber-500",
        };
    }

    return {
        badge:
            "bg-slate-100 text-slate-600",
        container:
            "border-slate-200 bg-slate-50",
        title:
            "text-slate-800",
        description:
            "text-slate-600",
        dot: "bg-slate-400",
    };
}

function hasEventEnded(
    pass: AttendancePass,
    currentTime: number,
) {
    if (!pass.event.end_at) {
        return false;
    }

    const endAt =
        new Date(
            pass.event.end_at,
        ).getTime();

    if (Number.isNaN(endAt)) {
        return false;
    }

    return currentTime >= endAt;
}

function getAttendanceStateDescription(
    state: AttendancePassState,
    pass: AttendancePass,
    currentTime: number,
) {
    if (state === "check_in_open") {
        return "Check-In is currently open. Present your QR code or manual attendance code to Event Staff to record your Time In.";
    }

    if (
        state ===
        "waiting_for_check_in"
    ) {
        return "Event Staff has not opened Check-In yet. Keep this attendance pass ready.";
    }

    if (
        state === "check_in_closed"
    ) {
        return "Check-In is currently closed. Contact Event Staff if you believe your attendance has not been recorded correctly.";
    }

    if (
        state ===
        "check_out_open"
    ) {
        return "Check-Out is open. Present the same QR code or manual attendance code to Event Staff to record your Time Out.";
    }

    if (
        state ===
        "check_out_closed"
    ) {
        return "Your Check-In is recorded, but Check-Out is currently closed. Event Staff may reopen Check-Out so your Time Out can still be recorded.";
    }

    if (
        state ===
        "waiting_for_check_out"
    ) {
        if (
            hasEventEnded(
                pass,
                currentTime,
            )
        ) {
            return "Your Check-In is recorded and the event has ended. Keep this pass available and wait for Event Staff to open Check-Out.";
        }

        return "Your Check-In is recorded. Keep this attendance pass because you will use the same QR code or manual attendance code again during Check-Out.";
    }

    return "";
}

/*
 * =========================================================
 * PAGE
 * =========================================================
 */

export default function ParticipantAttendancePassPage() {
    const [
        attendancePasses,
        setAttendancePasses,
    ] = useState<AttendancePass[]>([]);

    const [
        expandedRsvpId,
        setExpandedRsvpId,
    ] = useState("");

    const [loading, setLoading] =
        useState(true);

    const [
        refreshing,
        setRefreshing,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const [
        currentPage,
        setCurrentPage,
    ] = useState(1);

    const [
        currentTime,
        setCurrentTime,
    ] = useState(() => Date.now());

    /*
     * =====================================================
     * FETCH ATTENDANCE PASSES
     * =====================================================
     */

    const fetchAttendancePasses =
        useCallback(
            async (
                mode: FetchMode =
                    "initial",
            ) => {
                if (
                    mode === "initial"
                ) {
                    setLoading(true);
                }

                if (
                    mode === "refresh"
                ) {
                    setRefreshing(true);
                }

                if (
                    mode !== "silent"
                ) {
                    setErrorMessage("");
                }

                try {
                    const {
                        data: {
                            session,
                        },
                        error:
                            sessionError,
                    } =
                        await supabase.auth.getSession();

                    if (
                        sessionError ||
                        !session?.user
                    ) {
                        throw new Error(
                            sessionError?.message ||
                                "Your login session is unavailable. Please log in again.",
                        );
                    }

                    const user =
                        session.user;

                    /*
                     * Load participant registrations.
                     */
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
                        );

                    if (rsvpError) {
                        throw rsvpError;
                    }

                    const registrations =
                        (rsvpRows ||
                            []) as RSVPRow[];

                    if (
                        registrations.length ===
                        0
                    ) {
                        setAttendancePasses(
                            [],
                        );

                        setExpandedRsvpId(
                            "",
                        );

                        return;
                    }

                    const assignmentIds =
                        registrations.map(
                            (rsvp) =>
                                rsvp.event_municipality_id,
                        );

                    const rsvpIds =
                        registrations.map(
                            (rsvp) =>
                                rsvp.id,
                        );

                    /*
                     * Load municipality assignments.
                     */
                    const {
                        data:
                            assignmentRows,
                        error:
                            assignmentError,
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
                                local_instructions,
                                check_in_opened_at,
                                check_in_closed_at,
                                check_out_opened_at,
                                check_out_closed_at
                            `,
                        )
                        .in(
                            "id",
                            assignmentIds,
                        );

                    if (
                        assignmentError
                    ) {
                        throw assignmentError;
                    }

                    const assignments =
                        (assignmentRows ||
                            []) as EventAssignmentRow[];

                    if (
                        assignments.length ===
                        0
                    ) {
                        setAttendancePasses(
                            [],
                        );

                        setExpandedRsvpId(
                            "",
                        );

                        return;
                    }

                    /*
                     * Load participant attendance records.
                     *
                     * This is important because completed events
                     * must remain visible until Check-Out is
                     * successfully recorded.
                     */
                    const {
                        data:
                            attendanceRows,
                        error:
                            attendanceError,
                    } = await supabase
                        .from("attendance")
                        .select(
                            `
                                id,
                                rsvp_id,
                                status,
                                method,
                                checked_in_at,
                                checked_out_at
                            `,
                        )
                        .in(
                            "rsvp_id",
                            rsvpIds,
                        );

                    if (
                        attendanceError
                    ) {
                        throw attendanceError;
                    }

                    const attendanceRecords =
                        (attendanceRows ||
                            []) as AttendanceRow[];

                    /*
                     * Load assigned municipal venues.
                     */
                    const venueIds =
                        Array.from(
                            new Set(
                                assignments
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
                        venueIds.length >
                        0
                    ) {
                        const {
                            data:
                                venueRows,
                            error:
                                venueError,
                        } = await supabase
                            .from(
                                "venues",
                            )
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

                        if (
                            venueError
                        ) {
                            console.warn(
                                "Unable to load attendance pass venues:",
                                venueError.message,
                            );
                        } else {
                            venues =
                                (venueRows ||
                                    []) as VenueRow[];
                        }
                    }

                    /*
                     * Load events.
                     */
                    const eventIds =
                        Array.from(
                            new Set(
                                assignments.map(
                                    (
                                        assignment,
                                    ) =>
                                        assignment.event_id,
                                ),
                            ),
                        );

                    const {
                        data:
                            eventRows,
                        error:
                            eventsError,
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

                    if (
                        eventsError
                    ) {
                        throw eventsError;
                    }

                    const events =
                        (eventRows ||
                            []) as EventRow[];

                    /*
                     * Combine registration, event,
                     * assignment, venue, and attendance.
                     */
                    const mappedPasses =
                        registrations
                            .map(
                                (rsvp) => {
                                    const assignment =
                                        assignments.find(
                                            (
                                                item,
                                            ) =>
                                                String(
                                                    item.id,
                                                ) ===
                                                String(
                                                    rsvp.event_municipality_id,
                                                ),
                                        );

                                    if (
                                        !assignment
                                    ) {
                                        return null;
                                    }

                                    const event =
                                        events.find(
                                            (
                                                item,
                                            ) =>
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

                                    const venue =
                                        assignment.local_venue_id
                                            ? venues.find(
                                                  (
                                                      item,
                                                  ) =>
                                                      String(
                                                          item.id,
                                                      ) ===
                                                      String(
                                                          assignment.local_venue_id,
                                                      ),
                                              ) ||
                                              null
                                            : null;

                                    const attendance =
                                        attendanceRecords.find(
                                            (
                                                item,
                                            ) =>
                                                String(
                                                    item.rsvp_id,
                                                ) ===
                                                String(
                                                    rsvp.id,
                                                ),
                                        ) ||
                                        null;

                                    return {
                                        rsvp,
                                        assignment,
                                        event,
                                        venue,
                                        attendance,
                                    };
                                },
                            )
                            .filter(
                                (
                                    item,
                                ): item is AttendancePass =>
                                    item !==
                                    null,
                            )
                            /*
                             * IMPORTANT:
                             *
                             * Completed events are retained when
                             * participant has Time In but still
                             * needs Time Out.
                             */
                            .filter(
                                (
                                    item,
                                ) =>
                                    shouldKeepAttendancePass(
                                        item,
                                    ),
                            )
                            .sort(
                                (
                                    first,
                                    second,
                                ) => {
                                    const firstStart =
                                        first
                                            .event
                                            .start_at
                                            ? new Date(
                                                  first.event.start_at,
                                              ).getTime()
                                            : Number.MAX_SAFE_INTEGER;

                                    const secondStart =
                                        second
                                            .event
                                            .start_at
                                            ? new Date(
                                                  second.event.start_at,
                                              ).getTime()
                                            : Number.MAX_SAFE_INTEGER;

                                    return (
                                        firstStart -
                                        secondStart
                                    );
                                },
                            );

                    setAttendancePasses(
                        mappedPasses,
                    );

                    setExpandedRsvpId(
                        (
                            currentExpanded,
                        ) => {
                            const stillExists =
                                mappedPasses.some(
                                    (
                                        item,
                                    ) =>
                                        item
                                            .rsvp
                                            .id ===
                                        currentExpanded,
                                );

                            return stillExists
                                ? currentExpanded
                                : "";
                        },
                    );

                    setCurrentTime(
                        Date.now(),
                    );
                } catch (error) {
                    console.error(
                        "Participant attendance passes fetch error:",
                        error,
                    );

                    if (
                        mode !== "silent"
                    ) {
                        setAttendancePasses(
                            [],
                        );

                        setExpandedRsvpId(
                            "",
                        );

                        setErrorMessage(
                            error instanceof
                                Error
                                ? error.message
                                : "Unable to load attendance passes.",
                        );
                    }
                } finally {
                    if (
                        mode ===
                        "initial"
                    ) {
                        setLoading(
                            false,
                        );
                    }

                    if (
                        mode ===
                        "refresh"
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
     * Refresh on load, focus, visibility change,
     * and every 30 seconds while page is visible.
     */
    useEffect(() => {
        void fetchAttendancePasses(
            "initial",
        );

        const refreshSilently =
            () => {
                setCurrentTime(
                    Date.now(),
                );

                void fetchAttendancePasses(
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
    }, [fetchAttendancePasses]);

    /*
     * =====================================================
     * PAGINATION
     * =====================================================
     */

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                attendancePasses.length /
                    PASSES_PER_PAGE,
            ),
        );

    const paginatedPasses =
        useMemo(() => {
            const startIndex =
                (currentPage - 1) *
                PASSES_PER_PAGE;

            return attendancePasses.slice(
                startIndex,
                startIndex +
                    PASSES_PER_PAGE,
            );
        }, [
            attendancePasses,
            currentPage,
        ]);

    useEffect(() => {
        if (
            currentPage >
            totalPages
        ) {
            setCurrentPage(
                totalPages,
            );
        }
    }, [
        currentPage,
        totalPages,
    ]);

    const firstVisiblePass =
        attendancePasses.length ===
        0
            ? 0
            : (currentPage - 1) *
                  PASSES_PER_PAGE +
              1;

    const lastVisiblePass =
        Math.min(
            currentPage *
                PASSES_PER_PAGE,
            attendancePasses.length,
        );

    /*
     * =====================================================
     * ACTIONS
     * =====================================================
     */

    const togglePass = (
        rsvpId: string,
    ) => {
        setExpandedRsvpId(
            (current) =>
                current === rsvpId
                    ? ""
                    : rsvpId,
        );
    };

    const changePage = (
        page: number,
    ) => {
        const nextPage =
            Math.max(
                1,
                Math.min(
                    totalPages,
                    page,
                ),
            );

        setCurrentPage(
            nextPage,
        );

        setExpandedRsvpId(
            "",
        );
    };

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

    /*
     * =====================================================
     * RENDER
     * =====================================================
     */

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* HEADER */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Participant
                                Attendance
                            </p>

                            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                                Attendance Pass
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Present the QR
                                code or manual
                                attendance code
                                assigned to your
                                event registration
                                for Check-In and
                                Check-Out.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void fetchAttendancePasses(
                                    "refresh",
                                )
                            }
                            disabled={
                                refreshing
                            }
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

                {/* LOADING */}
                {loading ? (
                    <section
                        aria-live="polite"
                        className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"
                    >
                        <div className="mx-auto size-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                        <p className="mt-4 text-sm font-medium text-slate-600">
                            Loading
                            attendance
                            passes...
                        </p>
                    </section>
                ) : errorMessage ? (
                    /* ERROR */
                    <section
                        role="alert"
                        className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm"
                    >
                        <p className="font-semibold text-red-800">
                            Unable to load
                            attendance passes
                        </p>

                        <p className="mt-2 text-sm text-red-600">
                            {errorMessage}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                void fetchAttendancePasses(
                                    "initial",
                                )
                            }
                            className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            Try Again
                        </button>
                    </section>
                ) : attendancePasses.length ===
                  0 ? (
                    /* EMPTY */
                    <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <QrCode
                                className="size-7"
                                aria-hidden="true"
                            />
                        </div>

                        <h2 className="mt-4 text-lg font-semibold text-slate-950">
                            No active
                            attendance pass
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            You currently have
                            no event that
                            requires an active
                            Attendance Pass.
                            Completed Check-In
                            and Check-Out
                            records can be
                            reviewed in your
                            Attendance History.
                        </p>

                        <Link
                            href="/dashboard/participant/events"
                            className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Browse Available
                            Events
                        </Link>
                    </section>
                ) : (
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        {/* SECTION HEADER */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-950">
                                    Active Event
                                    Passes
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Keep your
                                    Attendance Pass
                                    available until
                                    both Check-In
                                    and Check-Out
                                    are complete.
                                </p>
                            </div>

                            <div className="text-sm text-slate-500">
                                <span className="font-semibold text-slate-800">
                                    {
                                        attendancePasses.length
                                    }
                                </span>{" "}
                                active{" "}
                                {attendancePasses.length ===
                                1
                                    ? "pass"
                                    : "passes"}
                            </div>
                        </div>

                        {/* LIST */}
                        <div className="mt-6 space-y-4">
                            {paginatedPasses.map(
                                (item) => {
                                    const expanded =
                                        expandedRsvpId ===
                                        item
                                            .rsvp
                                            .id;

                                    const attendanceState =
                                        getAttendancePassState(
                                            item,
                                        );

                                    const stateStyles =
                                        getAttendanceStateClasses(
                                            attendanceState,
                                        );

                                    const hasCheckedIn =
                                        Boolean(
                                            item
                                                .attendance
                                                ?.checked_in_at,
                                        );

                                    return (
                                        <article
                                            key={
                                                item
                                                    .rsvp
                                                    .id
                                            }
                                            className={`overflow-hidden rounded-2xl border bg-white transition ${
                                                expanded
                                                    ? "border-slate-300 shadow-md"
                                                    : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md"
                                            }`}
                                        >
                                            {/* LIST ROW */}
                                            <div className="p-5">
                                                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                                                    {/* EVENT */}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-lg font-semibold text-slate-950">
                                                                {
                                                                    item
                                                                        .event
                                                                        .title
                                                                }
                                                            </h3>

                                                            <span
                                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                                                    item
                                                                        .event
                                                                        .status,
                                                                )}`}
                                                            >
                                                                {getStatusLabel(
                                                                    item
                                                                        .event
                                                                        .status,
                                                                )}
                                                            </span>
                                                        </div>

                                                        {/* MUNICIPALITY + VENUE */}
                                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                                                            <span className="font-medium">
                                                                {
                                                                    item
                                                                        .assignment
                                                                        .municipality
                                                                }
                                                            </span>

                                                            <span className="inline-flex items-center gap-1.5">
                                                                <MapPin
                                                                    className="size-4 shrink-0"
                                                                    aria-hidden="true"
                                                                />

                                                                <span className="font-medium">
                                                                    {item
                                                                        .venue
                                                                        ?.venue_name ||
                                                                        "Venue not assigned"}
                                                                </span>
                                                            </span>
                                                        </div>

                                                        <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-600">
                                                            {item
                                                                .event
                                                                .description ||
                                                                "No event description provided."}
                                                        </p>
                                                    </div>

                                                    {/* SCHEDULE */}
                                                    <div className="grid shrink-0 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 xl:w-[390px]">
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                                Starts
                                                            </p>

                                                            <p className="mt-1 font-semibold text-slate-800">
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

                                                            <p className="mt-1 font-semibold text-slate-800">
                                                                {formatDateTime(
                                                                    item
                                                                        .event
                                                                        .end_at,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* ACTION */}
                                                    <div className="flex shrink-0 flex-col gap-3 xl:w-[220px]">
                                                        <span
                                                            className={`inline-flex justify-center rounded-full px-3 py-1.5 text-xs font-semibold ${stateStyles.badge}`}
                                                        >
                                                            {getAttendanceStateLabel(
                                                                attendanceState,
                                                            )}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                togglePass(
                                                                    item
                                                                        .rsvp
                                                                        .id,
                                                                )
                                                            }
                                                            aria-expanded={
                                                                expanded
                                                            }
                                                            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                                                expanded
                                                                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                                    : "bg-slate-950 text-white hover:bg-slate-800"
                                                            }`}
                                                        >
                                                            {expanded
                                                                ? "Hide Pass"
                                                                : "View Pass"}

                                                            {expanded ? (
                                                                <ChevronUp
                                                                    className="size-4"
                                                                    aria-hidden="true"
                                                                />
                                                            ) : (
                                                                <ChevronDown
                                                                    className="size-4"
                                                                    aria-hidden="true"
                                                                />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* EXPANDED PASS */}
                                            {expanded && (
                                                <div className="border-t border-slate-200 bg-slate-50/60 p-5 sm:p-6">
                                                    {/* LOCAL INSTRUCTIONS */}
                                                    {item
                                                        .assignment
                                                        .local_instructions && (
                                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
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

                                                    {/* EVENT VENUE */}
                                                    <div
                                                        className={`${
                                                            item
                                                                .assignment
                                                                .local_instructions
                                                                ? "mt-4"
                                                                : ""
                                                        } rounded-xl border border-slate-200 bg-white p-4`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                                                <MapPin
                                                                    className="size-5"
                                                                    aria-hidden="true"
                                                                />
                                                            </div>

                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                                    Event
                                                                    Venue
                                                                </p>

                                                                <p className="mt-1 font-semibold text-slate-900">
                                                                    {item
                                                                        .venue
                                                                        ?.venue_name ||
                                                                        "Venue not assigned"}
                                                                </p>

                                                                <p className="mt-1 text-sm text-slate-500">
                                                                    {
                                                                        item
                                                                            .assignment
                                                                            .municipality
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ATTENDANCE STATUS */}
                                                    <div
                                                        className={`mt-4 rounded-xl border p-4 ${stateStyles.container}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <span
                                                                className={`mt-1.5 size-2.5 shrink-0 rounded-full ${stateStyles.dot}`}
                                                            />

                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <Clock3
                                                                        className={`size-4 ${stateStyles.title}`}
                                                                        aria-hidden="true"
                                                                    />

                                                                    <p
                                                                        className={`text-sm font-semibold ${stateStyles.title}`}
                                                                    >
                                                                        {getAttendanceStateLabel(
                                                                            attendanceState,
                                                                        )}
                                                                    </p>
                                                                </div>

                                                                <p
                                                                    className={`mt-1 text-sm leading-6 ${stateStyles.description}`}
                                                                >
                                                                    {getAttendanceStateDescription(
                                                                        attendanceState,
                                                                        item,
                                                                        currentTime,
                                                                    )}
                                                                </p>

                                                                {hasCheckedIn &&
                                                                    item
                                                                        .attendance
                                                                        ?.checked_in_at && (
                                                                        <p
                                                                            className={`mt-2 text-xs ${stateStyles.description}`}
                                                                        >
                                                                            Time
                                                                            In:{" "}
                                                                            <span className="font-semibold">
                                                                                {formatDateTime(
                                                                                    item
                                                                                        .attendance
                                                                                        .checked_in_at,
                                                                                )}
                                                                            </span>
                                                                        </p>
                                                                    )}

                                                                {attendanceState ===
                                                                    "check_in_open" &&
                                                                    item
                                                                        .assignment
                                                                        .check_in_opened_at && (
                                                                        <p
                                                                            className={`mt-1 text-xs ${stateStyles.description}`}
                                                                        >
                                                                            Check-In
                                                                            opened{" "}
                                                                            {formatDateTime(
                                                                                item
                                                                                    .assignment
                                                                                    .check_in_opened_at,
                                                                            )}
                                                                        </p>
                                                                    )}

                                                                {attendanceState ===
                                                                    "check_out_open" &&
                                                                    item
                                                                        .assignment
                                                                        .check_out_opened_at && (
                                                                        <p
                                                                            className={`mt-1 text-xs ${stateStyles.description}`}
                                                                        >
                                                                            Check-Out
                                                                            opened{" "}
                                                                            {formatDateTime(
                                                                                item
                                                                                    .assignment
                                                                                    .check_out_opened_at,
                                                                            )}
                                                                        </p>
                                                                    )}

                                                                {attendanceState ===
                                                                    "check_out_closed" &&
                                                                    item
                                                                        .assignment
                                                                        .check_out_closed_at && (
                                                                        <p
                                                                            className={`mt-1 text-xs ${stateStyles.description}`}
                                                                        >
                                                                            Check-Out
                                                                            closed{" "}
                                                                            {formatDateTime(
                                                                                item
                                                                                    .assignment
                                                                                    .check_out_closed_at,
                                                                            )}
                                                                        </p>
                                                                    )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* PASS DETAILS HEADER */}
                                                    <div className="mt-5 flex items-center gap-2">
                                                        <CalendarDays
                                                            className="size-5 text-slate-500"
                                                            aria-hidden="true"
                                                        />

                                                        <div>
                                                            <p className="font-semibold text-slate-950">
                                                                Attendance
                                                                Pass
                                                            </p>

                                                            <p className="text-xs text-slate-500">
                                                                Present
                                                                either
                                                                code to
                                                                authorized
                                                                Event Staff
                                                                for
                                                                Check-In
                                                                or
                                                                Check-Out.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* QR + MANUAL CODE */}
                                                    <div className="mt-4 grid gap-5 lg:grid-cols-2">
                                                        {/* QR */}
                                                        <div>
                                                            {item
                                                                .rsvp
                                                                .qr_token ? (
                                                                <QRCodeBox
                                                                    qrToken={
                                                                        item
                                                                            .rsvp
                                                                            .qr_token
                                                                    }
                                                                />
                                                            ) : (
                                                                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                                                                    <QrCode
                                                                        className="mx-auto size-7 text-red-600"
                                                                        aria-hidden="true"
                                                                    />

                                                                    <p className="mt-3 text-sm font-semibold text-red-800">
                                                                        QR
                                                                        code
                                                                        unavailable
                                                                    </p>

                                                                    <p className="mt-1 text-xs leading-5 text-red-600">
                                                                        Use
                                                                        your
                                                                        manual
                                                                        attendance
                                                                        code
                                                                        for
                                                                        Check-In
                                                                        or
                                                                        Check-Out.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* MANUAL CODE */}
                                                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <p className="font-semibold text-blue-950">
                                                                        Manual
                                                                        Attendance
                                                                        Code
                                                                    </p>

                                                                    <p className="mt-1 text-xs leading-5 text-blue-700">
                                                                        Show
                                                                        this
                                                                        code
                                                                        to
                                                                        Event
                                                                        Staff
                                                                        for
                                                                        Check-In
                                                                        or
                                                                        Check-Out
                                                                        when
                                                                        the
                                                                        QR
                                                                        code
                                                                        cannot
                                                                        be
                                                                        scanned.
                                                                    </p>
                                                                </div>

                                                                <ClipboardCopy
                                                                    className="size-5 shrink-0 text-blue-700"
                                                                    aria-hidden="true"
                                                                />
                                                            </div>

                                                            {item
                                                                .rsvp
                                                                .attendance_code ? (
                                                                <>
                                                                    <div className="mt-5 rounded-xl border border-blue-200 bg-white px-4 py-5 text-center">
                                                                        <p className="break-all font-mono text-xl font-bold tracking-[0.16em] text-slate-950 sm:text-2xl">
                                                                            {
                                                                                item
                                                                                    .rsvp
                                                                                    .attendance_code
                                                                            }
                                                                        </p>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            void handleCopyAttendanceCode(
                                                                                item
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

                                                                        Copy
                                                                        Code
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="mt-5 rounded-xl border border-blue-200 bg-white p-5 text-center">
                                                                    <p className="text-sm text-slate-500">
                                                                        No
                                                                        manual
                                                                        attendance
                                                                        code is
                                                                        available
                                                                        for
                                                                        this
                                                                        registration.
                                                                    </p>
                                                                </div>
                                                            )}

                                                            <p className="mt-4 text-xs leading-5 text-blue-700">
                                                                Keep your
                                                                Attendance
                                                                Pass
                                                                private.
                                                                It is
                                                                assigned
                                                                only to
                                                                your event
                                                                registration.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    );
                                },
                            )}
                        </div>

                        {/* PAGINATION */}
                        <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-500">
                                Showing{" "}
                                <span className="font-semibold text-slate-700">
                                    {
                                        firstVisiblePass
                                    }
                                </span>
                                {" - "}
                                <span className="font-semibold text-slate-700">
                                    {
                                        lastVisiblePass
                                    }
                                </span>{" "}
                                of{" "}
                                <span className="font-semibold text-slate-700">
                                    {
                                        attendancePasses.length
                                    }
                                </span>{" "}
                                active passes
                            </p>

                            {totalPages > 1 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            changePage(
                                                currentPage -
                                                    1,
                                            )
                                        }
                                        disabled={
                                            currentPage ===
                                            1
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Previous
                                    </button>

                                    {Array.from(
                                        {
                                            length:
                                                totalPages,
                                        },
                                        (
                                            _,
                                            index,
                                        ) => {
                                            const pageNumber =
                                                index +
                                                1;

                                            return (
                                                <button
                                                    key={
                                                        pageNumber
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        changePage(
                                                            pageNumber,
                                                        )
                                                    }
                                                    aria-current={
                                                        currentPage ===
                                                        pageNumber
                                                            ? "page"
                                                            : undefined
                                                    }
                                                    className={`min-w-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                                        currentPage ===
                                                        pageNumber
                                                            ? "bg-slate-950 text-white"
                                                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    {
                                                        pageNumber
                                                    }
                                                </button>
                                            );
                                        },
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            changePage(
                                                currentPage +
                                                    1,
                                            )
                                        }
                                        disabled={
                                            currentPage ===
                                            totalPages
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}