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
  status: string | null;
};

function normalizeStatus(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeMunicipality(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isVenueActiveStatus(
  value: string | null | undefined,
) {
  return normalizeStatus(value) === "active";
}

type PreparationLockStatus =
  | "ongoing"
  | "completed"
  | "cancelled";

function getPreparationLockStatus(
  item: ReceivedEvent | null,
): PreparationLockStatus | null {
  if (!item) {
    return null;
  }

  const municipalStatus =
    normalizeStatus(
      item.municipal_status,
    );

  const provincialStatus =
    normalizeStatus(
      item.event?.status,
    );

  /*
   * Cancellation takes priority because an
   * assignment itself may also be cancelled.
   */
  if (
    municipalStatus === "cancelled" ||
    provincialStatus === "cancelled"
  ) {
    return "cancelled";
  }

  if (
    provincialStatus === "completed"
  ) {
    return "completed";
  }

  if (
    provincialStatus === "ongoing"
  ) {
    return "ongoing";
  }

  return null;
}



function getPreparationLockMessage(
  status: PreparationLockStatus,
) {
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

function isVenueScheduleConflictError(
  message: string | null | undefined,
) {
  return normalizeStatus(message).includes(
    "venue schedule conflict",
  );
}

function isVenueUnavailableError(
  message: string | null | undefined,
) {
  const normalized =
    normalizeStatus(message);

  return (
    normalized.includes("venue unavailable") ||
    normalized.includes(
      "cannot be assigned to an event",
    )
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

  const closePrepareModal =
    useCallback(() => {
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
  const handleVenueChange =
    useCallback(
      async (venueId: string) => {
        setVenueError(null);

        const lockStatus =
          getPreparationLockStatus(
            selectedEvent,
          );

        if (lockStatus) {
          alert(
            getPreparationLockMessage(
              lockStatus,
            ),
          );

          return;
        }

        if (!venueId) {
          setSelectedVenueId("");
          return;
        }

        const venue =
          venues.find(
            (item) =>
              item.id === venueId,
          ) ?? null;

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
        if (
          !isVenueActiveStatus(
            venue.status,
          )
        ) {
          const message =
            `${venue.venue_name} is currently inactive and cannot be assigned to this event. Please select an active venue.`;

          setSelectedVenueId("");

          setVenueError(
            `Venue Unavailable: ${message}`,
          );

          alert(
            `Venue Unavailable\n\n${message}`,
          );

          return;
        }

        /*
         * Temporarily select the venue before
         * checking the schedule.
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
            const message =
              `${venue.venue_name} is already assigned to another event during the selected schedule. Please select another venue.`;

            setSelectedVenueId("");

            setVenueError(
              `Venue Schedule Conflict: ${message}`,
            );

            alert(
              `Venue Schedule Conflict\n\n${message}`,
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
   * FETCH MUNICIPAL DASHBOARD DATA
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

        /*
         * Get municipal admin municipality.
         */
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
         * LOAD VENUES
         *
         * status is now included.
         * Both active and inactive venues are loaded
         * so inactive venues can still be displayed
         * in the dropdown as disabled options.
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
              capacity,
              status
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
                    status:
                      venue.status ??
                      null,
                  },
                ];
              },
            );

          setVenues(
            mappedVenues,
          );
        }

        /*
         * LOAD MUNICIPAL EVENT ASSIGNMENTS
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
          new Map<string, number>();

        for (
          const rsvpRow of
          registeredRsvpRows
        ) {
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

        /*
         * Get provincial event IDs.
         */
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
                    eventId.trim()
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
         * LOAD NON-DRAFT PROVINCIAL EVENTS
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
          .in(
            "id",
            eventIds,
          )
          .neq(
            "status",
            "draft",
          )
          .order(
            "start_at",
            {
              ascending: false,
            },
          );

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

        const eventsById =
          new Map<
            string,
            EventRow
          >(
            visibleEvents.map(
              (event) => [
                String(event.id),
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

        /*
         * Combine assignment + event data.
         */
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

                if (!matchedEvent) {
                  return [];
                }

                return [
                  {
                    id:
                      String(row.id),

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
                      ) ?? 0,

                    event:
                      matchedEvent,
                  },
                ];
              },
            )
            .sort(
              (
                first,
                second,
              ) => {
                const firstDate =
                  first.event
                    ?.start_at
                    ? new Date(
                      first.event.start_at,
                    ).getTime()
                    : 0;

                const secondDate =
                  second.event
                    ?.start_at
                    ? new Date(
                      second.event.start_at,
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
   * OPEN PREPARE EVENT MODAL
   */
  const openPrepareModal =
    useCallback(
      (
        item: ReceivedEvent,
      ) => {
        const currentStatus =
          normalizePreparationStatus(
            item.municipal_status,
          );

        const lockStatus =
          getPreparationLockStatus(
            item,
          );

        setSelectedEvent(item);

        /*
         * Preserve the actual preparation status
         * even when the event is already locked.
         * Locked events will later be displayed
         * as read-only in the modal.
         */
        setPreparationStatus(
          currentStatus,
        );

        setSelectedVenueId(
          item.local_venue_id ?? "",
        );

        setVenueError(null);

        setLocalInstructions(
          item.local_instructions || "",
        );

        /*
         * Registration is considered open only
         * while the event is still editable,
         * prepared, and explicitly open.
         */
        setRegistrationOpen(
          lockStatus === null &&
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
        const lockStatus =
          getPreparationLockStatus(
            selectedEvent,
          );

        if (lockStatus) {
          setRegistrationOpen(false);
          return;
        }

        setPreparationStatus(
          value,
        );

        if (
          value !== "prepared"
        ) {
          setRegistrationOpen(false);
        }

        setVenueError(null);
      },
      [
        selectedEvent,
      ],
    );
  /*
   * SAVE MUNICIPAL PREPARATION
   */
  /*
   * LOCAL INSTRUCTIONS CHANGE
   *
   * Locked lifecycle states are read-only.
   */
  const handleLocalInstructionsChange =
    useCallback(
      (
        value: string,
      ) => {
        const lockStatus =
          getPreparationLockStatus(
            selectedEvent,
          );

        if (lockStatus) {
          return;
        }

        setLocalInstructions(
          value,
        );
      },
      [
        selectedEvent,
      ],
    );

  /*
   * REGISTRATION CHANGE
   *
   * Registration can only be controlled while
   * the event is editable and already prepared.
   */
  const handleRegistrationOpenChange =
    useCallback(
      (
        value: boolean,
      ) => {
        const lockStatus =
          getPreparationLockStatus(
            selectedEvent,
          );

        if (
          lockStatus ||
          preparationStatus !==
          "prepared"
        ) {
          setRegistrationOpen(false);
          return;
        }

        setRegistrationOpen(
          value,
        );
      },
      [
        preparationStatus,
        selectedEvent,
      ],
    );

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
 * UI lifecycle guard.
 *
 * Only upcoming events may still have their
 * municipal preparation changed.
 */
      const selectedEventLockStatus =
        getPreparationLockStatus(
          selectedEvent,
        );

      if (
        selectedEventLockStatus
      ) {
        alert(
          getPreparationLockMessage(
            selectedEventLockStatus,
          ),
        );

        setRegistrationOpen(false);

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
       * Prepared requires venue.
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
       * Prepared requires schedule.
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
         * Re-read assignment to protect
         * against stale UI data.
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
         * Re-read provincial event.
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

        /*
  * Latest lifecycle guard.
  *
  * Re-check the database immediately before
  * saving so stale browser data cannot modify
  * an event that already started, completed,
  * or was cancelled.
  */
        const latestMunicipalStatus =
          normalizeStatus(
            latestAssignment.municipal_status,
          );

        const latestProvincialStatus =
          normalizeStatus(
            latestEvent.status,
          );

        let latestLockStatus:
          | PreparationLockStatus
          | null = null;

        if (
          latestMunicipalStatus ===
          "cancelled" ||
          latestProvincialStatus ===
          "cancelled"
        ) {
          latestLockStatus =
            "cancelled";
        } else if (
          latestProvincialStatus ===
          "completed"
        ) {
          latestLockStatus =
            "completed";
        } else if (
          latestProvincialStatus ===
          "ongoing"
        ) {
          latestLockStatus =
            "ongoing";
        }

        if (latestLockStatus) {
          alert(
            getPreparationLockMessage(
              latestLockStatus,
            ),
          );

          setRegistrationOpen(false);

          closePrepareModal();

          await fetchReceivedEvents();

          return;
        }

        /*
         * VENUE OWNERSHIP + LATEST STATUS GUARD
         *
         * This re-reads the venue immediately
         * before saving.
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
                capacity,
                status
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

          /*
           * Venue must belong to logged-in
           * municipal admin municipality.
           */
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

          /*
           * Latest inactive venue protection.
           */
          if (
            !isVenueActiveStatus(
              selectedVenue.status,
            )
          ) {
            const venueName =
              selectedVenue
                .venue_name ??
              "The selected venue";

            const message =
              `${venueName} is currently inactive and cannot be assigned to this event. Please select an active venue.`;

            setVenueError(
              `Venue Unavailable: ${message}`,
            );

            alert(
              `Venue Unavailable\n\n${message}`,
            );

            /*
             * Reload venue statuses.
             */
            await fetchReceivedEvents();

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
         * SAVE
         *
         * Existing DB venue schedule-conflict
         * trigger remains the final protection.
         *
         * New inactive venue DB trigger is also
         * the final authority.
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
           * Inactive venue DB trigger error.
           */
          if (
            isVenueUnavailableError(
              updateError.message,
            )
          ) {
            const message =
              "The selected venue is currently inactive and cannot be assigned to this event. Please select an active venue.";

            console.warn(
              "Inactive venue assignment prevented:",
              updateError.message,
            );

            setVenueError(
              `Venue Unavailable: ${message}`,
            );

            alert(
              `Venue Unavailable\n\n${message}`,
            );

            await fetchReceivedEvents();

            return;
          }

          /*
           * Existing schedule-conflict
           * database protection.
           */
          if (
            isVenueScheduleConflictError(
              updateError.message,
            )
          ) {
            const message =
              "This venue is already assigned to another event during the selected schedule. Please select another venue or use a non-overlapping schedule.";

            console.warn(
              "Venue schedule conflict prevented:",
              updateError.message,
            );

            setVenueError(
              `Venue Schedule Conflict: ${message}`,
            );

            alert(
              `Venue Schedule Conflict\n\n${message}`,
            );

            return;
          }

          console.error(
            "Preparation update error:",
            updateError,
          );

          alert(
            `Unable to update event preparation: ${updateError.message}`,
          );

          return;
        }

        if (
          !updatedRows ||
          updatedRows.length === 0
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

  const summary =
    useMemo(
      () =>
        getMunicipalDashboardSummary(
          receivedEvents,
        ),
      [
        receivedEvents,
      ],
    );

  return {
    municipality,

    receivedEvents,
    summary,
    loading,

    venues,
    venuesLoading,
    selectedVenueId,
    venueError,

    selectedEvent,
    localInstructions,
    registrationOpen,
    savingPreparation,
    preparationStatus,

    setLocalInstructions:
      handleLocalInstructionsChange,

    setRegistrationOpen:
      handleRegistrationOpenChange,

    handleVenueChange,

    openPrepareModal,
    closePrepareModal,

    handlePreparationStatusChange,

    savePreparation,

    refreshEvents:
      fetchReceivedEvents,
  };
}