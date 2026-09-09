"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

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
};

/*
 * Convert database status/text into a
 * consistent lowercase string.
 */
function normalizeStatus(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/*
 * Normalize municipality values for
 * defensive comparison.
 */
function normalizeMunicipality(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/*
 * Checks both the municipal assignment status
 * and the parent provincial event status.
 */
function isReceivedEventCancelled(
  item: ReceivedEvent | null,
) {
  if (!item) {
    return false;
  }

  const municipalStatus = normalizeStatus(
    item.municipal_status,
  );

  const provincialStatus = normalizeStatus(
    item.event?.status,
  );

  return (
    municipalStatus === "cancelled" ||
    provincialStatus === "cancelled"
  );
}

/*
 * Detect the specific PostgreSQL error raised by
 * the venue conflict protection trigger.
 */
function isVenueScheduleConflictError(
  message: string | null | undefined,
) {
  return normalizeStatus(message).includes(
    "venue schedule conflict",
  );
}

export default function useMunicipalDashboard() {
  const [municipality, setMunicipality] =
    useState("");

  const [receivedEvents, setReceivedEvents] =
    useState<ReceivedEvent[]>([]);

  const [venues, setVenues] =
    useState<MunicipalVenue[]>([]);

  const [venuesLoading, setVenuesLoading] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [selectedEvent, setSelectedEvent] =
    useState<ReceivedEvent | null>(null);

  const [
    selectedVenueId,
    setSelectedVenueId,
  ] = useState("");

  const [
    venueError,
    setVenueError,
  ] = useState<string | null>(null);

  const [
    localInstructions,
    setLocalInstructions,
  ] = useState("");

  const [
    registrationOpen,
    setRegistrationOpen,
  ] = useState(false);

  const [
    savingPreparation,
    setSavingPreparation,
  ] = useState(false);

  const [
    preparationStatus,
    setPreparationStatus,
  ] =
    useState<PreparationStatus>(
      "pending",
    );

  /*
   * CLOSE PREPARATION MODAL
   */
  const closePrepareModal =
    useCallback(() => {
      setSelectedEvent(null);

      setPreparationStatus(
        "pending",
      );

      setSelectedVenueId("");

      setVenueError(null);

      setLocalInstructions("");

      setRegistrationOpen(false);
    }, []);

  /*
   * VENUE SELECTION
   */
  const handleVenueChange =
  useCallback(
    async (venueId: string) => {
      setVenueError(null);

      if (!venueId) {
        setSelectedVenueId("");
        return;
      }

      /*
       * Select it temporarily while checking.
       */
      setSelectedVenueId(
        venueId,
      );

      if (
        !selectedEvent ||
        !selectedEvent.event?.start_at ||
        !selectedEvent.event?.end_at
      ) {
        return;
      }

      try {
        const {
          data,
          error,
        } = await supabase.rpc(
          "check_local_venue_schedule_conflict",
          {
            p_event_municipality_id:
              selectedEvent.id,

            p_event_id:
              selectedEvent.event_id,

            p_local_venue_id:
              venueId,

            p_start_at:
              selectedEvent.event.start_at,

            p_end_at:
              selectedEvent.event.end_at,
          },
        );

        if (error) {
          console.error(
            "Venue availability check error:",
            error,
          );

          return;
        }

        const result =
          Array.isArray(data)
            ? data[0]
            : null;

        if (
          result?.has_conflict === true
        ) {
          const venue =
            venues.find(
              (item) =>
                item.id === venueId,
            );

          const venueName =
            venue?.venue_name ??
            "This venue";

          const conflictMessage =
            `${venueName} is already assigned to another event during the selected schedule. Please select another venue.`;

          /*
           * Remove the conflicting selection.
           */
          setSelectedVenueId("");

          /*
           * Keep an inline warning in the modal.
           */
          setVenueError(
            `Venue Schedule Conflict: ${conflictMessage}`,
          );

          /*
           * Immediate notification.
           */
          alert(
            `Venue Schedule Conflict\n\n${conflictMessage}`,
          );
        }
      } catch (error) {
        console.error(
          "Unexpected venue availability check error:",
          error,
        );
      }
    },
    [
      selectedEvent,
      venues,
    ],
  );

  /*
   * FETCH RECEIVED MUNICIPAL EVENTS
   */
  const fetchReceivedEvents =
    useCallback(async () => {
      setLoading(true);
      setVenuesLoading(true);

      try {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          console.error(
            "Unable to get municipal admin:",
            userError?.message,
          );

          setMunicipality("");
          setVenues([]);
          setReceivedEvents([]);

          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("municipality")
          .eq("id", user.id)
          .single();

        if (
          profileError ||
          !profile?.municipality
        ) {
          console.error(
            "Unable to get municipality:",
            profileError?.message,
          );

          setMunicipality("");
          setVenues([]);
          setReceivedEvents([]);

          return;
        }

        const municipalName =
          profile.municipality.trim();

        setMunicipality(
          municipalName,
        );

        /*
         * LOAD MUNICIPAL VENUES
         *
         * Only venues belonging to the currently
         * logged-in municipal administrator's
         * municipality are displayed.
         */
        const {
          data: venueRowsData,
          error: venuesError,
        } = await supabase
          .from("venues")
          .select(
            `
              id,
              venue_name,
              municipality,
              capacity
            `,
          )
          .ilike(
            "municipality",
            municipalName,
          )
          .order("venue_name", {
            ascending: true,
          });

        if (venuesError) {
          console.error(
            "Unable to load municipal venues:",
            venuesError.message,
          );

          setVenues([]);
        } else {
          const venueRows =
            (venueRowsData ??
              []) as VenueRow[];

          const mappedVenues =
            venueRows.flatMap<MunicipalVenue>(
              (venue) => {
                const venueId =
                  String(
                    venue.id ?? "",
                  ).trim();

                const venueName =
                  String(
                    venue.venue_name ??
                    "",
                  ).trim();

                if (
                  !venueId ||
                  !venueName
                ) {
                  return [];
                }

                return [
                  {
                    id: venueId,

                    venue_name:
                      venueName,

                    municipality:
                      venue.municipality ??
                      municipalName,

                    capacity:
                      typeof venue.capacity ===
                        "number"
                        ? venue.capacity
                        : null,
                  },
                ];
              },
            );

          setVenues(
            mappedVenues,
          );
        }

        /*
         * GET MUNICIPAL EVENT ASSIGNMENTS
         */
        const {
          data: targetRowsData,
          error: targetError,
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
              local_venue_id,
              registration_open,
              local_instructions,
              created_at
            `,
          )
          .ilike(
            "municipality",
            municipalName,
          )
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

        const targetRows =
          (targetRowsData ??
            []) as TargetRow[];

        if (
          targetRows.length === 0
        ) {
          setReceivedEvents([]);

          return;
        }

        /*
         * LOAD REGISTERED PARTICIPANT COUNTS
         */
        const assignmentIds =
          Array.from(
            new Set(
              targetRows.map(
                (row) =>
                  String(row.id),
              ),
            ),
          );

        const {
          data:
          registeredRsvpRowsData,
          error:
          registeredRsvpRowsError,
        } = await supabase
          .from("rsvps")
          .select(
            "event_municipality_id",
          )
          .in(
            "event_municipality_id",
            assignmentIds,
          )
          .eq(
            "status",
            "registered",
          );

        if (
          registeredRsvpRowsError
        ) {
          console.error(
            "Unable to load registered participant counts:",
            registeredRsvpRowsError.message,
          );
        }

        const registeredRsvpRows =
          (registeredRsvpRowsData ??
            []) as RegisteredRsvpRow[];

        const registeredCountByAssignment =
          new Map<
            string,
            number
          >();

        for (const rsvpRow of registeredRsvpRows) {
          const assignmentId =
            String(
              rsvpRow.event_municipality_id ??
              "",
            ).trim();

          if (!assignmentId) {
            continue;
          }

          const currentCount =
            registeredCountByAssignment.get(
              assignmentId,
            ) ?? 0;

          registeredCountByAssignment.set(
            assignmentId,
            currentCount + 1,
          );
        }

        const eventIds =
          Array.from(
            new Set(
              targetRows
                .map(
                  (row) =>
                    row.event_id,
                )
                .filter(
                  (
                    eventId,
                  ): eventId is string =>
                    typeof eventId ===
                    "string" &&
                    eventId
                      .trim()
                      .length > 0,
                ),
            ),
          );

        if (
          eventIds.length === 0
        ) {
          setReceivedEvents([]);

          return;
        }

        /*
         * LOAD ALL NON-DRAFT EVENTS.
         *
         * Cancelled events remain visible for
         * reference.
         */
        const {
          data:
          visibleEventsData,
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
          .neq("status", "draft")
          .order("start_at", {
            ascending: false,
          });

        if (eventsError) {
          console.error(
            "Unable to load visible events:",
            eventsError.message,
          );

          setReceivedEvents([]);

          return;
        }

        const visibleEvents =
          (visibleEventsData ??
            []) as EventRow[];

        if (
          visibleEvents.length ===
          0
        ) {
          setReceivedEvents([]);

          return;
        }

        const eventsById =
          new Map<
            string,
            EventRow
          >(
            visibleEvents.map(
              (event) => [
                String(
                  event.id,
                ),

                {
                  id: String(
                    event.id,
                  ),

                  title:
                    event.title ??
                    null,

                  description:
                    event.description ??
                    null,

                  start_at:
                    event.start_at ??
                    null,

                  end_at:
                    event.end_at ??
                    null,

                  memo_url:
                    event.memo_url ??
                    null,

                  memo_filename:
                    event.memo_filename ??
                    null,

                  status:
                    event.status ??
                    null,

                  created_at:
                    event.created_at ??
                    null,
                },
              ],
            ),
          );

        const mappedEvents =
          targetRows
            .flatMap<ReceivedEvent>(
              (row) => {
                const eventId =
                  String(
                    row.event_id,
                  );

                const matchedEvent =
                  eventsById.get(
                    eventId,
                  );

                if (
                  !matchedEvent
                ) {
                  return [];
                }

                return [
                  {
                    id: String(
                      row.id,
                    ),

                    event_id:
                      eventId,

                    municipality:
                      row.municipality ??
                      municipalName,

                    municipal_status:
                      normalizePreparationStatus(
                        row.municipal_status,
                      ),

                    local_venue_id:
                      row.local_venue_id
                        ? String(
                          row.local_venue_id,
                        )
                        : null,

                    registration_open:
                      row.registration_open ??
                      false,

                    local_instructions:
                      row.local_instructions ??
                      null,

                    created_at:
                      row.created_at ??
                      null,

                    registered_participants:
                      registeredCountByAssignment.get(
                        String(
                          row.id,
                        ),
                      ) ??
                      0,

                    event:
                      matchedEvent,
                  },
                ];
              },
            )
            .sort(
              (
                firstItem,
                secondItem,
              ) => {
                const firstDate =
                  firstItem
                    .event
                    ?.start_at
                    ? new Date(
                      firstItem.event.start_at,
                    ).getTime()
                    : 0;

                const secondDate =
                  secondItem
                    .event
                    ?.start_at
                    ? new Date(
                      secondItem.event.start_at,
                    ).getTime()
                    : 0;

                return (
                  secondDate -
                  firstDate
                );
              },
            );

        setReceivedEvents(
          mappedEvents,
        );
      } catch (error) {
        console.error(
          "Unexpected received events error:",
          error,
        );

        setVenues([]);
        setReceivedEvents([]);
      } finally {
        setLoading(false);
        setVenuesLoading(false);
      }
    }, []);

  useEffect(() => {
    void fetchReceivedEvents();
  }, [
    fetchReceivedEvents,
  ]);

  /*
   * OPEN PREPARATION / CANCELLATION MODAL
   */
  const openPrepareModal =
    useCallback(
      (item: ReceivedEvent) => {
        const currentStatus =
          normalizePreparationStatus(
            item.municipal_status,
          );

        const cancelled =
          isReceivedEventCancelled(
            item,
          );

        setSelectedEvent(item);

        setPreparationStatus(
          cancelled
            ? "pending"
            : currentStatus,
        );

        setSelectedVenueId(
          item.local_venue_id ??
          "",
        );

        setVenueError(null);

        setLocalInstructions(
          item.local_instructions ||
          "",
        );

        setRegistrationOpen(
          !cancelled &&
          currentStatus ===
          "prepared" &&
          item.registration_open ===
          true,
        );
      },
      [],
    );

  /*
   * PREPARATION STATUS CHANGE
   */
  const handlePreparationStatusChange =
    useCallback(
      (
        value: PreparationStatus,
      ) => {
        if (
          isReceivedEventCancelled(
            selectedEvent,
          )
        ) {
          setRegistrationOpen(
            false,
          );

          return;
        }

        setPreparationStatus(
          value,
        );

        if (
          value !==
          "prepared"
        ) {
          setRegistrationOpen(
            false,
          );
        }

        /*
         * Changing the preparation state gives the
         * user another chance to correct the venue.
         */
        setVenueError(null);
      },
      [selectedEvent],
    );

  /*
   * SAVE MUNICIPAL PREPARATION
   */
  const savePreparation =
    useCallback(async () => {
      if (
        !selectedEvent ||
        savingPreparation
      ) {
        return;
      }

      setVenueError(null);

      /*
       * FIRST GUARD:
       * Current UI event state.
       */
      if (
        isReceivedEventCancelled(
          selectedEvent,
        )
      ) {
        alert(
          "This event has been cancelled. Municipal preparation and registration can no longer be changed.",
        );

        setRegistrationOpen(
          false,
        );

        return;
      }

      const trimmedInstructions =
        localInstructions.trim();

      if (
        preparationStatus !==
        "pending" &&
        !trimmedInstructions
      ) {
        alert(
          "Please enter local instructions before marking the event as preparing or prepared.",
        );

        return;
      }

      /*
       * A prepared event must already have its
       * municipal venue assigned.
       */
      if (
        preparationStatus ===
        "prepared" &&
        !selectedVenueId
      ) {
        setVenueError(
          "Please select a local venue before marking this event as Prepared.",
        );

        return;
      }

      /*
       * A prepared event should always have a
       * valid provincial schedule.
       */
      if (
        preparationStatus ===
        "prepared" &&
        (!selectedEvent.event
          ?.start_at ||
          !selectedEvent.event
            ?.end_at)
      ) {
        setVenueError(
          "This provincial event does not have a complete schedule. A venue cannot be finalized until the event start and end time are available.",
        );

        return;
      }

      setSavingPreparation(
        true,
      );

      try {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          alert(
            "User not found. Please login again.",
          );

          return;
        }

        /*
         * SECOND GUARD:
         * Re-read the municipal assignment.
         */
        const {
          data:
          latestAssignmentData,
          error:
          latestAssignmentError,
        } = await supabase
          .from(
            "event_municipalities",
          )
          .select(
            `
              id,
              event_id,
              municipal_status,
              registration_open,
              local_venue_id
            `,
          )
          .eq(
            "id",
            selectedEvent.id,
          )
          .maybeSingle();

        if (
          latestAssignmentError
        ) {
          console.error(
            "Latest municipal assignment error:",
            latestAssignmentError.message,
          );

          alert(
            "Unable to verify the latest municipal event status.",
          );

          return;
        }

        if (
          !latestAssignmentData
        ) {
          alert(
            "This municipal event assignment could not be found.",
          );

          closePrepareModal();

          await fetchReceivedEvents();

          return;
        }

        const latestAssignment =
          latestAssignmentData as LatestAssignmentRow;

        /*
         * Re-read the parent provincial event.
         */
        const {
          data:
          latestEventData,
          error:
          latestEventError,
        } = await supabase
          .from("events")
          .select(
            `
              id,
              status
            `,
          )
          .eq(
            "id",
            latestAssignment.event_id,
          )
          .maybeSingle();

        if (
          latestEventError
        ) {
          console.error(
            "Latest provincial event status error:",
            latestEventError.message,
          );

          alert(
            "Unable to verify the latest provincial event status.",
          );

          return;
        }

        if (
          !latestEventData
        ) {
          alert(
            "The provincial event connected to this assignment could not be found.",
          );

          closePrepareModal();

          await fetchReceivedEvents();

          return;
        }

        const latestEvent =
          latestEventData as LatestEventStatusRow;

        const latestMunicipalStatus =
          normalizeStatus(
            latestAssignment.municipal_status,
          );

        const latestProvincialStatus =
          normalizeStatus(
            latestEvent.status,
          );

        /*
         * LATEST DATABASE CANCELLATION GUARD
         */
        if (
          latestMunicipalStatus ===
          "cancelled" ||
          latestProvincialStatus ===
          "cancelled"
        ) {
          alert(
            "This event was cancelled by the provincial administrator. Preparation and participant registration are now locked.",
          );

          setRegistrationOpen(
            false,
          );

          closePrepareModal();

          await fetchReceivedEvents();

          return;
        }

        /*
         * VENUE OWNERSHIP GUARD
         *
         * Do not trust the selected venue ID from
         * the browser alone. Re-read it and ensure
         * that it belongs to this municipality.
         */
        if (
          selectedVenueId
        ) {
          const {
            data:
            selectedVenueData,
            error:
            selectedVenueError,
          } = await supabase
            .from("venues")
            .select(
              `
                id,
                venue_name,
                municipality,
                capacity
              `,
            )
            .eq(
              "id",
              selectedVenueId,
            )
            .maybeSingle();

          if (
            selectedVenueError
          ) {
            console.error(
              "Selected venue verification error:",
              selectedVenueError.message,
            );

            setVenueError(
              "Unable to verify the selected municipal venue. Please try again.",
            );

            return;
          }

          if (
            !selectedVenueData
          ) {
            setVenueError(
              "The selected venue could not be found. Please choose another venue.",
            );

            return;
          }

          const selectedVenue =
            selectedVenueData as VenueRow;

          if (
            normalizeMunicipality(
              selectedVenue.municipality,
            ) !==
            normalizeMunicipality(
              municipality,
            )
          ) {
            setVenueError(
              "The selected venue does not belong to your municipality.",
            );

            return;
          }
        }

        const savedStatus =
          preparationStatus;

        const databasePreparationStatus =
          savedStatus ===
            "preparing"
            ? "in_progress"
            : savedStatus ===
              "prepared"
              ? "ready"
              : "pending";

        /*
         * THIRD GUARD:
         *
         * The database venue-conflict trigger
         * executes during this UPDATE whenever
         * local_venue_id is changed.
         */
        const {
          data: updatedRows,
          error: updateError,
        } = await supabase
          .from(
            "event_municipalities",
          )
          .update({
            municipal_status:
              savedStatus,

            preparation_status:
              databasePreparationStatus,

            /*
             * Objective #2:
             * Local municipal venue assignment.
             */
            local_venue_id:
              selectedVenueId ||
              null,

            local_instructions:
              trimmedInstructions ||
              null,

            registration_open:
              savedStatus ===
                "prepared"
                ? registrationOpen
                : false,

            prepared_by:
              savedStatus ===
                "prepared"
                ? user.id
                : null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            selectedEvent.id,
          )
          .neq(
            "municipal_status",
            "cancelled",
          )
          .select("id");

        if (updateError) {
          /*
           * Venue conflict is an expected validation result.
           * Show an immediate alert so the municipal admin
           * notices it right away, while keeping the inline
           * modal error for reference.
           */
          if (
            isVenueScheduleConflictError(
              updateError.message,
            )
          ) {
            const conflictMessage =
              "This venue is already assigned to another event during the selected schedule. Please select another venue or use a non-overlapping schedule.";

            console.warn(
              "Venue schedule conflict prevented:",
              updateError.message,
            );

            setVenueError(
              `Venue Schedule Conflict: ${conflictMessage}`,
            );

            alert(
              `Venue Schedule Conflict\n\n${conflictMessage}`,
            );

            return;
          }

          /*
           * Unexpected database errors remain real errors.
           */
          console.error(
            "Preparation update error:",
            updateError,
          );

          alert(
            `Unable to update event preparation: ${updateError.message}`,
          );

          return;
        }

        /*
         * No row was updated because the assignment
         * was cancelled or locked before save.
         */
        if (
          !updatedRows ||
          updatedRows.length ===
          0
        ) {
          alert(
            "The event could not be updated because it has already been cancelled or locked.",
          );

          setRegistrationOpen(
            false,
          );

          closePrepareModal();

          await fetchReceivedEvents();

          return;
        }

        closePrepareModal();

        await fetchReceivedEvents();

        alert(
          `Event preparation status updated to ${getPreparationStatusLabel(
            savedStatus,
          )}.`,
        );
      } catch (error) {
        console.error(
          "Unexpected preparation update error:",
          error,
        );

        alert(
          error instanceof Error
            ? `Unable to update event preparation: ${error.message}`
            : "An unexpected error occurred while updating the event.",
        );
      } finally {
        setSavingPreparation(
          false,
        );
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

  /*
   * MUNICIPAL DASHBOARD SUMMARY
   */
  const summary = useMemo(
    () =>
      getMunicipalDashboardSummary(
        receivedEvents,
      ),
    [receivedEvents],
  );

  return {
    municipality,

    receivedEvents,
    summary,
    loading,

    /*
     * Municipal venue data.
     */
    venues,
    venuesLoading,
    selectedVenueId,
    venueError,

    selectedEvent,
    localInstructions,
    registrationOpen,
    savingPreparation,
    preparationStatus,

    setLocalInstructions,
    setRegistrationOpen,

    handleVenueChange,

    openPrepareModal,
    closePrepareModal,

    handlePreparationStatusChange,

    savePreparation,

    refreshEvents:
      fetchReceivedEvents,
  };
}