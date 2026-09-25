"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { MunicipalDeliveryToastData } from "../components/MunicipalDeliveryToast";

import type {
  EventRow,
  MunicipalVenue,
  PreparationStatus,
  ReceivedEvent,
} from "../types/municipalDashboard";

import {
  getMunicipalDashboardSummary,
  getPreparationStatusLabel,
  normalizePreparationStatus,
} from "../utils/municipalDashboardUtils";

type TargetRow = {
  id: string;
  event_id: string;
  municipality: string | null;
  municipal_status: string | null;
  local_venue_id: string | null;
  registration_open: boolean | null;
  local_instructions: string | null;
  created_at: string | null;
};

type LatestAssignmentRow = {
  id: string;
  event_id: string;
  municipal_status: string | null;
  registration_open: boolean | null;
  local_venue_id: string | null;
  local_instructions: string | null;
};

type LatestEventStatusRow = {
  id: string;
  status: string | null;
};

type RegisteredRsvpRow = {
  event_municipality_id: string | null;
};

type VenueRow = {
  id: string;
  venue_name: string | null;
  municipality: string | null;
  capacity: number | null;
  status: string | null;
};

type ParticipantEmailNotificationType =
  | "registration_open"
  | "local_instructions_updated"
  | "venue_updated";

type ParticipantEmailResult = {
  message?: string;
  notificationType?: ParticipantEmailNotificationType;
  notificationKey?: string;
  eventMunicipalityId?: string;
  eventId?: string;
  eventTitle?: string;
  municipality?: string;
  totalRecipients?: number;
  attempted?: number;
  sent?: number;
  skippedAlreadySent?: number;
  skippedInProgress?: number;
  failed?: string[];
  error?: string;
};

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeMunicipality(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeInstructionText(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function isVenueActiveStatus(value: string | null | undefined) {
  return normalizeStatus(value) === "active";
}

type PreparationLockStatus = "ongoing" | "completed" | "cancelled";

function getPreparationLockStatus(
  item: ReceivedEvent | null,
): PreparationLockStatus | null {
  if (!item) {
    return null;
  }

  const municipalStatus = normalizeStatus(item.municipal_status);

  const provincialStatus = normalizeStatus(item.event?.status);

  /*
   * Cancellation takes priority because an
   * assignment itself may also be cancelled.
   */
  if (municipalStatus === "cancelled" || provincialStatus === "cancelled") {
    return "cancelled";
  }

  if (provincialStatus === "completed") {
    return "completed";
  }

  if (provincialStatus === "ongoing") {
    return "ongoing";
  }

  return null;
}

function getPreparationLockMessage(status: PreparationLockStatus) {
  switch (status) {
    case "ongoing":
      return (
        "This event is already ongoing. " +
        "Municipal preparation and participant " +
        "registration are now read-only."
      );

    case "completed":
      return (
        "This event has already been completed. " +
        "Municipal preparation and participant " +
        "registration can no longer be changed."
      );

    case "cancelled":
      return (
        "This event has been cancelled. " +
        "Municipal preparation and participant " +
        "registration can no longer be changed."
      );
  }
}

function isVenueScheduleConflictError(message: string | null | undefined) {
  return normalizeStatus(message).includes("venue schedule conflict");
}

function isVenueUnavailableError(message: string | null | undefined) {
  const normalized = normalizeStatus(message);

  return (
    normalized.includes("venue unavailable") ||
    normalized.includes("cannot be assigned to an event")
  );
}

export default function useMunicipalDashboard() {
  const [municipality, setMunicipality] = useState("");

  const [receivedEvents, setReceivedEvents] = useState<ReceivedEvent[]>([]);

  const [venues, setVenues] = useState<MunicipalVenue[]>([]);

  const [venuesLoading, setVenuesLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<ReceivedEvent | null>(
    null,
  );

  const [selectedVenueId, setSelectedVenueId] = useState("");

  const [venueError, setVenueError] = useState<string | null>(null);

  const [localInstructions, setLocalInstructions] = useState("");

  const [registrationOpen, setRegistrationOpen] = useState(false);

  const [savingPreparation, setSavingPreparation] = useState(false);
  const [deliveryToast, setDeliveryToast] =
    useState<MunicipalDeliveryToastData | null>(null);

  const dismissDeliveryToast = useCallback(() => {
    setDeliveryToast(null);
  }, []);

  const [preparationStatus, setPreparationStatus] =
    useState<PreparationStatus>("pending");

  const closePrepareModal = useCallback(() => {
    setSelectedEvent(null);
    setPreparationStatus("pending");
    setSelectedVenueId("");
    setVenueError(null);
    setLocalInstructions("");
    setRegistrationOpen(false);
  }, []);

  /*
   * VENUE SELECTION
   *
   * First checks if the venue is active.
   * Then keeps the existing venue schedule
   * conflict checker.
   */
  const handleVenueChange = useCallback(
    async (venueId: string) => {
      setVenueError(null);

      const lockStatus = getPreparationLockStatus(selectedEvent);

      if (lockStatus) {
        alert(getPreparationLockMessage(lockStatus));

        return;
      }

      if (!venueId) {
        setSelectedVenueId("");
        return;
      }

      const venue = venues.find((item) => item.id === venueId) ?? null;

      if (!venue) {
        setSelectedVenueId("");

        setVenueError(
          "The selected venue could not be found. Please choose another venue.",
        );

        return;
      }

      /*
       * UI-level inactive venue protection.
       */
      if (!isVenueActiveStatus(venue.status)) {
        const message = `${venue.venue_name} is currently inactive and cannot be assigned to this event. Please select an active venue.`;

        setSelectedVenueId("");

        setVenueError(`Venue Unavailable: ${message}`);

        alert(`Venue Unavailable\n\n${message}`);

        return;
      }

      /*
       * Temporarily select the venue before
       * checking the schedule.
       */
      setSelectedVenueId(venueId);

      if (
        !selectedEvent ||
        !selectedEvent.event?.start_at ||
        !selectedEvent.event?.end_at
      ) {
        return;
      }

      try {
        const { data, error } = await supabase.rpc(
          "check_local_venue_schedule_conflict",
          {
            p_event_municipality_id: selectedEvent.id,

            p_event_id: selectedEvent.event_id,

            p_local_venue_id: venueId,

            p_start_at: selectedEvent.event.start_at,

            p_end_at: selectedEvent.event.end_at,
          },
        );

        if (error) {
          console.error("Venue availability check error:", error);

          return;
        }

        const result = Array.isArray(data) ? data[0] : null;

        if (result?.has_conflict === true) {
          const message = `${venue.venue_name} is already assigned to another event during the selected schedule. Please select another venue.`;

          setSelectedVenueId("");

          setVenueError(`Venue Schedule Conflict: ${message}`);

          alert(`Venue Schedule Conflict\n\n${message}`);
        }
      } catch (error) {
        console.error("Unexpected venue availability check error:", error);
      }
    },
    [selectedEvent, venues],
  );

  /*
   * FETCH MUNICIPAL DASHBOARD DATA
   */
  const fetchReceivedEvents = useCallback(async () => {
    setLoading(true);
    setVenuesLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Unable to get municipal admin:", userError?.message);

        setMunicipality("");
        setVenues([]);
        setReceivedEvents([]);

        return;
      }

      /*
       * Get municipal admin municipality.
       */
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("municipality")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.municipality) {
        console.error("Unable to get municipality:", profileError?.message);

        setMunicipality("");
        setVenues([]);
        setReceivedEvents([]);

        return;
      }

      const municipalName = profile.municipality.trim();

      setMunicipality(municipalName);

      /*
       * LOAD VENUES
       */
      const { data: venueRowsData, error: venuesError } = await supabase
        .from("venues")
        .select(
          `
              id,
              venue_name,
              municipality,
              capacity,
              status
            `,
        )
        .ilike("municipality", municipalName)
        .order("venue_name", {
          ascending: true,
        });

      if (venuesError) {
        console.error("Unable to load municipal venues:", venuesError.message);

        setVenues([]);
      } else {
        const venueRows = (venueRowsData ?? []) as VenueRow[];

        const mappedVenues = venueRows.flatMap<MunicipalVenue>((venue) => {
          const venueId = String(venue.id ?? "").trim();

          const venueName = String(venue.venue_name ?? "").trim();

          if (!venueId || !venueName) {
            return [];
          }

          return [
            {
              id: venueId,

              venue_name: venueName,

              municipality: venue.municipality ?? municipalName,

              capacity:
                typeof venue.capacity === "number" ? venue.capacity : null,

              status: venue.status ?? null,
            },
          ];
        });

        setVenues(mappedVenues);
      }

      /*
       * LOAD MUNICIPAL EVENT ASSIGNMENTS
       */
      const { data: targetRowsData, error: targetError } = await supabase
        .from("event_municipalities")
        .select(
          `
              id,
              event_id,
              municipality,
              municipal_status,
              local_venue_id,
              registration_open,
              local_instructions,
              created_at
            `,
        )
        .ilike("municipality", municipalName)
        .order("created_at", {
          ascending: false,
        });

      if (targetError) {
        console.error(
          "Unable to load municipality assignments:",
          targetError.message,
        );

        setReceivedEvents([]);

        return;
      }

      const targetRows = (targetRowsData ?? []) as TargetRow[];

      if (targetRows.length === 0) {
        setReceivedEvents([]);
        return;
      }

      /*
       * LOAD REGISTERED PARTICIPANT COUNTS
       */
      const assignmentIds = Array.from(
        new Set(targetRows.map((row) => String(row.id))),
      );

      const { data: registeredRsvpRowsData, error: registeredRsvpRowsError } =
        await supabase
          .from("rsvps")
          .select("event_municipality_id")
          .in("event_municipality_id", assignmentIds)
          .eq("status", "registered");

      if (registeredRsvpRowsError) {
        console.error(
          "Unable to load registered participant counts:",
          registeredRsvpRowsError.message,
        );
      }

      const registeredRsvpRows = (registeredRsvpRowsData ??
        []) as RegisteredRsvpRow[];

      const registeredCountByAssignment = new Map<string, number>();

      for (const rsvpRow of registeredRsvpRows) {
        const assignmentId = String(rsvpRow.event_municipality_id ?? "").trim();

        if (!assignmentId) {
          continue;
        }

        const currentCount = registeredCountByAssignment.get(assignmentId) ?? 0;

        registeredCountByAssignment.set(assignmentId, currentCount + 1);
      }

      /*
       * Get provincial event IDs.
       */
      const eventIds = Array.from(
        new Set(
          targetRows
            .map((row) => row.event_id)
            .filter(
              (eventId): eventId is string =>
                typeof eventId === "string" && eventId.trim().length > 0,
            ),
        ),
      );

      if (eventIds.length === 0) {
        setReceivedEvents([]);
        return;
      }

      /*
       * LOAD NON-DRAFT PROVINCIAL EVENTS
       */
      const { data: visibleEventsData, error: eventsError } = await supabase
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
        .neq("status", "draft")
        .order("start_at", {
          ascending: false,
        });

      if (eventsError) {
        console.error("Unable to load visible events:", eventsError.message);

        setReceivedEvents([]);

        return;
      }

      const visibleEvents = (visibleEventsData ?? []) as EventRow[];

      const eventsById = new Map<string, EventRow>(
        visibleEvents.map((event) => [
          String(event.id),
          {
            id: String(event.id),

            title: event.title ?? null,

            description: event.description ?? null,

            start_at: event.start_at ?? null,

            end_at: event.end_at ?? null,

            memo_url: event.memo_url ?? null,

            memo_filename: event.memo_filename ?? null,

            status: event.status ?? null,

            created_at: event.created_at ?? null,
          },
        ]),
      );

      /*
       * Combine assignment + event data.
       */
      const mappedEvents = targetRows
        .flatMap<ReceivedEvent>((row) => {
          const eventId = String(row.event_id);

          const matchedEvent = eventsById.get(eventId);

          if (!matchedEvent) {
            return [];
          }

          return [
            {
              id: String(row.id),

              event_id: eventId,

              municipality: row.municipality ?? municipalName,

              municipal_status: normalizePreparationStatus(
                row.municipal_status,
              ),

              local_venue_id: row.local_venue_id
                ? String(row.local_venue_id)
                : null,

              registration_open: row.registration_open ?? false,

              local_instructions: row.local_instructions ?? null,

              created_at: row.created_at ?? null,

              registered_participants:
                registeredCountByAssignment.get(String(row.id)) ?? 0,

              event: matchedEvent,
            },
          ];
        })
        .sort((first, second) => {
          const firstDate = first.event?.start_at
            ? new Date(first.event.start_at).getTime()
            : 0;

          const secondDate = second.event?.start_at
            ? new Date(second.event.start_at).getTime()
            : 0;

          return secondDate - firstDate;
        });

      setReceivedEvents(mappedEvents);
    } catch (error) {
      console.error("Unexpected received events error:", error);

      setVenues([]);
      setReceivedEvents([]);
    } finally {
      setLoading(false);
      setVenuesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReceivedEvents();
  }, [fetchReceivedEvents]);

  /*
   * OPEN PREPARE EVENT MODAL
   */
  const openPrepareModal = useCallback((item: ReceivedEvent) => {
    const currentStatus = normalizePreparationStatus(item.municipal_status);

    const lockStatus = getPreparationLockStatus(item);

    setSelectedEvent(item);

    setPreparationStatus(currentStatus);

    setSelectedVenueId(item.local_venue_id ?? "");

    setVenueError(null);

    setLocalInstructions(item.local_instructions || "");

    setRegistrationOpen(
      lockStatus === null &&
        currentStatus === "prepared" &&
        item.registration_open === true,
    );
  }, []);

  /*
   * PREPARATION STATUS CHANGE
   */
  const handlePreparationStatusChange = useCallback(
    (value: PreparationStatus) => {
      const lockStatus = getPreparationLockStatus(selectedEvent);

      if (lockStatus) {
        setRegistrationOpen(false);
        return;
      }

      setPreparationStatus(value);

      if (value !== "prepared") {
        setRegistrationOpen(false);
      }

      setVenueError(null);
    },
    [selectedEvent],
  );

  /*
   * LOCAL INSTRUCTIONS CHANGE
   */
  const handleLocalInstructionsChange = useCallback(
    (value: string) => {
      const lockStatus = getPreparationLockStatus(selectedEvent);

      if (lockStatus) {
        return;
      }

      setLocalInstructions(value);
    },
    [selectedEvent],
  );

  /*
   * REGISTRATION CHANGE
   */
  const handleRegistrationOpenChange = useCallback(
    (value: boolean) => {
      const lockStatus = getPreparationLockStatus(selectedEvent);

      if (lockStatus || preparationStatus !== "prepared") {
        setRegistrationOpen(false);
        return;
      }

      setRegistrationOpen(value);
    },
    [preparationStatus, selectedEvent],
  );

  /*
   * SAVE MUNICIPAL PREPARATION
   */
  const savePreparation = useCallback(async () => {
    if (!selectedEvent || savingPreparation) {
      return;
    }

    setVenueError(null);
    setDeliveryToast(null);

    /*
     * UI lifecycle guard.
     */
    const selectedEventLockStatus = getPreparationLockStatus(selectedEvent);

    if (selectedEventLockStatus) {
      alert(getPreparationLockMessage(selectedEventLockStatus));

      setRegistrationOpen(false);

      return;
    }

    const trimmedInstructions = localInstructions.trim();

    if (preparationStatus !== "pending" && !trimmedInstructions) {
      alert(
        "Please enter local instructions before marking the event as preparing or prepared.",
      );

      return;
    }

    /*
     * Prepared requires venue.
     */
    if (preparationStatus === "prepared" && !selectedVenueId) {
      setVenueError(
        "Please select a local venue before marking this event as Prepared.",
      );

      return;
    }

    /*
     * Prepared requires schedule.
     */
    if (
      preparationStatus === "prepared" &&
      (!selectedEvent.event?.start_at || !selectedEvent.event?.end_at)
    ) {
      setVenueError(
        "This provincial event does not have a complete schedule. A venue cannot be finalized until the event start and end time are available.",
      );

      return;
    }

    setSavingPreparation(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("User not found. Please login again.");

        return;
      }

      /*
       * Re-read assignment to protect against
       * stale UI data.
       */
      const { data: latestAssignmentData, error: latestAssignmentError } =
        await supabase
          .from("event_municipalities")
          .select(
            `
              id,
              event_id,
              municipal_status,
              registration_open,
              local_venue_id,
              local_instructions
            `,
          )
          .eq("id", selectedEvent.id)
          .maybeSingle();

      if (latestAssignmentError) {
        console.error(
          "Latest municipal assignment error:",
          latestAssignmentError.message,
        );

        alert("Unable to verify the latest municipal event status.");

        return;
      }

      if (!latestAssignmentData) {
        alert("This municipal event assignment could not be found.");

        closePrepareModal();

        await fetchReceivedEvents();

        return;
      }

      const latestAssignment = latestAssignmentData as LatestAssignmentRow;

      /*
       * Re-read provincial event.
       */
      const { data: latestEventData, error: latestEventError } = await supabase
        .from("events")
        .select(
          `
              id,
              status
            `,
        )
        .eq("id", latestAssignment.event_id)
        .maybeSingle();

      if (latestEventError) {
        console.error(
          "Latest provincial event status error:",
          latestEventError.message,
        );

        alert("Unable to verify the latest provincial event status.");

        return;
      }

      if (!latestEventData) {
        alert(
          "The provincial event connected to this assignment could not be found.",
        );

        closePrepareModal();

        await fetchReceivedEvents();

        return;
      }

      const latestEvent = latestEventData as LatestEventStatusRow;

      /*
       * Latest lifecycle guard.
       */
      const latestMunicipalStatus = normalizeStatus(
        latestAssignment.municipal_status,
      );

      const latestProvincialStatus = normalizeStatus(latestEvent.status);

      let latestLockStatus: PreparationLockStatus | null = null;

      if (
        latestMunicipalStatus === "cancelled" ||
        latestProvincialStatus === "cancelled"
      ) {
        latestLockStatus = "cancelled";
      } else if (latestProvincialStatus === "completed") {
        latestLockStatus = "completed";
      } else if (latestProvincialStatus === "ongoing") {
        latestLockStatus = "ongoing";
      }

      if (latestLockStatus) {
        alert(getPreparationLockMessage(latestLockStatus));

        setRegistrationOpen(false);

        closePrepareModal();

        await fetchReceivedEvents();

        return;
      }

      /*
       * VENUE OWNERSHIP + LATEST STATUS GUARD
       */
      if (selectedVenueId) {
        const { data: selectedVenueData, error: selectedVenueError } =
          await supabase
            .from("venues")
            .select(
              `
                id,
                venue_name,
                municipality,
                capacity,
                status
              `,
            )
            .eq("id", selectedVenueId)
            .maybeSingle();

        if (selectedVenueError) {
          console.error(
            "Selected venue verification error:",
            selectedVenueError.message,
          );

          setVenueError(
            "Unable to verify the selected municipal venue. Please try again.",
          );

          return;
        }

        if (!selectedVenueData) {
          setVenueError(
            "The selected venue could not be found. Please choose another venue.",
          );

          return;
        }

        const selectedVenue = selectedVenueData as VenueRow;

        if (
          normalizeMunicipality(selectedVenue.municipality) !==
          normalizeMunicipality(municipality)
        ) {
          setVenueError(
            "The selected venue does not belong to your municipality.",
          );

          return;
        }

        /*
         * Latest inactive venue protection.
         */
        if (!isVenueActiveStatus(selectedVenue.status)) {
          const venueName = selectedVenue.venue_name ?? "The selected venue";

          const message = `${venueName} is currently inactive and cannot be assigned to this event. Please select an active venue.`;

          setVenueError(`Venue Unavailable: ${message}`);

          alert(`Venue Unavailable\n\n${message}`);

          await fetchReceivedEvents();

          return;
        }
      }

      const savedStatus = preparationStatus;

      const databasePreparationStatus =
        savedStatus === "preparing"
          ? "in_progress"
          : savedStatus === "prepared"
            ? "ready"
            : "pending";

      /*
       * SAVE
       */
      const { data: updatedRows, error: updateError } = await supabase
        .from("event_municipalities")
        .update({
          municipal_status: savedStatus,

          preparation_status: databasePreparationStatus,

          local_venue_id: selectedVenueId || null,

          local_instructions: trimmedInstructions || null,

          registration_open:
            savedStatus === "prepared" ? registrationOpen : false,

          prepared_by: savedStatus === "prepared" ? user.id : null,

          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedEvent.id)
        .neq("municipal_status", "cancelled")
        .select("id");

      if (updateError) {
        /*
         * Inactive venue DB trigger error.
         */
        if (isVenueUnavailableError(updateError.message)) {
          const message =
            "The selected venue is currently inactive and cannot be assigned to this event. Please select an active venue.";

          console.warn(
            "Inactive venue assignment prevented:",
            updateError.message,
          );

          setVenueError(`Venue Unavailable: ${message}`);

          alert(`Venue Unavailable\n\n${message}`);

          await fetchReceivedEvents();

          return;
        }

        /*
         * Existing schedule-conflict DB protection.
         */
        if (isVenueScheduleConflictError(updateError.message)) {
          const message =
            "This venue is already assigned to another event during the selected schedule. Please select another venue or use a non-overlapping schedule.";

          console.warn(
            "Venue schedule conflict prevented:",
            updateError.message,
          );

          setVenueError(`Venue Schedule Conflict: ${message}`);

          alert(`Venue Schedule Conflict\n\n${message}`);

          return;
        }

        console.error("Preparation update error:", updateError);

        alert(`Unable to update event preparation: ${updateError.message}`);

        return;
      }

      if (!updatedRows || updatedRows.length === 0) {
        alert(
          "The event could not be updated because it has already been cancelled or locked.",
        );

        setRegistrationOpen(false);

        closePrepareModal();

        await fetchReceivedEvents();

        return;
      }

      /*
       * PARTICIPANT EMAIL NOTIFICATIONS
       *
       * Registration Open:
       * CLOSED -> OPEN only.
       *
       * Local Instructions:
       * Email registered participants only when
       * the instructions actually changed.
       *
       * The Edge Function + delivery-log table
       * provides the final duplicate protection.
       */
      const previousInstructions = normalizeInstructionText(
        latestAssignment.local_instructions,
      );

      const currentInstructions = normalizeInstructionText(trimmedInstructions);

      const shouldNotifyRegistrationOpen =
        savedStatus === "prepared" &&
        registrationOpen === true &&
        latestAssignment.registration_open !== true;

      const shouldNotifyInstructionUpdate =
        savedStatus === "prepared" &&
        previousInstructions.length > 0 &&
        currentInstructions.length > 0 &&
        previousInstructions !== currentInstructions;

      const previousVenueId = String(
        latestAssignment.local_venue_id ?? "",
      ).trim();

      const currentVenueId = String(selectedVenueId ?? "").trim();

      const shouldNotifyVenueUpdate =
        savedStatus === "prepared" &&
        previousVenueId.length > 0 &&
        currentVenueId.length > 0 &&
        previousVenueId !== currentVenueId;

      /*
       * Shared Edge Function caller.
       */
      const sendParticipantNotification = async (
        notificationType: ParticipantEmailNotificationType,
      ) => {
        try {
          const { data, error } =
            await supabase.functions.invoke<ParticipantEmailResult>(
              "send-participant-event-email",
              {
                body: {
                  eventMunicipalityId: selectedEvent.id,

                  notificationType,
                },
              },
            );

          if (error) {
            console.warn(
              `Participant email notification failed (${notificationType}):`,
              error.message,
            );

            return {
              result: null as ParticipantEmailResult | null,

              requestFailed: true,
            };
          }

          const result = data ?? null;

          if (Array.isArray(result?.failed) && result.failed.length > 0) {
            console.warn(
              `Some participant emails failed (${notificationType}):`,
              result.failed,
            );
          }

          return {
            result,
            requestFailed: false,
          };
        } catch (emailError) {
          console.warn(
            `Unexpected participant email notification error (${notificationType}):`,
            emailError,
          );

          return {
            result: null as ParticipantEmailResult | null,

            requestFailed: true,
          };
        }
      };

      let registrationEmail: {
        result: ParticipantEmailResult | null;

        requestFailed: boolean;
      } | null = null;

      let instructionEmail: {
        result: ParticipantEmailResult | null;

        requestFailed: boolean;
      } | null = null;

      let venueEmail: {
        result: ParticipantEmailResult | null;

        requestFailed: boolean;
      } | null = null;

      /*
       * REGISTRATION OPEN EMAIL
       */
      if (shouldNotifyRegistrationOpen) {
        registrationEmail =
          await sendParticipantNotification("registration_open");
      }

      /*
       * LOCAL INSTRUCTIONS UPDATED EMAIL
       */
      if (shouldNotifyInstructionUpdate) {
        instructionEmail = await sendParticipantNotification(
          "local_instructions_updated",
        );
      }

      /*
       * VENUE UPDATED EMAIL
       */
      if (shouldNotifyVenueUpdate) {
        venueEmail = await sendParticipantNotification("venue_updated");
      }

      closePrepareModal();

      await fetchReceivedEvents();

      /*
       * SUCCESS MESSAGE
       */
      const successMessages: string[] = [
        `Event preparation status updated to ${getPreparationStatusLabel(
          savedStatus,
        )}.`,
      ];

      /*
       * REGISTRATION EMAIL RESULT
       */
      if (shouldNotifyRegistrationOpen) {
        if (registrationEmail?.requestFailed) {
          successMessages.push(
            "Registration is now open, but the registration-open email notification could not be processed.",
          );
        } else {
          const result = registrationEmail?.result;

          const totalRecipients = result?.totalRecipients ?? 0;

          const sentCount = result?.sent ?? 0;

          const alreadySentCount = result?.skippedAlreadySent ?? 0;

          const inProgressCount = result?.skippedInProgress ?? 0;

          const failedCount = Array.isArray(result?.failed)
            ? result.failed.length
            : 0;

          if (totalRecipients === 0) {
            successMessages.push(
              "Registration is now open. No approved participants with email addresses were found for this municipality.",
            );
          } else {
            const details = [
              `${sentCount} sent`,
              `${alreadySentCount} already notified`,
            ];

            if (inProgressCount > 0) {
              details.push(`${inProgressCount} already being processed`);
            }

            if (failedCount > 0) {
              details.push(`${failedCount} failed`);
            }

            successMessages.push(
              `Registration-open email: ${details.join(", ")}.`,
            );
          }
        }
      }

      /*
       * LOCAL INSTRUCTIONS EMAIL RESULT
       */
      if (shouldNotifyInstructionUpdate) {
        if (instructionEmail?.requestFailed) {
          successMessages.push(
            "Local instructions were updated, but the participant instruction-update email could not be processed.",
          );
        } else {
          const result = instructionEmail?.result;

          const totalRecipients = result?.totalRecipients ?? 0;

          const sentCount = result?.sent ?? 0;

          const alreadySentCount = result?.skippedAlreadySent ?? 0;

          const inProgressCount = result?.skippedInProgress ?? 0;

          const failedCount = Array.isArray(result?.failed)
            ? result.failed.length
            : 0;

          if (totalRecipients === 0) {
            successMessages.push(
              "Local instructions were updated. No registered participants with email addresses were found for this event.",
            );
          } else {
            const details = [
              `${sentCount} sent`,
              `${alreadySentCount} already notified`,
            ];

            if (inProgressCount > 0) {
              details.push(`${inProgressCount} already being processed`);
            }

            if (failedCount > 0) {
              details.push(`${failedCount} failed`);
            }

            successMessages.push(
              `Instructions-update email: ${details.join(", ")}.`,
            );
          }
        }
      }

      /*
       * VENUE UPDATE EMAIL RESULT
       */
      if (shouldNotifyVenueUpdate) {
        if (venueEmail?.requestFailed) {
          successMessages.push(
            "The event venue was updated, but the participant venue-update email could not be processed.",
          );
        } else {
          const result = venueEmail?.result;

          const totalRecipients = result?.totalRecipients ?? 0;

          const sentCount = result?.sent ?? 0;

          const alreadySentCount = result?.skippedAlreadySent ?? 0;

          const inProgressCount = result?.skippedInProgress ?? 0;

          const failedCount = Array.isArray(result?.failed)
            ? result.failed.length
            : 0;

          if (totalRecipients === 0) {
            successMessages.push(
              "The event venue was updated. No registered participants with email addresses were found for this event.",
            );
          } else {
            const details = [
              `${sentCount} sent`,
              `${alreadySentCount} already notified`,
            ];

            if (inProgressCount > 0) {
              details.push(`${inProgressCount} already being processed`);
            }

            if (failedCount > 0) {
              details.push(`${failedCount} failed`);
            }

            successMessages.push(`Venue-update email: ${details.join(", ")}.`);
          }
        }
      }
      const emailResults = [
        registrationEmail,
        instructionEmail,
        venueEmail,
      ].filter(
        (result): result is NonNullable<typeof result> => result !== null,
      );

      const hasEmailDeliveryWarning = emailResults.some((emailResult) => {
        const failedCount = Array.isArray(emailResult.result?.failed)
          ? emailResult.result.failed.length
          : 0;

        return (
          emailResult.requestFailed ||
          failedCount > 0 ||
          Boolean(emailResult.result?.error)
        );
      });

      setDeliveryToast({
        id: `${selectedEvent.id}-${Date.now()}`,

        variant: hasEmailDeliveryWarning ? "warning" : "success",

        title: hasEmailDeliveryWarning
          ? "Preparation Saved With Email Issues"
          : "Preparation Saved Successfully",

        message: successMessages.join("\n\n"),
      });
    } catch (error) {
      console.error("Unexpected preparation update error:", error);

      alert(
        error instanceof Error
          ? `Unable to update event preparation: ${error.message}`
          : "An unexpected error occurred while updating the event.",
      );
    } finally {
      setSavingPreparation(false);
    }
  }, [
    closePrepareModal,
    fetchReceivedEvents,
    localInstructions,
    municipality,
    preparationStatus,
    registrationOpen,
    savingPreparation,
    selectedEvent,
    selectedVenueId,
  ]);

  const summary = useMemo(
    () => getMunicipalDashboardSummary(receivedEvents),
    [receivedEvents],
  );

  return {
    municipality,

    receivedEvents,
    summary,
    loading,

    deliveryToast,
    dismissDeliveryToast,

    venues,
    venuesLoading,
    selectedVenueId,
    venueError,

    selectedEvent,
    localInstructions,
    registrationOpen,
    savingPreparation,
    preparationStatus,

    setLocalInstructions: handleLocalInstructionsChange,

    setRegistrationOpen: handleRegistrationOpenChange,

    handleVenueChange,

    openPrepareModal,
    closePrepareModal,

    handlePreparationStatusChange,

    savePreparation,

    refreshEvents: fetchReceivedEvents,
  };
}
