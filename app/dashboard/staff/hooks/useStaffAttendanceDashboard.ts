"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

import type {
  AttendanceActionMode,
  AttendanceCheckInTokenResult,
  AttendanceCheckOutTokenResult,
  AttendanceMethod,
  AttendanceRecord,
  CheckInRpcResult,
  CheckOutRpcResult,
  DashboardMessage,
  DatabaseId,
  EventAssignment,
  RawEventAssignment,
  SupabaseErrorLike,
} from "../types";

import { formatDatabaseError, formatDateTime } from "../utils";

type ParticipantProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function getRpcRow<T>(data: unknown): T | null {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return (data[0] ?? null) as T | null;
  }

  return data as T;
}

export function useStaffAttendanceDashboard() {
  const [municipality, setMunicipality] = useState("");

  const [eventAssignments, setEventAssignments] = useState<EventAssignment[]>(
    [],
  );

  const [selectedEventMunicipalityId, setSelectedEventMunicipalityId] =
    useState("");

  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [attendanceMode, setAttendanceMode] =
    useState<AttendanceActionMode>("check_in");

  const [message, setMessage] = useState<DashboardMessage | null>(null);

  const [loading, setLoading] = useState(true);

  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [controlLoading, setControlLoading] = useState<"open" | "close" | null>(
    null,
  );

  const [checkOutControlLoading, setCheckOutControlLoading] = useState<
    "open" | "close" | null
  >(null);

  const [currentTime, setCurrentTime] = useState(0);

  const showMessage = useCallback(
    (text: string, tone: DashboardMessage["tone"] = "info") => {
      setMessage({
        text,
        tone,
      });
    },
    [],
  );

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const selectedAssignment = useMemo(() => {
    return (
      eventAssignments.find(
        (assignment) => String(assignment.id) === selectedEventMunicipalityId,
      ) ?? null
    );
  }, [eventAssignments, selectedEventMunicipalityId]);

  const eventStartTime = selectedAssignment?.event.start_at
    ? new Date(selectedAssignment.event.start_at).getTime()
    : null;

  const eventEndTime = selectedAssignment?.event.end_at
    ? new Date(selectedAssignment.event.end_at).getTime()
    : null;

  const eventStatus = selectedAssignment?.event.status?.toLowerCase() ?? "";

  const isCancelled = eventStatus === "cancelled";

  const isCompleted = eventStatus === "completed";

  const isDraft = eventStatus === "draft";
  const isBeforeEventEnd = eventEndTime !== null && currentTime < eventEndTime;

  const hasEventEnded = eventEndTime !== null && currentTime >= eventEndTime;

  /*
   * =====================================================
   * CHECK-IN SESSION STATE
   * =====================================================
   */

  const isCheckInOpen = Boolean(
    selectedAssignment?.check_in_opened_at &&
    !selectedAssignment?.check_in_closed_at,
  );

  const wasCheckInOpened = Boolean(selectedAssignment?.check_in_opened_at);

  const wasCheckInClosed = Boolean(selectedAssignment?.check_in_closed_at);

  /*
   * =====================================================
   * CHECK-OUT SESSION STATE
   * =====================================================
   */

  const isCheckOutOpen = Boolean(
    selectedAssignment?.check_out_opened_at &&
    !selectedAssignment?.check_out_closed_at,
  );

  const wasCheckOutOpened = Boolean(selectedAssignment?.check_out_opened_at);

  const wasCheckOutClosed = Boolean(selectedAssignment?.check_out_closed_at);

  const hasValidSchedule = Boolean(
    eventStartTime !== null && eventEndTime !== null,
  );

  /*
   * =====================================================
   * CHECK-IN PERMISSIONS
   * =====================================================
   *
   * Staff may:
   *
   * - Open Check-In before or during the event
   * - Close Check-In
   * - Reopen Check-In for late participants
   *
   * Historical CLOSED Check-Out records must not
   * permanently lock Check-In while the event is
   * still ongoing.
   *
   * Check-In and Check-Out must never be active
   * at the same time.
   *
   * Once the scheduled event end time is reached,
   * Check-In becomes permanently unavailable.
   */

  const canOpenCheckIn = Boolean(
    selectedAssignment &&
    hasValidSchedule &&
    !isCheckInOpen &&
    !isCancelled &&
    !isCompleted &&
    !isDraft &&
    !hasEventEnded &&
    !isCheckOutOpen,
  );

  const canUseCheckInTools = Boolean(
    selectedAssignment &&
    hasValidSchedule &&
    isCheckInOpen &&
    !isCancelled &&
    !isCompleted &&
    !isDraft &&
    !hasEventEnded &&
    !isCheckOutOpen,
  );

  /*
   * =====================================================
   * CHECK-OUT PERMISSIONS
   * =====================================================
   *
   * Required flow:
   *
   * Open Check-In
   *      ↓
   * Time In
   *      ↓
   * Close Check-In
   *      ↓
   * May still Reopen Check-In
   *      ↓
   * Close Check-In
   *      ↓
   * Open Check-Out
   *      ↓
   * Check-In becomes permanently locked
   *      ↓
   * Time Out
   *      ↓
   * Close Check-Out
   */

  const canOpenCheckOut = Boolean(
    selectedAssignment &&
    hasValidSchedule &&
    !isCancelled &&
    !isDraft &&
    !isBeforeEventEnd &&
    wasCheckInOpened &&
    wasCheckInClosed &&
    !isCheckOutOpen,
  );

  const canCloseCheckOut = Boolean(
    selectedAssignment && isCheckOutOpen && !wasCheckOutClosed,
  );

  const canUseCheckOutTools = Boolean(
    selectedAssignment &&
    hasValidSchedule &&
    isCheckOutOpen &&
    !isCancelled &&
    !isDraft &&
    !isBeforeEventEnd,
  );

  const canUseAttendanceTools =
    attendanceMode === "check_in" ? canUseCheckInTools : canUseCheckOutTools;

  /*
   * =====================================================
   * BLOCKED MESSAGES
   * =====================================================
   */

  const getCheckInBlockedMessage = useCallback(() => {
    if (!selectedAssignment) {
      return "Select an event before using attendance check-in.";
    }

    if (!hasValidSchedule) {
      return "The selected event does not have a valid start and end schedule.";
    }

    if (isCancelled) {
      return "Check-in is unavailable because the selected event was cancelled.";
    }

    if (isDraft) {
      return "Check-in is unavailable because the selected event is still a draft.";
    }

    if (isCompleted) {
      return "Check-in is unavailable because the selected event is completed.";
    }

    /*
     * Once the scheduled event end time is reached,
     * late Check-In is no longer allowed.
     */
    if (hasEventEnded) {
      return "Check-In is permanently closed because the scheduled event end time has been reached.";
    }

    /*
     * Normally impossible under the new rules,
     * but protects against legacy event states.
     *
     * Check-In and Check-Out cannot be active
     * at the same time.
     */
    if (isCheckOutOpen) {
      return "Close the active Check-Out session before reopening Check-In.";
    }

    /*
     * Closed Check-In may be reopened for
     * late participants until event end.
     */
    if (!isCheckInOpen) {
      return wasCheckInClosed
        ? "Check-In is closed. Event Staff may reopen it for late participants until the event ends."
        : "Open attendance Check-In to begin recording participant Time In.";
    }

    return "Attendance Check-In tools are currently unavailable.";
  }, [
    hasEventEnded,
    hasValidSchedule,
    isCancelled,
    isCheckInOpen,
    isCheckOutOpen,
    isCompleted,
    isDraft,
    selectedAssignment,
    wasCheckInClosed,
  ]);

  const getCheckOutBlockedMessage = useCallback(() => {
    if (!selectedAssignment) {
      return "Select an event before using attendance check-out.";
    }

    if (!hasValidSchedule) {
      return "The selected event does not have a valid start and end schedule.";
    }

    if (isCancelled) {
      return "Check-out is unavailable because the selected event was cancelled.";
    }

    if (isDraft) {
      return "Check-out is unavailable because the selected event is still a draft.";
    }

    /*
     * Check-Out must wait until the scheduled
     * event end time has been reached.
     */
    if (isBeforeEventEnd) {
      return selectedAssignment.event.end_at
        ? `Check-Out will become available when the event ends at ${formatDateTime(
            selectedAssignment.event.end_at,
          )}.`
        : "Check-Out will become available after the event has ended.";
    }

    if (!wasCheckInOpened) {
      return "Open attendance Check-In before using Check-Out.";
    }

    if (!wasCheckInClosed) {
      return "Close attendance Check-In before opening Check-Out.";
    }

    if (isCheckOutOpen) {
      return "Attendance Check-Out is currently open.";
    }

    if (wasCheckOutClosed) {
      return "Check-Out is closed. Event Staff may reopen it to continue recording participant Time Out.";
    }

    return "Open attendance Check-Out to begin recording participant Time Out.";
  }, [
    hasValidSchedule,
    isBeforeEventEnd,
    isCancelled,
    isCheckOutOpen,
    isDraft,
    selectedAssignment,
    wasCheckInClosed,
    wasCheckInOpened,
    wasCheckOutClosed,
  ]);

  const getAttendanceBlockedMessage = useCallback(() => {
    return attendanceMode === "check_in"
      ? getCheckInBlockedMessage()
      : getCheckOutBlockedMessage();
  }, [attendanceMode, getCheckInBlockedMessage, getCheckOutBlockedMessage]);

  const changeAttendanceMode = useCallback((nextMode: AttendanceActionMode) => {
    setAttendanceMode(nextMode);

    setMessage(null);
  }, []);

  /*
   * =====================================================
   * LOAD EVENT ASSIGNMENTS
   * =====================================================
   */

  const loadEventAssignments = useCallback(
    async (staffMunicipality: string): Promise<EventAssignment[]> => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw (
          userError ?? new Error("Authenticated Event Staff was not found.")
        );
      }

      const { data: staffAssignmentRows, error: staffAssignmentsError } =
        await supabase
          .from("event_staff_assignments")
          .select("event_municipality_id")
          .eq("staff_id", user.id)
          .eq("status", "active");

      if (staffAssignmentsError) {
        throw staffAssignmentsError;
      }

      const assignedEventMunicipalityIds = Array.from(
        new Set(
          (staffAssignmentRows ?? [])
            .map((assignment) =>
              String(assignment.event_municipality_id ?? "").trim(),
            )
            .filter(Boolean),
        ),
      );

      if (assignedEventMunicipalityIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("event_municipalities")
        .select(
          `
            id,
            event_id,
            municipality,

            check_in_opened_at,
            check_in_closed_at,
            check_in_opened_by,
            check_in_closed_by,

            check_out_opened_at,
            check_out_closed_at,
            check_out_opened_by,
            check_out_closed_by,

            events (
              id,
              title,
              status,
              start_at,
              end_at
            )
          `,
        )
        .in("id", assignedEventMunicipalityIds)
        .eq("municipality", staffMunicipality);

      if (error) {
        throw error;
      }

      const normalizedAssignments = ((data ?? []) as RawEventAssignment[])
        .map((assignment) => {
          const eventDetails = Array.isArray(assignment.events)
            ? assignment.events[0]
            : assignment.events;

          if (!eventDetails) {
            return null;
          }

          return {
            id: assignment.id,

            event_id: assignment.event_id,

            municipality: assignment.municipality,

            check_in_opened_at: assignment.check_in_opened_at,

            check_in_closed_at: assignment.check_in_closed_at,

            check_in_opened_by: assignment.check_in_opened_by,

            check_in_closed_by: assignment.check_in_closed_by,

            check_out_opened_at: assignment.check_out_opened_at,

            check_out_closed_at: assignment.check_out_closed_at,

            check_out_opened_by: assignment.check_out_opened_by,

            check_out_closed_by: assignment.check_out_closed_by,

            event: eventDetails,
          } satisfies EventAssignment;
        })
        .filter(
          (assignment): assignment is EventAssignment => assignment !== null,
        );

      normalizedAssignments.sort((first, second) => {
        const firstCheckOutOpen = Boolean(
          first.check_out_opened_at && !first.check_out_closed_at,
        );

        const secondCheckOutOpen = Boolean(
          second.check_out_opened_at && !second.check_out_closed_at,
        );

        if (firstCheckOutOpen && !secondCheckOutOpen) {
          return -1;
        }

        if (!firstCheckOutOpen && secondCheckOutOpen) {
          return 1;
        }

        const firstCheckInOpen = Boolean(
          first.check_in_opened_at && !first.check_in_closed_at,
        );

        const secondCheckInOpen = Boolean(
          second.check_in_opened_at && !second.check_in_closed_at,
        );

        if (firstCheckInOpen && !secondCheckInOpen) {
          return -1;
        }

        if (!firstCheckInOpen && secondCheckInOpen) {
          return 1;
        }

        const firstStart = first.event.start_at
          ? new Date(first.event.start_at).getTime()
          : Number.MAX_SAFE_INTEGER;

        const secondStart = second.event.start_at
          ? new Date(second.event.start_at).getTime()
          : Number.MAX_SAFE_INTEGER;

        return firstStart - secondStart;
      });

      return normalizedAssignments;
    },
    [],
  );

  /*
   * =====================================================
   * ATTENDANCE RECORDS
   * =====================================================
   */

  const fetchAttendanceRecords = useCallback(
    async (eventMunicipalityId: DatabaseId | "") => {
      if (!eventMunicipalityId) {
        setAttendanceRecords([]);
        return;
      }

      setAttendanceLoading(true);

      try {
        const {
          data: attendanceData,

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

              checked_out_at,
              checked_out_by
            `,
          )
          .eq("event_municipality_id", eventMunicipalityId)
          .order("checked_in_at", {
            ascending: false,
            nullsFirst: false,
          });

        if (attendanceError) {
          throw attendanceError;
        }

        const attendanceRows = (attendanceData ?? []) as AttendanceRecord[];

        if (attendanceRows.length === 0) {
          setAttendanceRecords([]);

          return;
        }

        const participantIds = Array.from(
          new Set(
            attendanceRows
              .map((record) => String(record.user_id ?? "").trim())
              .filter(Boolean),
          ),
        );

        if (participantIds.length === 0) {
          setAttendanceRecords(
            attendanceRows.map((record) => ({
              ...record,

              participant_name: null,

              participant_email: null,
            })),
          );

          return;
        }

        const {
          data: participantProfiles,

          error: participantProfilesError,
        } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", participantIds);

        if (participantProfilesError) {
          console.error(
            "Unable to load participant profiles:",
            participantProfilesError.message,
          );

          setAttendanceRecords(
            attendanceRows.map((record) => ({
              ...record,

              participant_name: null,

              participant_email: null,
            })),
          );

          return;
        }

        const profileByUserId = new Map<string, ParticipantProfileRow>();

        for (const profile of (participantProfiles ??
          []) as ParticipantProfileRow[]) {
          profileByUserId.set(String(profile.id), profile);
        }

        const enrichedAttendanceRecords = attendanceRows.map((record) => {
          const participantProfile = profileByUserId.get(
            String(record.user_id),
          );

          return {
            ...record,

            participant_name: participantProfile?.full_name ?? null,

            participant_email: participantProfile?.email ?? null,
          };
        });

        setAttendanceRecords(enrichedAttendanceRecords);
      } catch (error) {
        const errorValue = error as SupabaseErrorLike;

        console.error(
          errorValue.message ?? "Unable to load attendance records.",
        );

        setAttendanceRecords([]);

        showMessage(formatDatabaseError(errorValue), "error");
      } finally {
        setAttendanceLoading(false);
      }
    },
    [showMessage],
  );

  /*
   * =====================================================
   * REFRESH ASSIGNMENTS
   * =====================================================
   */

  const refreshEventAssignments = useCallback(
    async (preferredAssignmentId?: DatabaseId) => {
      if (!municipality) {
        return null;
      }

      const assignments = await loadEventAssignments(municipality);

      setEventAssignments(assignments);

      const preferredAssignment =
        assignments.find(
          (assignment) =>
            String(assignment.id) ===
            String(preferredAssignmentId ?? selectedEventMunicipalityId),
        ) ??
        assignments[0] ??
        null;

      setSelectedEventMunicipalityId(
        preferredAssignment ? String(preferredAssignment.id) : "",
      );

      return preferredAssignment;
    },
    [loadEventAssignments, municipality, selectedEventMunicipalityId],
  );

  const refreshSelectedEvent = useCallback(async () => {
    if (!selectedAssignment) {
      return;
    }

    const refreshed = await refreshEventAssignments(selectedAssignment.id);

    if (refreshed) {
      await fetchAttendanceRecords(refreshed.id);
    }

    showMessage("Attendance information refreshed.", "info");
  }, [
    fetchAttendanceRecords,
    refreshEventAssignments,
    selectedAssignment,
    showMessage,
  ]);

  /*
   * =====================================================
   * INITIAL STAFF DATA
   * =====================================================
   */

  const fetchStaffData = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("Authenticated user not found.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("municipality, role, verification_status")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.municipality) {
        throw profileError ?? new Error("Staff municipality was not found.");
      }

      setMunicipality(profile.municipality);

      const assignments = await loadEventAssignments(profile.municipality);

      setEventAssignments(assignments);

      const firstAssignment = assignments[0] ?? null;

      if (firstAssignment) {
        setSelectedEventMunicipalityId(String(firstAssignment.id));

        await fetchAttendanceRecords(firstAssignment.id);
      } else {
        setSelectedEventMunicipalityId("");

        setAttendanceRecords([]);
      }
    } catch (error) {
      const errorValue = error as SupabaseErrorLike;

      console.error(errorValue.message ?? "Unable to load staff dashboard.");

      showMessage(formatDatabaseError(errorValue), "error");
    } finally {
      setLoading(false);
    }
  }, [fetchAttendanceRecords, loadEventAssignments, showMessage]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void fetchStaffData();
    }, 0);

    return () => {
      window.clearTimeout(initialLoadTimer);
    };
  }, [fetchStaffData]);

  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(Date.now());
    };

    const initialTimer = window.setTimeout(updateCurrentTime, 0);

    const clockInterval = window.setInterval(updateCurrentTime, 5000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(clockInterval);
    };
  }, []);

  /*
   * =====================================================
   * SELECT EVENT
   * =====================================================
   */

  const selectEvent = useCallback(
    async (eventMunicipalityId: string) => {
      setSelectedEventMunicipalityId(eventMunicipalityId);

      /*
       * Reset to Check-In when changing event.
       */
      setAttendanceMode("check_in");

      setMessage(null);

      await fetchAttendanceRecords(eventMunicipalityId);
    },
    [fetchAttendanceRecords],
  );

  /*
   * =====================================================
   * OPEN / REOPEN CHECK-IN
   * =====================================================
   */

  const openCheckIn = useCallback(async () => {
    if (!selectedAssignment) {
      showMessage("Select an event first.", "error");

      return;
    }

    if (!canOpenCheckIn) {
      showMessage(getCheckInBlockedMessage(), "error");

      return;
    }

    setControlLoading("open");

    try {
      const { data, error } = await supabase.rpc("open_event_check_in", {
        p_event_municipality_id: selectedAssignment.id,
      });

      if (error) {
        console.error("Open check-in RPC error:", error);

        showMessage(formatDatabaseError(error), "error");

        return;
      }

      const result = getRpcRow<CheckInRpcResult>(data);

      if (!result) {
        showMessage("The check-in request returned no result.", "error");

        return;
      }

      if (result.success === false) {
        showMessage(
          result.message || "Unable to open attendance check-in.",
          "error",
        );

        return;
      }

      const refreshedAssignment = await refreshEventAssignments(
        selectedAssignment.id,
      );

      if (refreshedAssignment) {
        await fetchAttendanceRecords(refreshedAssignment.id);
      }

      setAttendanceMode("check_in");

      showMessage(
        result.already_open
          ? "Attendance check-in is already open."
          : result.message ||
              "Attendance check-in is now open. QR scanning and manual attendance codes are enabled.",
        "success",
      );
    } finally {
      setControlLoading(null);
    }
  }, [
    canOpenCheckIn,
    fetchAttendanceRecords,
    getCheckInBlockedMessage,
    refreshEventAssignments,
    selectedAssignment,
    showMessage,
  ]);

  /*
   * =====================================================
   * CLOSE CHECK-IN
   * =====================================================
   */

  const closeCheckIn = useCallback(async () => {
    if (!selectedAssignment) {
      showMessage("Select an event first.", "error");

      return;
    }

    setControlLoading("close");

    try {
      const { data, error } = await supabase.rpc("close_event_check_in", {
        p_event_municipality_id: selectedAssignment.id,
      });

      if (error) {
        console.error("Close check-in RPC error:", error);

        showMessage(formatDatabaseError(error), "error");

        return;
      }

      const result = getRpcRow<CheckInRpcResult>(data);

      if (!result) {
        showMessage("The close check-in request returned no result.", "error");

        return;
      }

      if (result.success === false) {
        showMessage(
          result.message || "Unable to close attendance check-in.",
          "error",
        );

        return;
      }

      const refreshedAssignment = await refreshEventAssignments(
        selectedAssignment.id,
      );

      if (refreshedAssignment) {
        await fetchAttendanceRecords(refreshedAssignment.id);
      }

      showMessage(
        result.already_closed
          ? "Attendance check-in is already closed."
          : result.message ||
              "Attendance check-in has been closed. New Time In entries are blocked.",
        "success",
      );
    } finally {
      setControlLoading(null);
    }
  }, [
    fetchAttendanceRecords,
    refreshEventAssignments,
    selectedAssignment,
    showMessage,
  ]);

  /*
   * =====================================================
   * OPEN CHECK-OUT
   * =====================================================
   */

  const openCheckOut = useCallback(async () => {
    if (!selectedAssignment) {
      showMessage("Select an event first.", "error");

      return;
    }

    if (!canOpenCheckOut) {
      showMessage(getCheckOutBlockedMessage(), "error");

      return;
    }

    setCheckOutControlLoading("open");

    try {
      const { data, error } = await supabase.rpc("open_event_check_out", {
        p_event_municipality_id: selectedAssignment.id,
      });

      if (error) {
        console.error("Open check-out RPC error:", error);

        showMessage(formatDatabaseError(error), "error");

        return;
      }

      const result = getRpcRow<CheckOutRpcResult>(data);

      if (!result) {
        showMessage("The check-out request returned no result.", "error");

        return;
      }

      if (!result.success) {
        showMessage(
          result.message || "Unable to open attendance check-out.",
          "error",
        );

        return;
      }

      const refreshedAssignment = await refreshEventAssignments(
        selectedAssignment.id,
      );

      if (refreshedAssignment) {
        await fetchAttendanceRecords(refreshedAssignment.id);
      }

      setAttendanceMode("check_out");

      showMessage(
        result.already_open
          ? "Attendance check-out is already open."
          : result.message ||
              "Attendance check-out is now open. QR scanning and manual attendance codes can now record Time Out.",
        "success",
      );
    } finally {
      setCheckOutControlLoading(null);
    }
  }, [
    canOpenCheckOut,
    fetchAttendanceRecords,
    getCheckOutBlockedMessage,
    refreshEventAssignments,
    selectedAssignment,
    showMessage,
  ]);

  /*
   * =====================================================
   * CLOSE CHECK-OUT
   * =====================================================
   */

  const closeCheckOut = useCallback(async () => {
    if (!selectedAssignment) {
      showMessage("Select an event first.", "error");

      return;
    }

    if (!canCloseCheckOut) {
      showMessage(getCheckOutBlockedMessage(), "error");

      return;
    }

    setCheckOutControlLoading("close");

    try {
      const { data, error } = await supabase.rpc("close_event_check_out", {
        p_event_municipality_id: selectedAssignment.id,
      });

      if (error) {
        console.error("Close check-out RPC error:", error);

        showMessage(formatDatabaseError(error), "error");

        return;
      }

      const result = getRpcRow<CheckOutRpcResult>(data);

      if (!result) {
        showMessage("The close check-out request returned no result.", "error");

        return;
      }

      if (!result.success) {
        showMessage(
          result.message || "Unable to close attendance check-out.",
          "error",
        );

        return;
      }

      const refreshedAssignment = await refreshEventAssignments(
        selectedAssignment.id,
      );

      if (refreshedAssignment) {
        await fetchAttendanceRecords(refreshedAssignment.id);
      }

      showMessage(
        result.already_closed
          ? "Attendance check-out is already closed."
          : result.message ||
              "Attendance check-out has been closed. New Time Out entries are blocked.",
        "success",
      );
    } finally {
      setCheckOutControlLoading(null);
    }
  }, [
    canCloseCheckOut,
    fetchAttendanceRecords,
    getCheckOutBlockedMessage,
    refreshEventAssignments,
    selectedAssignment,
    showMessage,
  ]);

  /*
   * =====================================================
   * PROCESS QR / MANUAL TOKEN
   * =====================================================
   */

  const processQrToken = useCallback(
    async (
      submittedToken: string,
      attendanceMethod: AttendanceMethod = "qr",
    ) => {
      if (!selectedAssignment) {
        showMessage("Select an event first.", "error");

        return false;
      }

      const currentToolsAvailable =
        attendanceMode === "check_in"
          ? canUseCheckInTools
          : canUseCheckOutTools;

      if (!currentToolsAvailable) {
        showMessage(
          attendanceMode === "check_in"
            ? getCheckInBlockedMessage()
            : getCheckOutBlockedMessage(),
          "error",
        );

        return false;
      }

      const cleanedToken = submittedToken.trim();

      if (!cleanedToken) {
        showMessage(
          attendanceMethod === "qr"
            ? "The scanned QR code did not contain a valid attendance token."
            : "Enter the participant attendance code.",
          "error",
        );

        return false;
      }

      /*
       * =================================================
       * CHECK IN
       * =================================================
       */

      if (attendanceMode === "check_in") {
        showMessage(
          attendanceMethod === "qr"
            ? "Checking participant QR code for Time In..."
            : "Checking participant attendance code for Time In...",
          "info",
        );

        const { data, error } = await supabase.rpc("process_attendance_token", {
          p_event_municipality_id: selectedAssignment.id,

          p_token: cleanedToken,

          p_method: attendanceMethod,
        });

        if (error) {
          console.error("Attendance check-in RPC error:", error);

          showMessage(formatDatabaseError(error), "error");

          return false;
        }

        const result = getRpcRow<AttendanceCheckInTokenResult>(data);

        if (!result) {
          showMessage(
            "The Time In request returned no result. Please try again.",
            "error",
          );

          return false;
        }

        const participantName =
          result.participant_name?.trim() || "Participant";

        if (!result.success) {
          showMessage(
            result.result_message || "Unable to record participant Time In.",
            "error",
          );

          return false;
        }

        if (
          result.already_checked_in ||
          result.result_code === "already_checked_in"
        ) {
          const checkedInTime = result.attendance_checked_in_at
            ? formatDateTime(result.attendance_checked_in_at)
            : null;

          showMessage(
            checkedInTime
              ? `${participantName} was already checked in at ${checkedInTime}.`
              : `${participantName} already has a Time In record.`,
            "info",
          );

          await fetchAttendanceRecords(selectedAssignment.id);

          return false;
        }

        const checkedInTime = result.attendance_checked_in_at
          ? formatDateTime(result.attendance_checked_in_at)
          : null;

        showMessage(
          checkedInTime
            ? `${participantName} checked in successfully at ${checkedInTime}.`
            : `${participantName} checked in successfully.`,
          "success",
        );

        await fetchAttendanceRecords(selectedAssignment.id);

        return true;
      }

      /*
       * =================================================
       * CHECK OUT
       * =================================================
       */

      showMessage(
        attendanceMethod === "qr"
          ? "Checking participant QR code for Time Out..."
          : "Checking participant attendance code for Time Out...",
        "info",
      );

      const { data, error } = await supabase.rpc(
        "process_attendance_check_out_token",
        {
          p_event_municipality_id: selectedAssignment.id,

          p_token: cleanedToken,

          p_method: attendanceMethod,
        },
      );

      if (error) {
        console.error("Attendance check-out RPC error:", error);

        showMessage(formatDatabaseError(error), "error");

        return false;
      }

      const result = getRpcRow<AttendanceCheckOutTokenResult>(data);

      if (!result) {
        showMessage(
          "The Time Out request returned no result. Please try again.",
          "error",
        );

        return false;
      }

      const participantName = result.participant_name?.trim() || "Participant";

      if (!result.success) {
        showMessage(
          result.result_message || "Unable to record participant Time Out.",
          "error",
        );

        await fetchAttendanceRecords(selectedAssignment.id);

        return false;
      }

      if (
        result.already_checked_out ||
        result.result_code === "already_checked_out"
      ) {
        const checkedOutTime = result.attendance_checked_out_at
          ? formatDateTime(result.attendance_checked_out_at)
          : null;

        showMessage(
          checkedOutTime
            ? `${participantName} was already checked out at ${checkedOutTime}.`
            : `${participantName} already has a Time Out record.`,
          "info",
        );

        await fetchAttendanceRecords(selectedAssignment.id);

        return false;
      }

      const checkedOutTime = result.attendance_checked_out_at
        ? formatDateTime(result.attendance_checked_out_at)
        : null;

      showMessage(
        checkedOutTime
          ? `${participantName} checked out successfully at ${checkedOutTime}.`
          : `${participantName} checked out successfully.`,
        "success",
      );

      await fetchAttendanceRecords(selectedAssignment.id);

      return true;
    },
    [
      attendanceMode,
      canUseCheckInTools,
      canUseCheckOutTools,
      fetchAttendanceRecords,
      getCheckInBlockedMessage,
      getCheckOutBlockedMessage,
      selectedAssignment,
      showMessage,
    ],
  );

  /*
   * =====================================================
   * ATTENDANCE TOTALS
   * =====================================================
   */

  const totalPresent = attendanceRecords.filter(
    (record) => String(record.status).toLowerCase() === "present",
  ).length;

  const totalInside = attendanceRecords.filter(
    (record) =>
      String(record.status).toLowerCase() === "present" &&
      Boolean(record.checked_in_at) &&
      !record.checked_out_at,
  ).length;

  const totalCheckedOut = attendanceRecords.filter(
    (record) =>
      String(record.status).toLowerCase() === "present" &&
      Boolean(record.checked_in_at) &&
      Boolean(record.checked_out_at),
  ).length;

  return {
    municipality,

    eventAssignments,

    selectedEventMunicipalityId,

    selectedAssignment,

    attendanceRecords,

    /*
     * Attendance operation mode
     */
    attendanceMode,
    changeAttendanceMode,

    /*
     * Attendance totals
     */
    totalPresent,
    totalInside,
    totalCheckedOut,

    /*
     * General state
     */
    message,
    loading,
    attendanceLoading,

    /*
     * Check-In
     */
    controlLoading,

    isCheckInOpen,
    wasCheckInOpened,
    wasCheckInClosed,

    canOpenCheckIn,
    canUseCheckInTools,

    openCheckIn,
    closeCheckIn,

    /*
     * Check-Out
     */
    checkOutControlLoading,

    isCheckOutOpen,
    wasCheckOutOpened,
    wasCheckOutClosed,

    canOpenCheckOut,
    canCloseCheckOut,
    canUseCheckOutTools,

    openCheckOut,
    closeCheckOut,

    /*
     * Current mode permissions
     */
    canUseAttendanceTools,

    getAttendanceBlockedMessage,
    getCheckInBlockedMessage,
    getCheckOutBlockedMessage,

    /*
     * Event controls
     */
    selectEvent,
    refreshSelectedEvent,

    /*
     * QR / manual attendance
     */
    processQrToken,

    showMessage,
    clearMessage,
  };
}
