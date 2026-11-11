"use client";
import { useLiveData } from "@/app/components/live/BackgroundDataSync";

import {
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  QrCode,
  ScanLine,
  UserCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type AttendanceRow = {
  id: string;
  rsvp_id: string | null;
  event_municipality_id: string;
  user_id: string;
  status: string;
  method: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
};

type EventAssignmentRow = {
  id: string;
  event_id: string;
  municipality: string;
  local_venue_id: string | null;
  local_instructions: string | null;
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

type AttendanceHistoryItem = {
  attendance: AttendanceRow;
  assignment: EventAssignmentRow;
  event: EventRow;
  venue: VenueRow | null;
};

type AttendanceFilter = "all" | "present" | "late" | "absent" | "pending";

type FetchMode = "initial" | "refresh" | "silent";

const RECORDS_PER_PAGE = 5;

function normalizeStatus(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getEffectiveEventStatus(event: EventRow, now: number) {
  const storedStatus = normalizeStatus(event.status);

  /*
   * Cancelled always stays cancelled.
   */
  if (storedStatus === "cancelled") {
    return "cancelled";
  }

  const startTime = event.start_at
    ? new Date(event.start_at).getTime()
    : Number.NaN;

  const endTime = event.end_at ? new Date(event.end_at).getTime() : Number.NaN;

  /*
   * If the schedule is unavailable/invalid,
   * fall back to the database status.
   */
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return storedStatus;
  }

  /*
   * Completed takes priority once
   * the scheduled end time is reached.
   */
  if (now >= endTime) {
    return "completed";
  }

  /*
   * Between start and end = ongoing.
   */
  if (now >= startTime) {
    return "ongoing";
  }

  /*
   * Before start = upcoming.
   */
  return "upcoming";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getAttendanceStatusLabel(status: string | null) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "present") {
    return "Present";
  }

  if (normalizedStatus === "late") return "Late";

  if (normalizedStatus === "absent") {
    return "Absent";
  }

  if (normalizedStatus === "pending") {
    return "Awaiting Time-in";
  }

  return status || "Unknown";
}

function getAttendanceStatusClasses(status: string | null) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "present") {
    return "bg-green-100 text-green-700";
  }

  if (normalizedStatus === "late") return "bg-amber-100 text-amber-800";

  if (normalizedStatus === "absent") {
    return "bg-red-100 text-red-700";
  }

  if (normalizedStatus === "pending") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getEventStatusLabel(status: string | null) {
  const normalizedStatus = normalizeStatus(status);

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

function getEventStatusClasses(status: string | null) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "ongoing") {
    return "bg-green-100 text-green-700";
  }

  if (normalizedStatus === "published" || normalizedStatus === "upcoming") {
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

function getCheckInMethodLabel(method: string | null) {
  const normalizedMethod = normalizeStatus(method);

  if (normalizedMethod === "qr") {
    return "QR Scanner";
  }

  if (normalizedMethod === "manual") {
    return "Manual Code";
  }

  return "Not recorded";
}

function getCheckInMethodIcon(method: string | null) {
  const normalizedMethod = normalizeStatus(method);

  if (normalizedMethod === "qr") {
    return QrCode;
  }

  if (normalizedMethod === "manual") {
    return ScanLine;
  }

  return Clock3;
}

export default function ParticipantAttendanceHistoryPage() {
  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceHistoryItem[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [activeFilter, setActiveFilter] = useState<AttendanceFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);

  const fetchAttendanceHistory = useCallback(
    async (mode: FetchMode = "initial") => {
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
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          throw new Error(
            sessionError?.message ||
              "Your login session is unavailable. Please log in again.",
          );
        }

        const user = session.user;

        const { data: attendanceRows, error: attendanceError } = await supabase
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
                                checked_out_at,
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

        const attendanceRecords = (attendanceRows || []) as AttendanceRow[];

        if (attendanceRecords.length === 0) {
          setAttendanceHistory([]);

          return;
        }

        const assignmentIds = Array.from(
          new Set(
            attendanceRecords.map((record) => record.event_municipality_id),
          ),
        );

        const { data: assignmentRows, error: assignmentError } = await supabase
          .from("event_municipalities")
          .select(
            `
                                id,
                                event_id,
                                municipality,
                                local_venue_id,
                                local_instructions
                            `,
          )
          .in("id", assignmentIds);

        if (assignmentError) {
          throw assignmentError;
        }

        const assignments = (assignmentRows || []) as EventAssignmentRow[];

        if (assignments.length === 0) {
          setAttendanceHistory([]);

          return;
        }

        /*
         * Venue lookup is non-fatal.
         * Attendance history must still
         * display even if a venue cannot
         * be retrieved.
         */
        const venueIds = Array.from(
          new Set(
            assignments
              .map((assignment) => assignment.local_venue_id)
              .filter((venueId): venueId is string => Boolean(venueId)),
          ),
        );

        let venues: VenueRow[] = [];

        if (venueIds.length > 0) {
          const { data: venueRows, error: venueError } = await supabase
            .from("venues")
            .select(
              `
                                    id,
                                    venue_name,
                                    municipality
                                `,
            )
            .in("id", venueIds);

          if (venueError) {
            console.warn(
              "Unable to load attendance history venues:",
              venueError.message,
            );
          } else {
            venues = (venueRows || []) as VenueRow[];
          }
        }

        const eventIds = Array.from(
          new Set(assignments.map((assignment) => assignment.event_id)),
        );

        const { data: eventRows, error: eventError } = await supabase
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

        const events = (eventRows || []) as EventRow[];

        const mappedHistory = attendanceRecords
          .map((attendance) => {
            const assignment = assignments.find(
              (item) =>
                String(item.id) === String(attendance.event_municipality_id),
            );

            if (!assignment) {
              return null;
            }

            const event = events.find(
              (item) => String(item.id) === String(assignment.event_id),
            );

            if (!event) {
              return null;
            }

            const venue = assignment.local_venue_id
              ? venues.find(
                  (item) =>
                    String(item.id) === String(assignment.local_venue_id),
                ) || null
              : null;

            return {
              attendance,
              assignment,
              event,
              venue,
            };
          })
          .filter((item): item is AttendanceHistoryItem => item !== null)
          .sort((first, second) => {
            const firstDate = first.event.start_at
              ? new Date(first.event.start_at).getTime()
              : new Date(first.attendance.created_at).getTime();

            const secondDate = second.event.start_at
              ? new Date(second.event.start_at).getTime()
              : new Date(second.attendance.created_at).getTime();

            return secondDate - firstDate;
          });

        setAttendanceHistory(mappedHistory);
      } catch (error) {
        console.error("Participant attendance history fetch error:", error);

        if (mode !== "silent") {
          setAttendanceHistory([]);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load attendance history.",
          );
        }
      } finally {
        if (mode === "initial") {
          setLoading(false);
        }

        if (mode === "refresh") {
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useLiveData({
    onUpdate: () => {
      return fetchAttendanceHistory("silent");
    },
    disabled: loading || refreshing,
  });
  useEffect(() => {
    void fetchAttendanceHistory("initial");
  }, [fetchAttendanceHistory]);

  /*
   * LIVE EVENT STATUS CLOCK
   *
   * Updates the displayed event status every second
   * without making a Supabase request.
   */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const attendanceCounts = useMemo(() => {
    return {
      total: attendanceHistory.length,

      present: attendanceHistory.filter(
        (item) =>
          ["present", "late"].includes(
            normalizeStatus(item.attendance.status),
          ) && Boolean(item.attendance.checked_in_at),
      ).length,

      late: attendanceHistory.filter(
        (item) => normalizeStatus(item.attendance.status) === "late",
      ).length,

      absent: attendanceHistory.filter(
        (item) => normalizeStatus(item.attendance.status) === "absent",
      ).length,

      pending: attendanceHistory.filter(
        (item) => normalizeStatus(item.attendance.status) === "pending",
      ).length,
    };
  }, [attendanceHistory]);

  const filteredAttendanceHistory = useMemo(() => {
    if (activeFilter === "all") {
      return attendanceHistory;
    }

    return attendanceHistory.filter((item) =>
      activeFilter === "present"
        ? ["present", "late"].includes(
            normalizeStatus(item.attendance.status),
          ) && Boolean(item.attendance.checked_in_at)
        : normalizeStatus(item.attendance.status) === activeFilter,
    );
  }, [activeFilter, attendanceHistory]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAttendanceHistory.length / RECORDS_PER_PAGE),
  );

  const paginatedAttendanceHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;

    return filteredAttendanceHistory.slice(
      startIndex,
      startIndex + RECORDS_PER_PAGE,
    );
  }, [currentPage, filteredAttendanceHistory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const firstVisibleRecord =
    filteredAttendanceHistory.length === 0
      ? 0
      : (currentPage - 1) * RECORDS_PER_PAGE + 1;

  const lastVisibleRecord = Math.min(
    currentPage * RECORDS_PER_PAGE,
    filteredAttendanceHistory.length,
  );

  const changePage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

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
      count: attendanceCounts.present,
    },
    { value: "late", label: "Late", count: attendanceCounts.late },
    {
      value: "absent",
      label: "Absent",
      count: attendanceCounts.absent,
    },
    {
      value: "pending",
      label: "Awaiting Time-in",
      count: attendanceCounts.pending,
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
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
                Review your attendance status, Time-in, and Time-out records.
              </p>
            </div>

            {null}
          </div>
        </section>

        {/* SUMMARY */}
        <section className="mobile-summary-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Records
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {attendanceCounts.total}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <History className="size-5" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Present</p>
                <p className="mt-1 text-xs text-slate-500">
                  Includes late arrivals
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {attendanceCounts.present}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <UserCheck className="size-5" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Absent</p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {attendanceCounts.absent}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <UserX className="size-5" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Late</p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {attendanceCounts.late}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Clock3 className="size-5" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        {/* RECORDS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                Attendance Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View your event attendance status, venue, and time in
                information.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const selected = activeFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    {filter.label}{" "}
                    <span
                      className={selected ? "text-slate-300" : "text-slate-400"}
                    >
                      {filter.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div
              aria-live="polite"
              className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center"
            >
              <div className="mx-auto size-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

              <p className="mt-4 text-sm font-medium text-slate-600">
                Loading attendance history...
              </p>
            </div>
          ) : errorMessage ? (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center"
            >
              <p className="font-semibold text-red-800">
                Unable to load attendance history
              </p>

              <p className="mt-1 text-sm text-red-600">{errorMessage}</p>

              <button
                type="button"
                onClick={() => void fetchAttendanceHistory("initial")}
                className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : attendanceHistory.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                <History className="size-7" aria-hidden="true" />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                No attendance records
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Your attendance records will appear here after you register for
                an event.
              </p>
            </div>
          ) : filteredAttendanceHistory.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="font-semibold text-slate-800">
                No matching records
              </p>

              <p className="mt-1 text-sm text-slate-500">
                There are no attendance records under the selected filter.
              </p>
            </div>
          ) : (
            <>
              {/* LIST */}
              <div className="mt-6 space-y-4">
                {paginatedAttendanceHistory.map((item) => {
                  const MethodIcon = getCheckInMethodIcon(
                    item.attendance.method,
                  );

                  const attendanceStatus = normalizeStatus(
                    item.attendance.status,
                  );

                  const effectiveEventStatus = getEffectiveEventStatus(
                    item.event,
                    currentTime,
                  );

                  return (
                    <article
                      key={item.attendance.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <header className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getAttendanceStatusClasses(item.attendance.status)}`}
                          >
                            {getAttendanceStatusLabel(item.attendance.status)}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventStatusClasses(effectiveEventStatus)}`}
                          >
                            {getEventStatusLabel(effectiveEventStatus)}
                          </span>
                        </div>
                        <h3 className="mt-3 break-words text-xl font-bold text-slate-950">
                          {item.event.title}
                        </h3>
                        <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                          <MapPin
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          {item.venue?.venue_name || "Venue not assigned"} ·{" "}
                          {item.assignment.municipality}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {formatDateTime(item.event.start_at)} –{" "}
                          {formatDateTime(item.event.end_at)}
                        </p>
                      </header>
                      <div className="grid gap-3 border-y border-slate-100 bg-slate-50 p-5 sm:grid-cols-3 sm:p-6">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Time-in
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {formatDateTime(item.attendance.checked_in_at)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Time-out
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {formatDateTime(item.attendance.checked_out_at)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Attendance method
                          </p>
                          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <MethodIcon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            {getCheckInMethodLabel(item.attendance.method)}
                          </p>
                        </div>
                      </div>
                      <div className="p-5 sm:p-6">
                        {["present", "late"].includes(attendanceStatus) &&
                          item.attendance.checked_in_at && (
                            <p className="flex items-start gap-2 text-sm text-slate-700">
                              <CheckCircle2
                                className="h-5 w-5 shrink-0 text-emerald-600"
                                aria-hidden="true"
                              />
                              {item.attendance.checked_out_at
                                ? "Your Time-in and Time-out are recorded."
                                : "Your Time-in is recorded. Your Time-out has not been recorded yet."}
                            </p>
                          )}
                        {attendanceStatus === "absent" && (
                          <p className="text-sm text-red-700">
                            No successful Time-in was recorded for this event.
                          </p>
                        )}
                        {attendanceStatus === "pending" && (
                          <p className="text-sm text-slate-600">
                            Your attendance is awaiting Time-in or finalization.
                          </p>
                        )}
                        <details className="mt-4 rounded-xl border border-slate-200 p-4">
                          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                            Event Details & Instructions
                          </summary>
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                            {item.event.description ||
                              "No event description provided."}
                          </p>
                          {item.assignment.local_instructions && (
                            <div className="mt-4 rounded-lg bg-amber-50 p-4">
                              <h4 className="text-sm font-semibold text-amber-900">
                                Participant Instructions
                              </h4>
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-amber-900 [overflow-wrap:anywhere]">
                                {item.assignment.local_instructions}
                              </p>
                            </div>
                          )}
                        </details>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* PAGINATION */}
              <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {firstVisibleRecord}
                  </span>
                  {" - "}
                  <span className="font-semibold text-slate-700">
                    {lastVisibleRecord}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredAttendanceHistory.length}
                  </span>{" "}
                  records
                </p>

                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changePage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {Array.from(
                      {
                        length: totalPages,
                      },
                      (_, index) => {
                        const pageNumber = index + 1;

                        return (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => changePage(pageNumber)}
                            aria-current={
                              currentPage === pageNumber ? "page" : undefined
                            }
                            className={`min-w-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                              currentPage === pageNumber
                                ? "bg-slate-950 text-white"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      },
                    )}

                    <button
                      type="button"
                      onClick={() => changePage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
