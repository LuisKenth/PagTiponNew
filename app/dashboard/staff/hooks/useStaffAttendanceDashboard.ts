"use client";
import {
  preferredStaffEvent,
  preserveStaffSelection,
  staffEventPriority,
  sortStaffEvents,
} from "../eventSelection";
import { useLiveData } from "@/app/components/live/BackgroundDataSync";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

import {
  formatAttendanceTerms,
  formatDatabaseError,
  formatDateTime,
} from "../utils";

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

/** Track the selection for compatibility; fresh loads always re-evaluate priority. */
function saveSelectedStaffEvent(key: string | null, eventId: string) {
  if (!key) return;
  try {
    if (eventId) {
      window.sessionStorage.setItem(key, eventId);
    } else {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // A browser may block storage; the in-memory selection still works.
  }
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

  // Account-scoped key prevents one staff account from reusing another's event.
  const selectedEventStorageKeyRef = useRef<string | null>(null);
  const selectedIdRef = useRef("");
  const assignmentRequestRef = useRef(0);
  const attendanceRequestRef = useRef(0);
  const [selectionNotice, setSelectionNotice] = useState("");

  // Throttle retries if connectivity is lost when the event ends.
  const autoCloseAttemptAtRef = useRef<Map<string, number>>(new Map());
  // Separate throttling for deadline-triggered automatic Time-out closure.
  const autoCloseCheckOutAttemptAtRef = useRef<Map<string, number>>(new Map());

  const showMessage = useCallback(
    (text: string, tone: DashboardMessage["tone"] = "info") => {
      setMessage({
        text: formatAttendanceTerms(text),
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

  // Field is loaded from event_municipalities; retained via the extended row below.
  // The fallback deadline is exactly two hours after the scheduled event end.
  const checkoutOverride = (
    selectedAssignment as
      (EventAssignment & { check_out_deadline_at?: string | null }) | null
  )?.check_out_deadline_at;
  const checkoutOverrideTime = checkoutOverride
    ? new Date(checkoutOverride).getTime()
    : NaN;
  const checkOutDeadlineTime = Number.isFinite(checkoutOverrideTime)
    ? checkoutOverrideTime
    : eventEndTime !== null && Number.isFinite(eventEndTime)
      ? eventEndTime + 2 * 60 * 60 * 1000
      : null;
  const checkOutDeadlineAt =
    checkOutDeadlineTime === null
      ? null
      : new Date(checkOutDeadlineTime).toISOString();

  const eventStatus = selectedAssignment?.event.status?.toLowerCase() ?? "";

  const isCancelled =
    eventStatus === "cancelled" ||
    selectedAssignment?.municipal_status === "cancelled";

  const isCompleted = eventStatus === "completed";

  const isDraft = eventStatus === "draft";

  // Avoid enabling controls before the client clock is initialized.
  const hasInitializedClock = currentTime > 0;

  // Time-in cannot open or process tokens before the scheduled start.
  const isBeforeEventStart =
    eventStartTime !== null &&
    hasInitializedClock &&
    currentTime < eventStartTime;

  const isBeforeEventEnd = eventEndTime !== null && currentTime < eventEndTime;

  const hasEventEnded = eventEndTime !== null && currentTime >= eventEndTime;

  const isCheckOutExpired = Boolean(
    hasInitializedClock &&
    checkOutDeadlineTime !== null &&
    currentTime >= checkOutDeadlineTime,
  );

  /*
   * =====================================================
   * TIME-IN SESSION STATE
   * =====================================================
   */

  // A session is EFFECTIVELY closed at the scheduled end, even before
  // a background refresh has saved its check_in_closed_at timestamp.
  const isCheckInOpen = Boolean(
    selectedAssignment?.check_in_opened_at &&
    !selectedAssignment?.check_in_closed_at &&
    !hasEventEnded,
  );

  const wasCheckInOpened = Boolean(selectedAssignment?.check_in_opened_at);

  const wasCheckInClosed = Boolean(
    selectedAssignment?.check_in_closed_at ||
    (selectedAssignment?.check_in_opened_at && hasEventEnded),
  );

  /*
   * =====================================================
   * TIME-OUT SESSION STATE
   * =====================================================
   */

  // At the effective deadline the session is closed immediately for ALL UI
  // consumers, even before the background database job writes closed_at.
  // The raw timestamps are still used in the auto-close effect below.
  const isCheckOutOpen = Boolean(
    selectedAssignment?.check_out_opened_at &&
    !selectedAssignment?.check_out_closed_at &&
    !isCheckOutExpired,
  );

  const wasCheckOutOpened = Boolean(selectedAssignment?.check_out_opened_at);

  const wasCheckOutClosed = Boolean(
    selectedAssignment?.check_out_closed_at ||
    (selectedAssignment?.check_out_opened_at && isCheckOutExpired),
  );

  // Reject invalid dates and schedules with an end at/before the start.
  const hasValidSchedule = Boolean(
    eventStartTime !== null &&
    eventEndTime !== null &&
    Number.isFinite(eventStartTime) &&
    Number.isFinite(eventEndTime) &&
    eventEndTime > eventStartTime,
  );

  /*
   * =====================================================
   * TIME-IN PERMISSIONS
   * =====================================================
   *
   * Staff may:
   *
   * - Open Time-in only at or after the scheduled start
   * - Close Time-in
   * - Reopen Time-in for late participants
   *
   * Historical CLOSED Time-out records must not
   * permanently lock Time-in while the event is
   * still ongoing.
   *
   * Time-in and Time-out must never be active
   * at the same time.
   *
   * Once the scheduled event end time is reached,
   * Time-in becomes permanently unavailable.
   */

  const canOpenCheckIn = Boolean(
    selectedAssignment &&
    hasValidSchedule &&
    hasInitializedClock &&
    !isCheckInOpen &&
    !isCancelled &&
    !isCompleted &&
    !isDraft &&
    !isBeforeEventStart &&
    !hasEventEnded &&
    !isCheckOutOpen,
  );

  const canUseCheckInTools = Boolean(
    selectedAssignment &&
    hasValidSchedule &&
    hasInitializedClock &&
    isCheckInOpen &&
    !isCancelled &&
    !isCompleted &&
    !isDraft &&
    !isBeforeEventStart &&
    !hasEventEnded &&
    !isCheckOutOpen,
  );

  /*
   * =====================================================
   * TIME-OUT PERMISSIONS
   * =====================================================
   *
   * Required flow:
   *
   * Open Time-in
   *      ↓
   * Time-in
   *      ↓
   * Close Time-in
   *      ↓
   * May still Reopen Time-in
   *      ↓
   * Close Time-in
   *      ↓
   * Open Time-out
   *      ↓
   * Time-in becomes permanently locked
   *      ↓
   * Time-out
   *      ↓
   * Close Time-out
   */

  const canOpenCheckOut = Boolean(
    selectedAssignment &&
    hasValidSchedule &&
    hasInitializedClock &&
    !isCheckInOpen &&
    !isCancelled &&
    !isDraft &&
    !isBeforeEventEnd &&
    !isCheckOutExpired &&
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
    hasInitializedClock &&
    !isCheckInOpen &&
    isCheckOutOpen &&
    !isCancelled &&
    !isDraft &&
    !isBeforeEventEnd &&
    !isCheckOutExpired,
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
      return "Select an event before using attendance time-in.";
    }

    if (!hasValidSchedule) {
      return "The selected event does not have a valid start and end schedule.";
    }

    if (!hasInitializedClock) {
      return "Attendance session information is initializing. Please try again.";
    }

    if (isCancelled) {
      return "Time-in is unavailable because the selected event was cancelled.";
    }

    if (isDraft) {
      return "Time-in is unavailable because the selected event is still a draft.";
    }

    if (isCompleted) {
      return "Time-in is unavailable because the selected event is completed.";
    }

    /*
     * Once the scheduled event end time is reached,
     * late Time-in is no longer allowed.
     */
    if (hasEventEnded) {
      return "Time-in is permanently closed because the scheduled event end time has been reached.";
    }

    if (isBeforeEventStart) {
      return selectedAssignment.event.start_at
        ? `Time-in will be available when the event starts at ${formatDateTime(selectedAssignment.event.start_at)}.`
        : "Time-in is not available before the event starts.";
    }

    /*
     * Normally impossible under the new rules,
     * but protects against legacy event states.
     *
     * Time-in and Time-out cannot be active
     * at the same time.
     */
    if (isCheckOutOpen) {
      return "Close the active Time-out session before reopening Time-in.";
    }

    /*
     * Closed Time-in may be reopened for
     * late participants until event end.
     */
    if (!isCheckInOpen) {
      return wasCheckInClosed
        ? "Time-in is closed. Event Staff may reopen it for late participants until the event ends."
        : "Open attendance Time-in to begin recording participant Time-in.";
    }

    return "Attendance Time-in tools are currently unavailable.";
  }, [
    hasEventEnded,
    isBeforeEventStart,
    hasInitializedClock,
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
      return "Select an event before using attendance time-out.";
    }

    if (!hasValidSchedule) {
      return "The selected event does not have a valid start and end schedule.";
    }

    if (!hasInitializedClock) {
      return "Attendance session information is initializing. Please try again.";
    }

    if (isCancelled) {
      return "Time-out is unavailable because the selected event was cancelled.";
    }

    if (isDraft) {
      return "Time-out is unavailable because the selected event is still a draft.";
    }

    /*
     * Time-out must wait until the scheduled
     * event end time has been reached.
     */
    if (isBeforeEventEnd) {
      return selectedAssignment.event.end_at
        ? `Time-out will become available when the event ends at ${formatDateTime(
            selectedAssignment.event.end_at,
          )}.`
        : "Time-out will become available after the event has ended.";
    }

    if (isCheckOutExpired) {
      return checkOutDeadlineAt
        ? `Time-out window expired at ${formatDateTime(checkOutDeadlineAt)}. Contact the Municipal Admin to request an extension.`
        : "The Time-out window has expired. Contact the Municipal Admin.";
    }

    if (!wasCheckInOpened) {
      return "Open attendance Time-in before using Time-out.";
    }

    if (!wasCheckInClosed) {
      return "Close attendance Time-in before opening Time-out.";
    }

    if (isCheckOutOpen) {
      return "Attendance Time-out is currently open.";
    }

    if (wasCheckOutClosed) {
      return "Time-out is closed. Event Staff may reopen it to continue recording participant Time-out.";
    }

    return "Open attendance Time-out to begin recording participant Time-out.";
  }, [
    hasInitializedClock,
    hasValidSchedule,
    isBeforeEventEnd,
    isCheckOutExpired,
    checkOutDeadlineAt,
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
            local_venue_id,
            local_instructions,
            municipal_status,

            check_in_opened_at,
            check_in_closed_at,
            check_in_opened_by,
            check_in_closed_by,

            check_out_opened_at,
            check_out_closed_at,
            check_out_deadline_at,
            check_out_opened_by,
            check_out_closed_by,

            events (
              id,
              title,
              description,
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

      // Resolve venue names separately to avoid depending on an
      // embedded PostgREST relationship between the two tables.
      // Event Staff only receives the names needed to display details.
      const assignmentRows = (data ?? []) as RawEventAssignment[];
      const venueIds = Array.from(
        new Set(
          assignmentRows
            .map((row) => String(row.local_venue_id ?? "").trim())
            .filter((id) => id.length > 0),
        ),
      );

      const venueNameById = new Map<string, string>();
      if (venueIds.length > 0) {
        const { data: venueRows, error: venueError } = await supabase
          .from("venues")
          .select("id, venue_name")
          .in("id", venueIds);

        if (venueError) {
          // Some RLS configurations limit venue reads for Event Staff.
          // Do not block attendance operations if venue lookup fails.
          console.warn(
            "Unable to load assigned venue names:",
            venueError.message,
          );
        } else {
          for (const venue of venueRows ?? []) {
            venueNameById.set(String(venue.id), venue.venue_name ?? "");
          }
        }
      }

      const normalizedAssignments = assignmentRows
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
            municipal_status: assignment.municipal_status ?? null,
            local_venue_id: assignment.local_venue_id ?? null,
            local_instructions: assignment.local_instructions ?? null,
            venue_name:
              assignment.local_venue_id != null
                ? (venueNameById.get(String(assignment.local_venue_id)) ?? null)
                : null,

            check_in_opened_at: assignment.check_in_opened_at,

            check_in_closed_at: assignment.check_in_closed_at,

            check_in_opened_by: assignment.check_in_opened_by,

            check_in_closed_by: assignment.check_in_closed_by,

            check_out_opened_at: assignment.check_out_opened_at,

            check_out_closed_at: assignment.check_out_closed_at,

            check_out_opened_by: assignment.check_out_opened_by,

            check_out_closed_by: assignment.check_out_closed_by,

            // Spread allows a schema extension without changing shared types.ts.
            ...{
              check_out_deadline_at:
                (
                  assignment as RawEventAssignment & {
                    check_out_deadline_at?: string | null;
                  }
                ).check_out_deadline_at ?? null,
            },

            event: eventDetails,
          } satisfies EventAssignment;
        })
        .filter((assignment) => assignment !== null);

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

      return sortStaffEvents(normalizedAssignments, Date.now());
    },
    [],
  );

  /*
   * =====================================================
   * ATTENDANCE RECORDS
   * =====================================================
   */

  const fetchAttendanceRecords = useCallback(
    async (eventMunicipalityId: DatabaseId | "", silent = false) => {
      if (
        eventMunicipalityId &&
        String(eventMunicipalityId) !== selectedIdRef.current
      )
        return;
      const ticket = ++attendanceRequestRef.current;
      const stillCurrent = () =>
        ticket === attendanceRequestRef.current &&
        String(eventMunicipalityId) === selectedIdRef.current;
      const writeRecords = (rows: AttendanceRecord[]) => {
        if (stillCurrent()) setAttendanceRecords(rows);
      };
      if (!eventMunicipalityId) {
        writeRecords([]);
        return;
      }

      if (!silent) setAttendanceLoading(true);

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
          writeRecords([]);

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
          writeRecords(
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

          writeRecords(
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

        writeRecords(enrichedAttendanceRecords);
      } catch (error) {
        const errorValue = error as SupabaseErrorLike;

        console.error(
          errorValue.message ?? "Unable to load attendance records.",
        );

        if (!silent && stillCurrent()) {
          writeRecords([]);
          showMessage(formatDatabaseError(errorValue), "error");
        }
      } finally {
        if (stillCurrent()) setAttendanceLoading(false);
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
    async (_preferredAssignmentId?: DatabaseId) => {
      if (!municipality) {
        return null;
      }

      const ticket = ++assignmentRequestRef.current;
      const assignments = await loadEventAssignments(municipality);
      if (ticket !== assignmentRequestRef.current) return undefined;
      setEventAssignments(assignments);
      // Never replace the staff's current event during a refresh or scan.
      const currentId = selectedIdRef.current;
      const preferredAssignment = preserveStaffSelection(
        assignments,
        currentId,
      );
      if (currentId && !preferredAssignment) {
        selectedIdRef.current = "";
        attendanceRequestRef.current++;
        setSelectedEventMunicipalityId("");
        setAttendanceRecords([]);
        setAttendanceLoading(false);
        setAttendanceMode("check_in");
        saveSelectedStaffEvent(selectedEventStorageKeyRef.current, "");
        setSelectionNotice(
          "The selected event is no longer assigned to you. Attendance tools have stopped. Choose another assigned event.",
        );
      }
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

  useLiveData({
    onUpdate: async () => {
      const assignment = await refreshEventAssignments(selectedAssignment?.id);
      if (assignment) await fetchAttendanceRecords(assignment.id, true);
      else if (assignment === null) setAttendanceRecords([]);
    },
    disabled:
      loading ||
      attendanceLoading ||
      controlLoading !== null ||
      checkOutControlLoading !== null,
    intervalMs: 15_000,
    pauseWhileEditing: false,
  });

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

      const storageKey = `pagtipon:staff:selected-event:${user.id}`;
      selectedEventStorageKeyRef.current = storageKey;

      const assignments = await loadEventAssignments(profile.municipality);
      setEventAssignments(assignments);

      // Re-evaluate operational priority on every fresh portal load. Never
      // restore an obsolete completed event just because it is in storage.
      const initialAssignment = preferredStaffEvent(assignments, Date.now());
      const initialId = initialAssignment ? String(initialAssignment.id) : "";
      selectedIdRef.current = initialId;
      setSelectionNotice("");
      setSelectedEventMunicipalityId(initialId);
      saveSelectedStaffEvent(storageKey, initialId);

      if (initialAssignment) {
        await fetchAttendanceRecords(initialAssignment.id);
      } else {
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
   * AUTOMATIC TIME-IN CLOSE ON EVENT END
   * =====================================================
   * The server already rejects Time-in at/after event.end_at.
   * This saves the closed timestamp while a staff session is online.
   * The Open Time-out RPC migration also finalizes a still-open
   * Time-in atomically, so no manual Close is required even after
   * reloading the portal or when no staff had the page open.
   */
  useEffect(() => {
    if (
      !hasInitializedClock ||
      !hasEventEnded ||
      !selectedAssignment?.check_in_opened_at ||
      selectedAssignment.check_in_closed_at
    ) {
      return;
    }

    const assignmentId = String(selectedAssignment.id);
    const previousAttempt =
      autoCloseAttemptAtRef.current.get(assignmentId) ?? 0;

    if (Date.now() - previousAttempt < 30_000) {
      return;
    }

    autoCloseAttemptAtRef.current.set(assignmentId, Date.now());

    void (async () => {
      try {
        const { data, error } = await supabase.rpc("close_event_check_in", {
          p_event_municipality_id: assignmentId,
        });

        if (error) throw error;

        const result = getRpcRow<
          CheckInRpcResult & { closed_at?: string | null }
        >(data);

        if (!result || result.success === false) {
          throw new Error(
            result?.message || "Unable to automatically close Time-in.",
          );
        }

        // Update just this event; do not unexpectedly change the
        // Event Staff's selected event if they switched screens.
        const closedAt = result.closed_at ?? new Date().toISOString();
        setEventAssignments((current) =>
          current.map((assignment) =>
            String(assignment.id) === assignmentId
              ? { ...assignment, check_in_closed_at: closedAt }
              : assignment,
          ),
        );
      } catch (error) {
        console.error("Automatic Time-in closure failed:", error);
        // Will retry, at most once every 30 seconds, while this page
        // is mounted and the event is still stored as open.
      }
    })();
  }, [currentTime, hasEventEnded, hasInitializedClock, selectedAssignment]);

  /*
   * =====================================================
   * KEEP EXPIRED TIME-OUT STATUS IN SYNC WITH THE DATABASE
   * =====================================================
   * The UI becomes Closed at the effective deadline, even if the browser
   * has not yet received the persisted closed_at timestamp. The pg_cron
   * migration writes that timestamp while the browser is offline.
   *
   * DO NOT call close_event_check_out() from this effect: an Event Staff
   * tab could have an outdated deadline after a Municipal Admin extension.
   * That RPC permits manual closure; using it with a stale deadline would
   * accidentally close a valid extended session. Instead, read the latest
   * server values every 30 seconds until the status is settled.
   */
  useEffect(() => {
    if (
      !hasInitializedClock ||
      !isCheckOutExpired ||
      !selectedAssignment?.check_out_opened_at ||
      selectedAssignment.check_out_closed_at
    ) {
      return;
    }

    const assignmentId = String(selectedAssignment.id);
    const lastAttempt =
      autoCloseCheckOutAttemptAtRef.current.get(assignmentId) ?? 0;
    if (Date.now() - lastAttempt < 30_000) {
      return;
    }
    autoCloseCheckOutAttemptAtRef.current.set(assignmentId, Date.now());

    void (async () => {
      const { data, error } = await supabase
        .from("event_municipalities")
        .select("id, check_out_closed_at, check_out_deadline_at")
        .eq("id", assignmentId)
        .maybeSingle();

      if (error) {
        console.warn(
          "Could not refresh expired Time-out status:",
          error.message,
        );
        return;
      }
      if (!data) return;

      setEventAssignments((current) =>
        current.map((assignment) =>
          String(assignment.id) === assignmentId
            ? {
                ...assignment,
                check_out_closed_at: data.check_out_closed_at ?? null,
                check_out_deadline_at: data.check_out_deadline_at ?? null,
              }
            : assignment,
        ),
      );
    })();
  }, [currentTime, hasInitializedClock, isCheckOutExpired, selectedAssignment]);

  /*
   * =====================================================
   * SELECT EVENT
   * =====================================================
   */

  const selectEvent = useCallback(
    async (eventMunicipalityId: string) => {
      // The user may only select an event in their active assignments.
      const nextAssignment = eventAssignments.find(
        (assignment) => String(assignment.id) === String(eventMunicipalityId),
      );
      if (!nextAssignment) {
        showMessage(
          "This event is no longer assigned to you. Refresh and try again.",
          "error",
        );
        return;
      }

      const nextId = String(nextAssignment.id);
      assignmentRequestRef.current++;
      attendanceRequestRef.current++;
      selectedIdRef.current = nextId;
      setSelectionNotice("");
      setAttendanceRecords([]);
      setSelectedEventMunicipalityId(nextId);
      saveSelectedStaffEvent(selectedEventStorageKeyRef.current, nextId);

      /* Reset to Time-in when changing event. */
      setAttendanceMode("check_in");
      setMessage(null);

      await fetchAttendanceRecords(nextAssignment.id);
    },
    [eventAssignments, fetchAttendanceRecords, showMessage],
  );

  // Called on entry to Event Control, not on background updates. No RPCs
  // are invoked here: selecting an event never opens a session.
  const prepareEventControl = useCallback(async () => {
    if (!municipality) return;
    const ticket = ++assignmentRequestRef.current;
    try {
      const assignments = await loadEventAssignments(municipality);
      if (ticket !== assignmentRequestRef.current) return;
      const next = preferredStaffEvent(assignments, Date.now());
      const nextId = next ? String(next.id) : "";
      setEventAssignments(assignments);
      selectedIdRef.current = nextId;
      attendanceRequestRef.current++;
      setSelectedEventMunicipalityId(nextId);
      setAttendanceRecords([]);
      setAttendanceLoading(false);
      setAttendanceMode("check_in");
      setMessage(null);
      setSelectionNotice("");
      saveSelectedStaffEvent(selectedEventStorageKeyRef.current, nextId);
      if (next) await fetchAttendanceRecords(next.id);
    } catch (error) {
      setSelectionNotice(
        "Unable to verify the latest assignments. Choose an event after the connection is restored.",
      );
      showMessage(formatDatabaseError(error as SupabaseErrorLike), "error");
    }
  }, [municipality, loadEventAssignments, fetchAttendanceRecords, showMessage]);

  /*
   * =====================================================
   * OPEN / REOPEN TIME-IN
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
        console.error("Open time-in RPC error:", error);

        showMessage(formatDatabaseError(error), "error");

        return;
      }

      const result = getRpcRow<CheckInRpcResult>(data);

      if (!result) {
        showMessage("The time-in request returned no result.", "error");

        return;
      }

      if (result.success === false) {
        showMessage(
          result.message || "Unable to open attendance time-in.",
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
          ? "Attendance time-in is already open."
          : result.message ||
              "Attendance time-in is now open. QR scanning and manual attendance codes are enabled.",
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
   * CLOSE TIME-IN
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
        console.error("Close time-in RPC error:", error);

        showMessage(formatDatabaseError(error), "error");

        return;
      }

      const result = getRpcRow<CheckInRpcResult>(data);

      if (!result) {
        showMessage("The close time-in request returned no result.", "error");

        return;
      }

      if (result.success === false) {
        showMessage(
          result.message || "Unable to close attendance time-in.",
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
          ? "Attendance time-in is already closed."
          : result.message ||
              "Attendance time-in has been closed. New Time-in entries are blocked.",
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
   * OPEN TIME-OUT
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
        console.error("Open time-out RPC error:", error);

        showMessage(formatDatabaseError(error), "error");

        return;
      }

      const result = getRpcRow<CheckOutRpcResult>(data);

      if (!result) {
        showMessage("The time-out request returned no result.", "error");

        return;
      }

      if (!result.success) {
        showMessage(
          result.message || "Unable to open attendance time-out.",
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
          ? "Attendance time-out is already open."
          : result.message ||
              "Attendance time-out is now open. QR scanning and manual attendance codes can now record Time-out.",
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
   * CLOSE TIME-OUT
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
        console.error("Close time-out RPC error:", error);

        showMessage(formatDatabaseError(error), "error");

        return;
      }

      const result = getRpcRow<CheckOutRpcResult>(data);

      if (!result) {
        showMessage("The close time-out request returned no result.", "error");

        return;
      }

      if (!result.success) {
        showMessage(
          result.message || "Unable to close attendance time-out.",
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
          ? "Attendance time-out is already closed."
          : result.message ||
              "Attendance time-out has been closed. New Time-out entries are blocked.",
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
       * TIME-IN
       * =================================================
       */

      if (attendanceMode === "check_in") {
        showMessage(
          attendanceMethod === "qr"
            ? "Checking participant QR code for Time-in..."
            : "Checking participant attendance code for Time-in...",
          "info",
        );

        const { data, error } = await supabase.rpc("process_attendance_token", {
          p_event_municipality_id: selectedAssignment.id,

          p_token: cleanedToken,

          p_method: attendanceMethod,
        });

        if (error) {
          console.error("Attendance time-in RPC error:", error);

          showMessage(formatDatabaseError(error), "error");

          return false;
        }

        const result = getRpcRow<AttendanceCheckInTokenResult>(data);

        if (!result) {
          showMessage(
            "The Time-in request returned no result. Please try again.",
            "error",
          );

          return false;
        }

        const participantName =
          result.participant_name?.trim() || "Participant";

        if (
          result.already_checked_in ||
          result.result_code === "already_checked_in"
        ) {
          const checkedInTime = result.attendance_checked_in_at
            ? formatDateTime(result.attendance_checked_in_at)
            : null;

          showMessage(
            checkedInTime
              ? `${participantName} was already completed Time-in at ${checkedInTime}.`
              : `${participantName} already has a Time-in record.`,
            "info",
          );

          await fetchAttendanceRecords(selectedAssignment.id);

          return false;
        }

        // Some RPCs return success=false for duplicate scans.
        // Handle duplicates before the generic failure branch.
        if (!result.success) {
          showMessage(
            result.result_message || "Unable to record participant Time-in.",
            "error",
          );

          return false;
        }

        const checkedInTime = result.attendance_checked_in_at
          ? formatDateTime(result.attendance_checked_in_at)
          : null;

        showMessage(
          checkedInTime
            ? `${participantName} completed Time-in successfully at ${checkedInTime}.`
            : `${participantName} completed Time-in successfully.`,
          "success",
        );

        await fetchAttendanceRecords(selectedAssignment.id);

        return true;
      }

      /*
       * =================================================
       * TIME-OUT
       * =================================================
       */

      showMessage(
        attendanceMethod === "qr"
          ? "Checking participant QR code for Time-out..."
          : "Checking participant attendance code for Time-out...",
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
        console.error("Attendance time-out RPC error:", error);

        showMessage(formatDatabaseError(error), "error");

        return false;
      }

      const result = getRpcRow<AttendanceCheckOutTokenResult>(data);

      if (!result) {
        showMessage(
          "The Time-out request returned no result. Please try again.",
          "error",
        );

        return false;
      }

      const participantName = result.participant_name?.trim() || "Participant";

      if (
        result.already_checked_out ||
        result.result_code === "already_checked_out"
      ) {
        const checkedOutTime = result.attendance_checked_out_at
          ? formatDateTime(result.attendance_checked_out_at)
          : null;

        showMessage(
          checkedOutTime
            ? `${participantName} was already completed Time-out at ${checkedOutTime}.`
            : `${participantName} already has a Time-out record.`,
          "info",
        );

        await fetchAttendanceRecords(selectedAssignment.id);

        return false;
      }

      // Report a duplicate even if the RPC marks it unsuccessful.
      if (!result.success) {
        showMessage(
          result.result_message || "Unable to record participant Time-out.",
          "error",
        );

        await fetchAttendanceRecords(selectedAssignment.id);

        return false;
      }

      const checkedOutTime = result.attendance_checked_out_at
        ? formatDateTime(result.attendance_checked_out_at)
        : null;

      showMessage(
        checkedOutTime
          ? `${participantName} completed Time-out successfully at ${checkedOutTime}.`
          : `${participantName} completed Time-out successfully.`,
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

  const totalPresent = attendanceRecords.filter((record) => {
    const status = String(record.status).toLowerCase();

    return (
      (status === "present" || status === "late") &&
      Boolean(record.checked_in_at)
    );
  }).length;

  const totalInside = attendanceRecords.filter((record) => {
    const status = String(record.status).toLowerCase();
    return (
      (status === "present" || status === "late") &&
      Boolean(record.checked_in_at) &&
      !record.checked_out_at
    );
  }).length;

  const totalCheckedOut = attendanceRecords.filter((record) => {
    const status = String(record.status).toLowerCase();
    return (
      (status === "present" || status === "late") &&
      Boolean(record.checked_in_at) &&
      Boolean(record.checked_out_at)
    );
  }).length;

  return {
    municipality,

    eventAssignments,

    selectedEventMunicipalityId,

    selectedAssignment,
    prepareEventControl,
    selectionNotice,
    recommendedAssignment: preferredStaffEvent(eventAssignments, currentTime),
    selectedEventIsReferenceOnly: Boolean(
      selectedAssignment &&
      currentTime > 0 &&
      staffEventPriority(selectedAssignment, currentTime) === null,
    ),

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
     * Time-in
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
     * Time-out
     */
    checkOutControlLoading,

    isCheckOutOpen,
    wasCheckOutOpened,
    wasCheckOutClosed,

    canOpenCheckOut,
    canCloseCheckOut,
    canUseCheckOutTools,
    checkOutDeadlineAt,
    isCheckOutExpired,

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
