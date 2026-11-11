"use client";
import { useLiveData } from "@/app/components/live/BackgroundDataSync";

import {
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Clock3,
  MapPin,
  QrCode,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";

import DownloadAttendancePass from "../components/DownloadAttendancePass";
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

type FetchMode = "initial" | "refresh" | "silent";

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

const ACTIVE_EVENT_STATUSES = ["published", "upcoming", "ongoing"];

const PASSES_PER_PAGE = 5;

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function normalizeStatus(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function formatDateTime(dateValue: string | null) {
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

function getStatusLabel(status: string | null) {
  const normalizedStatus = normalizeStatus(status);

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

function getStatusClasses(status: string | null) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "ongoing") {
    return "bg-green-100 text-green-700";
  }

  if (normalizedStatus === "upcoming" || normalizedStatus === "published") {
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
 *    successful Time In, but still has no Time Out.
 *
 * Once Time Out is completed, the completed event pass
 * no longer needs to remain active.
 */
function shouldKeepAttendancePass(pass: AttendancePass) {
  const eventStatus = normalizeStatus(pass.event.status);

  if (ACTIVE_EVENT_STATUSES.includes(eventStatus)) {
    return true;
  }

  if (eventStatus === "completed") {
    const hasCheckedIn = Boolean(pass.attendance?.checked_in_at);

    const hasCheckedOut = Boolean(pass.attendance?.checked_out_at);

    return hasCheckedIn && !hasCheckedOut;
  }

  return false;
}

/*
 * Determine which attendance operation is currently
 * relevant to the participant.
 *
 * We intentionally do NOT use the old 30-minute rule.
 * Event Staff controls when Time In is opened.
 */
function getAttendancePassState(pass: AttendancePass): AttendancePassState {
  const hasCheckedIn = Boolean(pass.attendance?.checked_in_at);

  const hasCheckedOut = Boolean(pass.attendance?.checked_out_at);

  const checkInOpen =
    Boolean(pass.assignment.check_in_opened_at) &&
    !pass.assignment.check_in_closed_at;

  const checkOutOpen =
    Boolean(pass.assignment.check_out_opened_at) &&
    !pass.assignment.check_out_closed_at;

  /*
   * Successful Time In already exists.
   * Participant is now waiting for Time Out.
   */
  if (hasCheckedIn && !hasCheckedOut) {
    if (checkOutOpen) {
      return "check_out_open";
    }

    if (pass.assignment.check_out_closed_at) {
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

  if (pass.assignment.check_in_closed_at) {
    return "check_in_closed";
  }

  return "waiting_for_check_in";
}

function getAttendanceStateLabel(state: AttendancePassState) {
  if (state === "waiting_for_check_in") {
    return "Waiting for Time In";
  }

  if (state === "check_in_open") {
    return "Time In Open";
  }

  if (state === "check_in_closed") {
    return "Time In Closed";
  }

  if (state === "waiting_for_check_out") {
    return "Time Out Required";
  }

  if (state === "check_out_open") {
    return "Time Out Open";
  }

  return "Time Out Closed";
}

function getAttendanceStateClasses(state: AttendancePassState) {
  if (state === "check_in_open") {
    return {
      badge: "bg-green-100 text-green-700",
      container: "border-green-200 bg-green-50",
      title: "text-green-800",
      description: "text-green-700",
      dot: "bg-green-500",
    };
  }

  if (state === "check_out_open") {
    return {
      badge: "bg-blue-100 text-blue-700",
      container: "border-blue-200 bg-blue-50",
      title: "text-blue-800",
      description: "text-blue-700",
      dot: "bg-blue-500",
    };
  }

  if (state === "waiting_for_check_out") {
    return {
      badge: "bg-amber-100 text-amber-700",
      container: "border-amber-200 bg-amber-50",
      title: "text-amber-800",
      description: "text-amber-700",
      dot: "bg-amber-500",
    };
  }

  if (state === "waiting_for_check_in") {
    return {
      badge: "bg-amber-100 text-amber-700",
      container: "border-amber-200 bg-amber-50",
      title: "text-amber-800",
      description: "text-amber-700",
      dot: "bg-amber-500",
    };
  }

  if (state === "check_out_closed") {
    return {
      badge: "bg-amber-100 text-amber-700",
      container: "border-amber-200 bg-amber-50",
      title: "text-amber-800",
      description: "text-amber-700",
      dot: "bg-amber-500",
    };
  }

  return {
    badge: "bg-slate-100 text-slate-600",
    container: "border-slate-200 bg-slate-50",
    title: "text-slate-800",
    description: "text-slate-600",
    dot: "bg-slate-400",
  };
}

function hasEventEnded(pass: AttendancePass, currentTime: number) {
  if (!pass.event.end_at) {
    return false;
  }

  const endAt = new Date(pass.event.end_at).getTime();

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
    return "Time In is currently open. Present your QR code or manual attendance code to Event Staff to record your Time In.";
  }

  if (state === "waiting_for_check_in") {
    return "Event Staff has not opened Time In yet. Keep this attendance pass ready.";
  }

  if (state === "check_in_closed") {
    return "Time In is currently closed. Contact Event Staff if you believe your attendance has not been recorded correctly.";
  }

  if (state === "check_out_open") {
    return "Time Out is open. Present the same QR code or manual attendance code to Event Staff to record your Time Out.";
  }

  if (state === "check_out_closed") {
    return "Your Time In is recorded, but Time Out is currently closed. Event Staff may reopen Time Out so your Time Out can still be recorded.";
  }

  if (state === "waiting_for_check_out") {
    if (hasEventEnded(pass, currentTime)) {
      return "Your Time In is recorded and the event has ended. Keep this pass available and wait for Event Staff to open Time Out.";
    }

    return "Your Time In is recorded. Keep this attendance pass because you will use the same QR code or manual attendance code again during Time Out.";
  }

  return "";
}

/*
 * =========================================================
 * PAGE
 * =========================================================
 */

export default function ParticipantAttendancePassPage() {
  const [participantName, setParticipantName] = useState("");
  const [registrationConfirmed, setRegistrationConfirmed] = useState("");
  const focusedPassRef = useRef("");

  const [attendancePasses, setAttendancePasses] = useState<AttendancePass[]>(
    [],
  );

  const [expandedRsvpId, setExpandedRsvpId] = useState("");

  const [expandedQrToken, setExpandedQrToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!expandedQrToken) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpandedQrToken(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expandedQrToken]);

  /*
   * =====================================================
   * FETCH ATTENDANCE PASSES
   * =====================================================
   */

  const fetchAttendancePasses = useCallback(
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
        const { data: participantProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        setParticipantName(
          participantProfile?.full_name ||
            user.user_metadata?.full_name ||
            "Participant",
        );

        /*
         * Load participant registrations.
         */
        const { data: rsvpRows, error: rsvpError } = await supabase
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

        const registrations = (rsvpRows || []) as RSVPRow[];

        if (registrations.length === 0) {
          setAttendancePasses([]);

          setExpandedRsvpId("");

          return;
        }

        const assignmentIds = registrations.map(
          (rsvp) => rsvp.event_municipality_id,
        );

        const rsvpIds = registrations.map((rsvp) => rsvp.id);

        /*
         * Load municipality assignments.
         */
        const { data: assignmentRows, error: assignmentError } = await supabase
          .from("event_municipalities")
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
          .in("id", assignmentIds);

        if (assignmentError) {
          throw assignmentError;
        }

        const assignments = (assignmentRows || []) as EventAssignmentRow[];

        if (assignments.length === 0) {
          setAttendancePasses([]);

          setExpandedRsvpId("");

          return;
        }

        /*
         * Load participant attendance records.
         *
         * This is important because completed events
         * must remain visible until Time Out is
         * successfully recorded.
         */
        const { data: attendanceRows, error: attendanceError } = await supabase
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
          .in("rsvp_id", rsvpIds);

        if (attendanceError) {
          throw attendanceError;
        }

        const attendanceRecords = (attendanceRows || []) as AttendanceRow[];

        /*
         * Load assigned municipal venues.
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
              "Unable to load attendance pass venues:",
              venueError.message,
            );
          } else {
            venues = (venueRows || []) as VenueRow[];
          }
        }

        /*
         * Load events.
         */
        const eventIds = Array.from(
          new Set(assignments.map((assignment) => assignment.event_id)),
        );

        const { data: eventRows, error: eventsError } = await supabase
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

        const events = (eventRows || []) as EventRow[];

        /*
         * Combine registration, event,
         * assignment, venue, and attendance.
         */
        const mappedPasses = registrations
          .map((rsvp) => {
            const assignment = assignments.find(
              (item) => String(item.id) === String(rsvp.event_municipality_id),
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

            const attendance =
              attendanceRecords.find(
                (item) => String(item.rsvp_id) === String(rsvp.id),
              ) || null;

            return {
              rsvp,
              assignment,
              event,
              venue,
              attendance,
            };
          })
          .filter((item): item is AttendancePass => item !== null)
          /*
           * IMPORTANT:
           *
           * Completed events are retained when
           * participant has Time In but still
           * needs Time Out.
           */
          .filter((item) => shouldKeepAttendancePass(item))
          .sort((first, second) => {
            const firstStart = first.event.start_at
              ? new Date(first.event.start_at).getTime()
              : Number.MAX_SAFE_INTEGER;

            const secondStart = second.event.start_at
              ? new Date(second.event.start_at).getTime()
              : Number.MAX_SAFE_INTEGER;

            return firstStart - secondStart;
          });

        setAttendancePasses(mappedPasses);

        setExpandedRsvpId((currentExpanded) => {
          const stillExists = mappedPasses.some(
            (item) => item.rsvp.id === currentExpanded,
          );

          return stillExists ? currentExpanded : "";
        });

        setCurrentTime(Date.now());
      } catch (error) {
        console.error("Participant attendance passes fetch error:", error);

        if (mode !== "silent") {
          setAttendancePasses([]);

          setExpandedRsvpId("");

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load attendance passes.",
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

  /*
   * Refresh on load, focus, visibility change,
   * and every 30 seconds while page is visible.
   */
  useLiveData({
    onUpdate: () => {
      setCurrentTime(Date.now());
      return fetchAttendancePasses("silent");
    },
    disabled: loading || refreshing,
  });
  useEffect(() => {
    void fetchAttendancePasses("initial");
  }, [fetchAttendancePasses]);

  /*
   * =====================================================
   * PAGINATION
   * =====================================================
   */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assignmentId = params.get("assignment");
    if (!assignmentId || attendancePasses.length === 0) return;
    const index = attendancePasses.findIndex(
      (pass) => pass.assignment.id === assignmentId,
    );
    if (index < 0) return;
    const timer = window.setTimeout(() => {
      setCurrentPage(Math.floor(index / PASSES_PER_PAGE) + 1);
      setExpandedRsvpId(attendancePasses[index].rsvp.id);
      if (params.get("registered") === "1") {
        setRegistrationConfirmed(assignmentId);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [attendancePasses]);

  useEffect(() => {
    if (!expandedRsvpId) return;
    const assignmentId = new URLSearchParams(window.location.search).get(
      "assignment",
    );
    if (!assignmentId) return;
    const pass = attendancePasses.find(
      (item) => item.assignment.id === assignmentId,
    );
    if (
      !pass ||
      pass.rsvp.id !== expandedRsvpId ||
      focusedPassRef.current === pass.rsvp.id
    )
      return;
    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(
        "attendance-pass-" + pass.rsvp.id,
      );
      if (!element) return;
      focusedPassRef.current = pass.rsvp.id;
      element.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expandedRsvpId, currentPage, attendancePasses]);

  const totalPages = Math.max(
    1,
    Math.ceil(attendancePasses.length / PASSES_PER_PAGE),
  );

  const paginatedPasses = useMemo(() => {
    const startIndex = (currentPage - 1) * PASSES_PER_PAGE;

    return attendancePasses.slice(startIndex, startIndex + PASSES_PER_PAGE);
  }, [attendancePasses, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const firstVisiblePass =
    attendancePasses.length === 0 ? 0 : (currentPage - 1) * PASSES_PER_PAGE + 1;

  const lastVisiblePass = Math.min(
    currentPage * PASSES_PER_PAGE,
    attendancePasses.length,
  );

  /*
   * =====================================================
   * ACTIONS
   * =====================================================
   */

  const togglePass = (rsvpId: string) => {
    setExpandedRsvpId((current) => (current === rsvpId ? "" : rsvpId));
  };

  const changePage = (page: number) => {
    const nextPage = Math.max(1, Math.min(totalPages, page));

    setCurrentPage(nextPage);

    setExpandedRsvpId("");
  };

  const handleCopyAttendanceCode = async (attendanceCode: string) => {
    try {
      await navigator.clipboard.writeText(attendanceCode);

      alert("Manual attendance code copied.");
    } catch (error) {
      console.error("Attendance code copy error:", error);

      alert("Unable to copy the code. Please copy it manually.");
    }
  };

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <main className="p-3 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {/* HEADER */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                Participant Attendance
              </p>

              <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                Attendance Pass
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Present the QR code or manual attendance code assigned to your
                event registration for Time In and Time Out.
              </p>
            </div>

            {null}
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
              Loading attendance passes...
            </p>
          </section>
        ) : errorMessage ? (
          /* ERROR */
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm"
          >
            <p className="font-semibold text-red-800">
              Unable to load attendance passes
            </p>

            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>

            <button
              type="button"
              onClick={() => void fetchAttendancePasses("initial")}
              className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Try Again
            </button>
          </section>
        ) : attendancePasses.length === 0 ? (
          /* EMPTY */
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <QrCode className="size-7" aria-hidden="true" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              No active attendance pass
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              You currently have no event that requires an active Attendance
              Pass. Completed Time In and Time Out records can be reviewed in
              your Attendance History.
            </p>

            <Link
              href="/dashboard/participant/events"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Browse Available Events
            </Link>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
            {/* SECTION HEADER */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Active Event Passes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Keep your Attendance Pass available until both Time In and
                  Time Out are complete.
                </p>
              </div>

              <div className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">
                  {attendancePasses.length}
                </span>{" "}
                active {attendancePasses.length === 1 ? "pass" : "passes"}
              </div>
            </div>

            {/* LIST */}
            <div className="mt-4 space-y-4 sm:mt-6">
              {paginatedPasses.map((item) => {
                const expanded = expandedRsvpId === item.rsvp.id;

                const attendanceState = getAttendancePassState(item);

                const stateStyles = getAttendanceStateClasses(attendanceState);

                const hasCheckedIn = Boolean(item.attendance?.checked_in_at);

                return (
                  <article
                    id={"attendance-pass-" + item.rsvp.id}
                    key={item.rsvp.id}
                    className={`scroll-mt-6 overflow-hidden rounded-2xl border bg-white transition ${
                      expanded
                        ? "border-slate-300 shadow-md"
                        : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <header className="p-3 sm:p-6">
                      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0 w-full sm:flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(item.event.status)}`}
                            >
                              {getStatusLabel(item.event.status)}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${stateStyles.badge}`}
                            >
                              {getAttendanceStateLabel(attendanceState)}
                            </span>
                          </div>
                          <h3 className="mt-3 break-words text-lg font-bold sm:text-xl text-slate-950">
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
                          <p className="mt-2 text-sm text-slate-600">
                            {formatDateTime(item.event.start_at)} –{" "}
                            {formatDateTime(item.event.end_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePass(item.rsvp.id)}
                          aria-expanded={expanded}
                          aria-controls={"pass-content-" + item.rsvp.id}
                          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 sm:w-auto sm:px-4 sm:py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <QrCode className="h-4 w-4" aria-hidden="true" />
                          {expanded ? "Hide QR Code" : "Show QR Code"}
                          {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </header>

                    {/* EXPANDED PASS */}
                    {expanded && (
                      <div
                        id={"pass-content-" + item.rsvp.id}
                        className="border-t border-slate-200 bg-slate-50/60 p-3 sm:p-6"
                      >
                        {registrationConfirmed === item.assignment.id && (
                          <p
                            role="status"
                            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
                          >
                            Registration successful. Your QR code and manual
                            code are ready below.
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-lg font-bold text-slate-950">
                            Your Attendance Code
                          </h4>
                          <p className="text-sm text-slate-500">
                            Use the same code for Time-in and Time-out.
                          </p>
                        </div>
                        {/* QR + MANUAL CODE */}
                        <div className="mt-3 grid min-w-0 items-start gap-3 sm:mt-4 sm:gap-5 md:grid-cols-2">
                          {/* QR */}
                          <div>
                            {item.rsvp.qr_token ? (
                              <>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  aria-label="Open enlarged attendance QR code"
                                  aria-haspopup="dialog"
                                  onClick={() =>
                                    setExpandedQrToken(item.rsvp.qr_token)
                                  }
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === "Enter" ||
                                      event.key === " "
                                    ) {
                                      event.preventDefault();
                                      setExpandedQrToken(item.rsvp.qr_token);
                                    }
                                  }}
                                  className="mx-auto w-full max-w-sm cursor-zoom-in rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
                                >
                                  <QRCodeBox qrToken={item.rsvp.qr_token} />
                                </div>
                                <DownloadAttendancePass
                                  qrToken={item.rsvp.qr_token}
                                  participantName={participantName}
                                  eventTitle={item.event.title}
                                  schedule={`${formatDateTime(item.event.start_at)} – ${formatDateTime(item.event.end_at)} (PH)`}
                                  venue={
                                    item.venue?.venue_name ||
                                    "Venue not assigned"
                                  }
                                  municipality={item.assignment.municipality}
                                  manualCode={item.rsvp.attendance_code}
                                />
                              </>
                            ) : (
                              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                                <QrCode
                                  className="mx-auto size-7 text-red-600"
                                  aria-hidden="true"
                                />

                                <p className="mt-3 text-sm font-semibold text-red-800">
                                  QR code unavailable
                                </p>

                                <p className="mt-1 text-xs leading-5 text-red-600">
                                  Use your manual attendance code for Time In or
                                  Time Out.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* MANUAL CODE */}
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-blue-950">
                                  Manual Attendance Code
                                </p>

                                <p className="mt-1 text-xs leading-5 text-blue-700">
                                  Show this code to Event Staff for Time In or
                                  Time Out when the QR code cannot be scanned.
                                </p>
                              </div>

                              <ClipboardCopy
                                className="size-5 shrink-0 text-blue-700"
                                aria-hidden="true"
                              />
                            </div>

                            {item.rsvp.attendance_code ? (
                              <>
                                <div className="mt-5 rounded-xl border border-blue-200 bg-white px-4 py-5 text-center">
                                  <p className="break-all font-mono text-xl font-bold tracking-[0.16em] text-slate-950 sm:text-2xl">
                                    {item.rsvp.attendance_code}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyAttendanceCode(
                                      item.rsvp.attendance_code!,
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
                                  No manual attendance code is available for
                                  this registration.
                                </p>
                              </div>
                            )}

                            <p className="mt-4 text-xs leading-5 text-blue-700">
                              Keep your Attendance Pass private. It is assigned
                              only to your event registration.
                            </p>
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
                                  {getAttendanceStateLabel(attendanceState)}
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
                                item.attendance?.checked_in_at && (
                                  <p
                                    className={`mt-2 text-xs ${stateStyles.description}`}
                                  >
                                    Time In:{" "}
                                    <span className="font-semibold">
                                      {formatDateTime(
                                        item.attendance.checked_in_at,
                                      )}
                                    </span>
                                  </p>
                                )}

                              {attendanceState === "check_in_open" &&
                                item.assignment.check_in_opened_at && (
                                  <p
                                    className={`mt-1 text-xs ${stateStyles.description}`}
                                  >
                                    Time In opened{" "}
                                    {formatDateTime(
                                      item.assignment.check_in_opened_at,
                                    )}
                                  </p>
                                )}

                              {attendanceState === "check_out_open" &&
                                item.assignment.check_out_opened_at && (
                                  <p
                                    className={`mt-1 text-xs ${stateStyles.description}`}
                                  >
                                    Time Out opened{" "}
                                    {formatDateTime(
                                      item.assignment.check_out_opened_at,
                                    )}
                                  </p>
                                )}

                              {attendanceState === "check_out_closed" &&
                                item.assignment.check_out_closed_at && (
                                  <p
                                    className={`mt-1 text-xs ${stateStyles.description}`}
                                  >
                                    Time Out closed{" "}
                                    {formatDateTime(
                                      item.assignment.check_out_closed_at,
                                    )}
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>

                        <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
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
                    )}
                  </article>
                );
              })}
            </div>

            {/* PAGINATION */}
            <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {firstVisiblePass}
                </span>
                {" - "}
                <span className="font-semibold text-slate-700">
                  {lastVisiblePass}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {attendancePasses.length}
                </span>{" "}
                active passes
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
          </section>
        )}
      </div>

      {expandedQrToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close enlarged QR code"
            onClick={() => setExpandedQrToken(null)}
            className="absolute inset-0 cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged attendance QR code"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              autoFocus
              aria-label="Close enlarged QR code"
              onClick={() => setExpandedQrToken(null)}
              className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            <div className="pr-12">
              <h2 className="text-lg font-bold text-slate-950 sm:text-xl">
                Attendance QR Code
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Show this enlarged code to Event Staff for scanning.
              </p>
            </div>

            <div className="mt-5 flex max-h-[65vh] items-center justify-center overflow-auto rounded-2xl bg-slate-50 p-4 [&_svg]:!h-64 [&_svg]:!w-64 [&_canvas]:!h-64 [&_canvas]:!w-64 [&_img]:!h-64 [&_img]:!w-64 [&_img]:!max-w-none sm:[&_svg]:!h-80 sm:[&_svg]:!w-80 sm:[&_canvas]:!h-80 sm:[&_canvas]:!w-80 sm:[&_img]:!h-80 sm:[&_img]:!w-80">
              <div className="w-full max-w-sm">
                <QRCodeBox qrToken={expandedQrToken} />
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">
              Click outside this window or press Escape to close.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
