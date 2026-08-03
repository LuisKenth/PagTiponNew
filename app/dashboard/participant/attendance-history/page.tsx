"use client";

import {
    CheckCircle2,
    Clock3,
    History,
    QrCode,
    RefreshCw,
    ScanLine,
    UserCheck,
    UserX,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "@/lib/supabase";

type AttendanceRow = {
    id: string;
    rsvp_id: string | null;
    event_municipality_id: string;
    user_id: string;
    status: string;
    method: string | null;
    checked_in_at: string | null;
    checked_in_by: string | null;
    created_at: string;
    updated_at: string;
};

type EventAssignmentRow = {
    id: string;
    event_id: string;
    municipality: string;
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

type AttendanceHistoryItem = {
    attendance: AttendanceRow;
    assignment: EventAssignmentRow;
    event: EventRow;
};

type AttendanceFilter =
    | "all"
    | "present"
    | "absent"
    | "pending";

function normalizeStatus(
    value: string | null | undefined,
) {
    return value?.trim().toLowerCase() ?? "";
}

function formatDateTime(
    value: string | null,
) {
    if (!value) {
        return "Not recorded";
    }

    return new Date(value).toLocaleString(
        "en-PH",
        {
            dateStyle: "medium",
            timeStyle: "short",
        },
    );
}

function getAttendanceStatusLabel(
    status: string | null,
) {
    const normalizedStatus =
        normalizeStatus(status);

    if (normalizedStatus === "present") {
        return "Present";
    }

    if (normalizedStatus === "absent") {
        return "Absent";
    }

    if (normalizedStatus === "pending") {
        return "Pending";
    }

    return status || "Unknown";
}

function getAttendanceStatusClasses(
    status: string | null,
) {
    const normalizedStatus =
        normalizeStatus(status);

    if (normalizedStatus === "present") {
        return "bg-green-100 text-green-700";
    }

    if (normalizedStatus === "absent") {
        return "bg-red-100 text-red-700";
    }

    if (normalizedStatus === "pending") {
        return "bg-amber-100 text-amber-700";
    }

    return "bg-slate-100 text-slate-600";
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

function getCheckInMethodLabel(
    method: string | null,
) {
    const normalizedMethod =
        normalizeStatus(method);

    if (normalizedMethod === "qr") {
        return "QR Scanner";
    }

    if (normalizedMethod === "manual") {
        return "Manual Code";
    }

    return "Not recorded";
}

function getCheckInMethodIcon(
    method: string | null,
) {
    const normalizedMethod =
        normalizeStatus(method);

    if (normalizedMethod === "qr") {
        return QrCode;
    }

    if (normalizedMethod === "manual") {
        return ScanLine;
    }

    return Clock3;
}

export default function ParticipantAttendanceHistoryPage() {
    const [
        attendanceHistory,
        setAttendanceHistory,
    ] = useState<AttendanceHistoryItem[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const [activeFilter, setActiveFilter] =
        useState<AttendanceFilter>("all");

    const fetchAttendanceHistory =
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
                    data: attendanceRows,
                    error: attendanceError,
                } = await supabase
                    .from("attendance")
                    .select(
                        `
                            id,
                            rsvp_id,
                            event_municipality_id,
                            user_id,
                            status,
                            method,
                            checked_in_at,
                            checked_in_by,
                            created_at,
                            updated_at
                        `,
                    )
                    .eq("user_id", user.id)
                    .order("created_at", {
                        ascending: false,
                    });

                if (attendanceError) {
                    throw attendanceError;
                }

                const attendanceRecords =
                    (attendanceRows ||
                        []) as AttendanceRow[];

                if (
                    attendanceRecords.length === 0
                ) {
                    setAttendanceHistory([]);
                    return;
                }

                const assignmentIds =
                    Array.from(
                        new Set(
                            attendanceRecords.map(
                                (record) =>
                                    record.event_municipality_id,
                            ),
                        ),
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
                    setAttendanceHistory([]);
                    return;
                }

                const eventIds =
                    Array.from(
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
                            status
                        `,
                    )
                    .in("id", eventIds);

                if (eventError) {
                    throw eventError;
                }

                const events =
                    (eventRows ||
                        []) as EventRow[];

                const mappedHistory =
                    attendanceRecords
                        .map((attendance) => {
                            const assignment =
                                assignments.find(
                                    (item) =>
                                        String(
                                            item.id,
                                        ) ===
                                        String(
                                            attendance.event_municipality_id,
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
                                attendance,
                                assignment,
                                event,
                            };
                        })
                        .filter(
                            (
                                item,
                            ): item is AttendanceHistoryItem =>
                                item !== null,
                        )
                        .sort(
                            (
                                first,
                                second,
                            ) => {
                                const firstDate =
                                    first.event
                                        .start_at
                                        ? new Date(
                                              first.event.start_at,
                                          ).getTime()
                                        : new Date(
                                              first.attendance.created_at,
                                          ).getTime();

                                const secondDate =
                                    second.event
                                        .start_at
                                        ? new Date(
                                              second.event.start_at,
                                          ).getTime()
                                        : new Date(
                                              second.attendance.created_at,
                                          ).getTime();

                                return (
                                    secondDate -
                                    firstDate
                                );
                            },
                        );

                setAttendanceHistory(
                    mappedHistory,
                );
            } catch (error) {
                console.error(
                    "Participant attendance history fetch error:",
                    error,
                );

                setAttendanceHistory([]);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to load attendance history.",
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        }, []);

    useEffect(() => {
        void fetchAttendanceHistory();
    }, [fetchAttendanceHistory]);

    const attendanceCounts =
        useMemo(() => {
            return {
                total:
                    attendanceHistory.length,

                present:
                    attendanceHistory.filter(
                        (item) =>
                            normalizeStatus(
                                item.attendance
                                    .status,
                            ) === "present",
                    ).length,

                absent:
                    attendanceHistory.filter(
                        (item) =>
                            normalizeStatus(
                                item.attendance
                                    .status,
                            ) === "absent",
                    ).length,

                pending:
                    attendanceHistory.filter(
                        (item) =>
                            normalizeStatus(
                                item.attendance
                                    .status,
                            ) === "pending",
                    ).length,
            };
        }, [attendanceHistory]);

    const filteredAttendanceHistory =
        useMemo(() => {
            if (activeFilter === "all") {
                return attendanceHistory;
            }

            return attendanceHistory.filter(
                (item) =>
                    normalizeStatus(
                        item.attendance.status,
                    ) === activeFilter,
            );
        }, [
            activeFilter,
            attendanceHistory,
        ]);

    const filters: {
        value: AttendanceFilter;
        label: string;
        count: number;
    }[] = [
        {
            value: "all",
            label: "All",
            count: attendanceCounts.total,
        },
        {
            value: "present",
            label: "Present",
            count:
                attendanceCounts.present,
        },
        {
            value: "absent",
            label: "Absent",
            count: attendanceCounts.absent,
        },
        {
            value: "pending",
            label: "Pending",
            count:
                attendanceCounts.pending,
        },
    ];

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Participant Records
                            </p>

                            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                                Attendance History
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Review your attendance
                                results, check-in
                                methods, and recorded
                                check-in times.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void fetchAttendanceHistory(
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

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    Total Records
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {
                                        attendanceCounts.total
                                    }
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <History
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
                                    Present
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {
                                        attendanceCounts.present
                                    }
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                <UserCheck
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
                                    Absent
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {
                                        attendanceCounts.absent
                                    }
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
                                <UserX
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
                                    Pending
                                </p>

                                <p className="mt-2 text-2xl font-bold text-slate-950">
                                    {
                                        attendanceCounts.pending
                                    }
                                </p>
                            </div>

                            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                <Clock3
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
                                Attendance Records
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                View your event
                                attendance status and
                                check-in information.
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
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                                selected
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
                                Loading attendance
                                history...
                            </p>
                        </div>
                    ) : errorMessage ? (
                        <div
                            role="alert"
                            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center"
                        >
                            <p className="font-semibold text-red-800">
                                Unable to load
                                attendance history
                            </p>

                            <p className="mt-1 text-sm text-red-600">
                                {errorMessage}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    void fetchAttendanceHistory()
                                }
                                className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : attendanceHistory.length ===
                      0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                                <History
                                    className="size-7"
                                    aria-hidden="true"
                                />
                            </div>

                            <h3 className="mt-4 text-lg font-semibold text-slate-950">
                                No attendance records
                            </h3>

                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                Your attendance
                                results will appear
                                here after you register
                                for an event and an
                                attendance record is
                                created.
                            </p>
                        </div>
                    ) : filteredAttendanceHistory.length ===
                      0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                            <p className="font-semibold text-slate-800">
                                No matching records
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                There are no
                                attendance records
                                under the selected
                                filter.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-5 xl:grid-cols-2">
                            {filteredAttendanceHistory.map(
                                (item) => {
                                    const MethodIcon =
                                        getCheckInMethodIcon(
                                            item
                                                .attendance
                                                .method,
                                        );

                                    const attendanceStatus =
                                        normalizeStatus(
                                            item
                                                .attendance
                                                .status,
                                        );

                                    return (
                                        <article
                                            key={
                                                item
                                                    .attendance
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
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getAttendanceStatusClasses(
                                                            item
                                                                .attendance
                                                                .status,
                                                        )}`}
                                                    >
                                                        {getAttendanceStatusLabel(
                                                            item
                                                                .attendance
                                                                .status,
                                                        )}
                                                    </span>

                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
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
                                                        Event
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
                                                        Event
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

                                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <div className="flex items-center gap-2">
                                                        <MethodIcon
                                                            className="size-4 text-slate-500"
                                                            aria-hidden="true"
                                                        />

                                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                            Check-in
                                                            Method
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 text-sm font-semibold text-slate-800">
                                                        {getCheckInMethodLabel(
                                                            item
                                                                .attendance
                                                                .method,
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Clock3
                                                            className="size-4 text-slate-500"
                                                            aria-hidden="true"
                                                        />

                                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                            Check-in
                                                            Time
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 text-sm font-semibold text-slate-800">
                                                        {formatDateTime(
                                                            item
                                                                .attendance
                                                                .checked_in_at,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-auto pt-5">
                                                {attendanceStatus ===
                                                    "present" && (
                                                    <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                                                        <CheckCircle2
                                                            className="mt-0.5 size-5 shrink-0 text-green-700"
                                                            aria-hidden="true"
                                                        />

                                                        <div>
                                                            <p className="text-sm font-semibold text-green-900">
                                                                Attendance
                                                                Confirmed
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-green-700">
                                                                Your
                                                                attendance
                                                                was
                                                                successfully
                                                                recorded
                                                                for
                                                                this
                                                                event.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {attendanceStatus ===
                                                    "absent" && (
                                                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                                                        <UserX
                                                            className="mt-0.5 size-5 shrink-0 text-red-700"
                                                            aria-hidden="true"
                                                        />

                                                        <div>
                                                            <p className="text-sm font-semibold text-red-900">
                                                                Marked
                                                                Absent
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-red-700">
                                                                No
                                                                successful
                                                                check-in
                                                                was
                                                                recorded
                                                                before
                                                                the
                                                                event
                                                                ended.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {attendanceStatus ===
                                                    "pending" && (
                                                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                        <Clock3
                                                            className="mt-0.5 size-5 shrink-0 text-amber-700"
                                                            aria-hidden="true"
                                                        />

                                                        <div>
                                                            <p className="text-sm font-semibold text-amber-900">
                                                                Attendance
                                                                Pending
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                                                Your
                                                                attendance
                                                                result
                                                                has
                                                                not
                                                                yet
                                                                been
                                                                finalized.
                                                            </p>
                                                        </div>
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