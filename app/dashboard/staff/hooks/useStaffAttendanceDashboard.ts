"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  AttendanceMethod,
  AttendanceRecord,
  CheckInRpcResult,
  DashboardMessage,
  DatabaseId,
  EventAssignment,
  RawEventAssignment,
  RSVP,
  SupabaseErrorLike,
} from "../types";
import { formatDatabaseError, formatDateTime } from "../utils";

export function useStaffAttendanceDashboard() {
  const [staffId, setStaffId] = useState("");
  const [municipality, setMunicipality] = useState("");

  const [eventAssignments, setEventAssignments] = useState<EventAssignment[]>(
    []
  );
  const [selectedEventMunicipalityId, setSelectedEventMunicipalityId] =
    useState("");

  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [message, setMessage] = useState<DashboardMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [controlLoading, setControlLoading] = useState<
    "open" | "close" | null
  >(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const showMessage = useCallback(
    (text: string, tone: DashboardMessage["tone"] = "info") => {
      setMessage({ text, tone });
    },
    []
  );

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const selectedAssignment = useMemo(() => {
    return (
      eventAssignments.find(
        (assignment) =>
          String(assignment.id) === selectedEventMunicipalityId
      ) ?? null
    );
  }, [eventAssignments, selectedEventMunicipalityId]);

  const eventStartTime = selectedAssignment?.event.start_at
    ? new Date(selectedAssignment.event.start_at).getTime()
    : null;

  const eventEndTime = selectedAssignment?.event.end_at
    ? new Date(selectedAssignment.event.end_at).getTime()
    : null;

  const earliestOpeningTime =
    eventStartTime !== null ? eventStartTime - 30 * 60 * 1000 : null;

  const eventStatus = selectedAssignment?.event.status?.toLowerCase() ?? "";
  const isCancelled = eventStatus === "cancelled";
  const isCompleted = eventStatus === "completed";

  const isBeforeOpeningWindow =
    earliestOpeningTime !== null && currentTime < earliestOpeningTime;

  const isAfterEventEnd =
    eventEndTime !== null && currentTime > eventEndTime;

  const isCheckInOpen = Boolean(
    selectedAssignment?.check_in_opened_at &&
    !selectedAssignment?.check_in_closed_at
  );

  const wasCheckInOpened = Boolean(selectedAssignment?.check_in_opened_at);
  const wasCheckInClosed = Boolean(selectedAssignment?.check_in_closed_at);

  const hasValidSchedule = Boolean(
    eventStartTime !== null && eventEndTime !== null
  );

  const canOpenCheckIn = Boolean(
    selectedAssignment &&
    hasValidSchedule &&
    !isCheckInOpen &&
    !isCancelled &&
    !isCompleted &&
    !isBeforeOpeningWindow &&
    !isAfterEventEnd
  );

  const canUseAttendanceTools = Boolean(
    selectedAssignment &&
    hasValidSchedule &&
    isCheckInOpen &&
    !isCancelled &&
    !isCompleted &&
    !isBeforeOpeningWindow &&
    !isAfterEventEnd
  );

  const getAttendanceBlockedMessage = useCallback(() => {
    if (!selectedAssignment) {
      return "Select an event before using attendance tools.";
    }

    if (!hasValidSchedule) {
      return "The selected event does not have a valid start and end schedule.";
    }

    if (isCancelled) {
      return "Attendance is unavailable because the selected event was cancelled.";
    }

    if (isCompleted) {
      return "Attendance is unavailable because the selected event is completed.";
    }

    if (isBeforeOpeningWindow) {
      return `Check-in may be opened beginning ${formatDateTime(
        earliestOpeningTime
          ? new Date(earliestOpeningTime).toISOString()
          : null
      )}.`;
    }

    if (isAfterEventEnd) {
      return "The attendance window has already ended.";
    }

    if (!isCheckInOpen) {
      return "Open attendance check-in before scanning participant QR codes.";
    }

    return "Attendance tools are currently unavailable.";
  }, [
    earliestOpeningTime,
    hasValidSchedule,
    isAfterEventEnd,
    isBeforeOpeningWindow,
    isCancelled,
    isCheckInOpen,
    isCompleted,
    selectedAssignment,
  ]);

  const loadEventAssignments = useCallback(
    async (staffMunicipality: string): Promise<EventAssignment[]> => {
      const { data, error } = await supabase
        .from("event_municipalities")
        .select(`
          id,
          event_id,
          municipality,
          check_in_opened_at,
          check_in_closed_at,
          check_in_opened_by,
          check_in_closed_by,
          events (
            id,
            title,
            status,
            start_at,
            end_at
          )
        `)
        .eq("municipality", staffMunicipality);

      if (error) throw error;

      const normalizedAssignments = ((data ?? []) as RawEventAssignment[])
        .map((assignment) => {
          const eventDetails = Array.isArray(assignment.events)
            ? assignment.events[0]
            : assignment.events;

          if (!eventDetails) return null;

          return {
            id: assignment.id,
            event_id: assignment.event_id,
            municipality: assignment.municipality,
            check_in_opened_at: assignment.check_in_opened_at,
            check_in_closed_at: assignment.check_in_closed_at,
            check_in_opened_by: assignment.check_in_opened_by,
            check_in_closed_by: assignment.check_in_closed_by,
            event: eventDetails,
          } satisfies EventAssignment;
        })
        .filter(
          (assignment): assignment is EventAssignment => assignment !== null
        );

      normalizedAssignments.sort((first, second) => {
        const firstIsOpen =
          first.check_in_opened_at && !first.check_in_closed_at;
        const secondIsOpen =
          second.check_in_opened_at && !second.check_in_closed_at;

        if (firstIsOpen && !secondIsOpen) return -1;
        if (!firstIsOpen && secondIsOpen) return 1;

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
    []
  );

  const fetchAttendanceRecords = useCallback(
    async (eventMunicipalityId: DatabaseId | "") => {
      if (!eventMunicipalityId) {
        setAttendanceRecords([]);
        return;
      }

      setAttendanceLoading(true);

      const { data, error } = await supabase
        .from("attendance")
        .select(
          "id, rsvp_id, event_municipality_id, user_id, status, method, checked_in_at, checked_in_by"
        )
        .eq("event_municipality_id", eventMunicipalityId)
        .order("checked_in_at", { ascending: false });

      if (error) {
        console.error(error.message);
        setAttendanceRecords([]);
        showMessage(formatDatabaseError(error), "error");
        setAttendanceLoading(false);
        return;
      }

      setAttendanceRecords(data || []);
      setAttendanceLoading(false);
    },
    [showMessage]
  );

  const refreshEventAssignments = useCallback(
    async (preferredAssignmentId?: DatabaseId) => {
      if (!municipality) return null;

      const assignments = await loadEventAssignments(municipality);
      setEventAssignments(assignments);

      const preferredAssignment =
        assignments.find(
          (assignment) =>
            String(assignment.id) ===
            String(preferredAssignmentId ?? selectedEventMunicipalityId)
        ) ??
        assignments[0] ??
        null;

      setSelectedEventMunicipalityId(
        preferredAssignment ? String(preferredAssignment.id) : ""
      );

      return preferredAssignment;
    }, [
    loadEventAssignments,
    municipality,
    selectedEventMunicipalityId,
  ]
  );

  const refreshSelectedEvent = useCallback(async () => {
    if (!selectedAssignment) return;

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

      setStaffId(user.id);

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
    fetchStaffData();
  }, [fetchStaffData]);

  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(clockInterval);
  }, []);

  const selectEvent = useCallback(
    async (eventMunicipalityId: string) => {
      setSelectedEventMunicipalityId(eventMunicipalityId);
      setMessage(null);
      await fetchAttendanceRecords(eventMunicipalityId);
    },
    [fetchAttendanceRecords]
  );

  const openCheckIn = useCallback(async () => {
    if (!selectedAssignment) {
      showMessage("Select an event first.", "error");
      return;
    }

    if (!canOpenCheckIn) {
      showMessage(getAttendanceBlockedMessage(), "error");
      return;
    }

    setControlLoading("open");

    try {
      const { data, error } = await supabase.rpc("open_event_check_in", {
        p_event_municipality_id: selectedAssignment.id,
      });

      if (error) {
        showMessage(formatDatabaseError(error), "error");
        return;
      }

      const result = data as CheckInRpcResult | null;
      const refreshedAssignment = await refreshEventAssignments(
        selectedAssignment.id
      );

      if (refreshedAssignment) {
        await fetchAttendanceRecords(refreshedAssignment.id);
      }

      showMessage(
        result?.already_open
          ? "Attendance check-in is already open."
          : "Attendance check-in is now open. QR scanning and manual token entry are enabled.",
        "success"
      );
    } finally {
      setControlLoading(null);
    }
  }, [
    canOpenCheckIn,
    fetchAttendanceRecords,
    getAttendanceBlockedMessage,
    refreshEventAssignments,
    selectedAssignment,
    showMessage,
  ]);

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
        showMessage(formatDatabaseError(error), "error");
        return;
      }

      const result = data as CheckInRpcResult | null;
      const refreshedAssignment = await refreshEventAssignments(
        selectedAssignment.id
      );

      if (refreshedAssignment) {
        await fetchAttendanceRecords(refreshedAssignment.id);
      }

      showMessage(
        result?.already_closed
          ? "Attendance check-in is already closed."
          : "Attendance check-in has been closed. New scans are now blocked.",
        "success"
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

  const processQrToken = useCallback(
    async (
      qrToken: string,
      attendanceMethod: AttendanceMethod = "qr"
    ) => {
      if (!selectedAssignment) {
        showMessage("Select an event first.", "error");
        return false;
      }

      if (!canUseAttendanceTools) {
        showMessage(getAttendanceBlockedMessage(), "error");
        return false;
      }

      showMessage("Checking participant QR code...", "info");

      const { data: rsvp, error: rsvpError } = await supabase
        .from("rsvps")
        .select(
          "id, event_municipality_id, user_id, municipality, qr_token, status, registered_at"
        )
        .eq("qr_token", qrToken)
        .eq("status", "registered")
        .single();

      if (rsvpError || !rsvp) {
        showMessage(
          "Invalid QR code or the participant is not registered.",
          "error"
        );
        return false;
      }

      const typedRsvp = rsvp as RSVP;

      if (
        String(typedRsvp.event_municipality_id) !==
        String(selectedAssignment.id)
      ) {
        showMessage("This QR code belongs to a different event.", "error");
        return false;
      }

      if (typedRsvp.municipality !== municipality) {
        showMessage(
          "This QR code is not assigned to your municipality.",
          "error"
        );
        return false;
      }

      const { data: existingAttendance, error: existingError } =
        await supabase
          .from("attendance")
          .select(
            "id, rsvp_id, event_municipality_id, user_id, status, method, checked_in_at, checked_in_by"
          )
          .eq("rsvp_id", typedRsvp.id)
          .maybeSingle();

      if (existingError) {
        showMessage(formatDatabaseError(existingError), "error");
        return false;
      }

      if (existingAttendance) {
        if (existingAttendance.status === "present") {
          showMessage("Participant is already marked as present.", "info");
          return false;
        }

        // checked_in_at is omitted intentionally. The database trigger
        // writes the trusted database time.
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            status: "present",
            method: attendanceMethod,
            checked_in_by: staffId,
          })
          .eq("id", existingAttendance.id);

        if (updateError) {
          showMessage(formatDatabaseError(updateError), "error");
          return false;
        }

        showMessage(
          "Attendance updated. Participant is now present.",
          "success"
        );
        await fetchAttendanceRecords(selectedAssignment.id);
        return true;
      }

      // checked_in_at is omitted intentionally. The database trigger
      // writes the trusted database time.
      const { error: insertError } = await supabase
        .from("attendance")
        .insert({
          rsvp_id: typedRsvp.id,
          event_municipality_id: typedRsvp.event_municipality_id,
          user_id: typedRsvp.user_id,
          status: "present",
          method: attendanceMethod,
          checked_in_by: staffId,
        });

      if (insertError) {
        showMessage(formatDatabaseError(insertError), "error");
        return false;
      }

      showMessage(
        "Attendance recorded successfully. Participant is present.",
        "success"
      );
      await fetchAttendanceRecords(selectedAssignment.id);
      return true;
    },
    [
      canUseAttendanceTools,
      fetchAttendanceRecords,
      getAttendanceBlockedMessage,
      municipality,
      selectedAssignment,
      showMessage,
      staffId,
    ]
  );

  const totalPresent = attendanceRecords.filter(
    (record) => record.status === "present"
  ).length;

  return {
    municipality,
    eventAssignments,
    selectedEventMunicipalityId,
    selectedAssignment,
    attendanceRecords,
    totalPresent,
    message,
    loading,
    attendanceLoading,
    controlLoading,
    earliestOpeningTime,
    isCheckInOpen,
    wasCheckInOpened,
    wasCheckInClosed,
    canOpenCheckIn,
    canUseAttendanceTools,
    getAttendanceBlockedMessage,
    selectEvent,
    openCheckIn,
    closeCheckIn,
    refreshSelectedEvent,
    processQrToken,
    showMessage,
    clearMessage,
  };
}
