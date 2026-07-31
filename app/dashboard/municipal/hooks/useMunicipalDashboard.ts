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
  registration_open: boolean | null;
  local_instructions: string | null;
  created_at: string | null;
};

type LatestAssignmentRow = {
  id: string;
  event_id: string;
  municipal_status: string | null;
  registration_open: boolean | null;
};

type LatestEventStatusRow = {
  id: string;
  status: string | null;
};

type RegisteredRsvpRow = {
  event_municipality_id: string | null;
};

/*
 * Convert any database status into a consistent
 * lowercase string.
 */
function normalizeStatus(
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

export default function useMunicipalDashboard() {
  const [municipality, setMunicipality] =
    useState("");

  const [receivedEvents, setReceivedEvents] =
    useState<ReceivedEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedEvent, setSelectedEvent] =
    useState<ReceivedEvent | null>(null);

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
  ] = useState<PreparationStatus>("pending");

  /*
   * CLOSE PREPARATION MODAL
   */
  const closePrepareModal =
    useCallback(() => {
      setSelectedEvent(null);
      setPreparationStatus("pending");
      setLocalInstructions("");
      setRegistrationOpen(false);
    }, []);

  /*
   * FETCH RECEIVED MUNICIPAL EVENTS
   */
  const fetchReceivedEvents =
    useCallback(async () => {
      setLoading(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error(
            "Unable to get municipal admin:",
            userError?.message,
          );

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
          setReceivedEvents([]);
          return;
        }

        const municipalName =
          profile.municipality.trim();

        setMunicipality(municipalName);

        /*
         * GET MUNICIPAL EVENT ASSIGNMENTS
         */
        const {
          data: targetRowsData,
          error: targetError,
        } = await supabase
          .from("event_municipalities")
          .select(
            `
              id,
              event_id,
              municipality,
              municipal_status,
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
          (targetRowsData ?? []) as TargetRow[];

        if (targetRows.length === 0) {
          setReceivedEvents([]);
          return;
        }

        /*
         * LOAD REGISTERED PARTICIPANT COUNTS
         *
         * Load all registered RSVP rows for the
         * municipality's event assignments in one
         * request, then group them by assignment ID.
         */
        const assignmentIds = Array.from(
          new Set(
            targetRows.map((row) =>
              String(row.id),
            ),
          ),
        );

        const {
          data: registeredRsvpRowsData,
          error: registeredRsvpRowsError,
        } = await supabase
          .from("rsvps")
          .select("event_municipality_id")
          .in(
            "event_municipality_id",
            assignmentIds,
          )
          .eq("status", "registered");

        if (registeredRsvpRowsError) {
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

        for (const rsvpRow of registeredRsvpRows) {
          const assignmentId = String(
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

        const eventIds = Array.from(
          new Set(
            targetRows
              .map((row) => row.event_id)
              .filter(
                (
                  eventId,
                ): eventId is string =>
                  typeof eventId ===
                    "string" &&
                  eventId.trim().length >
                    0,
              ),
          ),
        );

        if (eventIds.length === 0) {
          setReceivedEvents([]);
          return;
        }

        /*
         * LOAD ALL NON-DRAFT EVENTS.
         *
         * Cancelled events remain included so
         * municipal admins can view their
         * cancellation notice and records.
         */
        const {
          data: visibleEventsData,
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
          visibleEvents.length === 0
        ) {
          setReceivedEvents([]);
          return;
        }

        const eventsById =
          new Map<string, EventRow>(
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
                    /*
                     * event_municipalities.id
                     *
                     * This is the exact assignment ID
                     * used by notification navigation.
                     */
                    id: String(
                      row.id,
                    ),

                    event_id:
                      eventId,

                    municipality:
                      row.municipality ??
                      municipalName,

                    /*
                     * Existing preparation utilities
                     * currently support pending,
                     * preparing, and prepared.
                     *
                     * Cancellation is still detected
                     * using event.status and the latest
                     * database guard before saving.
                     */
                    municipal_status:
                      normalizePreparationStatus(
                        row.municipal_status,
                      ),

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
                        String(row.id),
                      ) ?? 0,

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
                  firstItem.event
                    ?.start_at
                    ? new Date(
                        firstItem.event.start_at,
                      ).getTime()
                    : 0;

                const secondDate =
                  secondItem.event
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

        setReceivedEvents([]);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void fetchReceivedEvents();
  }, [fetchReceivedEvents]);

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

        /*
         * Cancelled events remain viewable,
         * but all editable controls will be
         * disabled by PrepareEventModal.
         */
        setPreparationStatus(
          cancelled
            ? "pending"
            : currentStatus,
        );

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
        /*
         * UI-level guard.
         */
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
          value !== "prepared"
        ) {
          setRegistrationOpen(
            false,
          );
        }
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

      /*
       * FIRST GUARD:
       * Check the event currently loaded
       * in the municipal dashboard.
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
         * Re-read the municipal assignment
         * directly from the database.
         *
         * This protects against stale UI data.
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
              registration_open
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

        if (!latestEventData) {
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
         * The .neq("municipal_status", "cancelled")
         * condition prevents the update if the
         * assignment becomes cancelled immediately
         * before this statement is executed.
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
          console.error(
            "Preparation update error:",
            updateError.message,
          );

          alert(
            `Unable to update event preparation: ${updateError.message}`,
          );

          return;
        }

        /*
         * No row was updated because the
         * assignment was cancelled or changed
         * before the save completed.
         */
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
      preparationStatus,
      registrationOpen,
      savingPreparation,
      selectedEvent,
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
    selectedEvent,
    localInstructions,
    registrationOpen,
    savingPreparation,
    preparationStatus,
    setLocalInstructions,
    setRegistrationOpen,
    openPrepareModal,
    closePrepareModal,
    handlePreparationStatusChange,
    savePreparation,
    refreshEvents:
      fetchReceivedEvents,
  };
}