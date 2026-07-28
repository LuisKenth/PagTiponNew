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

export default function useMunicipalDashboard() {
  const [municipality, setMunicipality] = useState("");
  const [receivedEvents, setReceivedEvents] =
    useState<ReceivedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] =
    useState<ReceivedEvent | null>(null);
  const [localInstructions, setLocalInstructions] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [savingPreparation, setSavingPreparation] = useState(false);
  const [preparationStatus, setPreparationStatus] =
    useState<PreparationStatus>("pending");

  const closePrepareModal = useCallback(() => {
    setSelectedEvent(null);
    setPreparationStatus("pending");
    setLocalInstructions("");
    setRegistrationOpen(false);
  }, []);

  const fetchReceivedEvents = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "Unable to get municipal admin:",
          userError?.message
        );
        setReceivedEvents([]);
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("municipality")
          .eq("id", user.id)
          .single();

      if (profileError || !profile?.municipality) {
        console.error(
          "Unable to get municipality:",
          profileError?.message
        );
        setMunicipality("");
        setReceivedEvents([]);
        return;
      }

      const municipalName = profile.municipality.trim();
      setMunicipality(municipalName);

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
          `
        )
        .ilike("municipality", municipalName)
        .order("created_at", { ascending: false });

      if (targetError) {
        console.error(
          "Unable to load municipality assignments:",
          targetError.message
        );
        setReceivedEvents([]);
        return;
      }

      const targetRows = (targetRowsData || []) as TargetRow[];

      if (targetRows.length === 0) {
        setReceivedEvents([]);
        return;
      }

      const eventIds = Array.from(
        new Set(
          targetRows
            .map((row) => row.event_id)
            .filter(
              (eventId): eventId is string =>
                typeof eventId === "string" &&
                eventId.trim().length > 0
            )
        )
      );

      if (eventIds.length === 0) {
        setReceivedEvents([]);
        return;
      }

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
          `
        )
        .in("id", eventIds)
        .neq("status", "draft")
        .order("start_at", { ascending: false });

      if (eventsError) {
        console.error(
          "Unable to load visible events:",
          eventsError.message
        );
        setReceivedEvents([]);
        return;
      }

      const visibleEvents =
        (visibleEventsData || []) as EventRow[];

      if (visibleEvents.length === 0) {
        setReceivedEvents([]);
        return;
      }

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
        ])
      );

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
                row.municipal_status
              ),
              registration_open: row.registration_open ?? false,
              local_instructions: row.local_instructions ?? null,
              created_at: row.created_at ?? null,
              event: matchedEvent,
            },
          ];
        })
        .sort((firstItem, secondItem) => {
          const firstDate = firstItem.event?.start_at
            ? new Date(firstItem.event.start_at).getTime()
            : 0;
          const secondDate = secondItem.event?.start_at
            ? new Date(secondItem.event.start_at).getTime()
            : 0;
          return secondDate - firstDate;
        });

      setReceivedEvents(mappedEvents);
    } catch (error) {
      console.error(
        "Unexpected received events error:",
        error
      );
      setReceivedEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReceivedEvents();
  }, [fetchReceivedEvents]);

  const openPrepareModal = useCallback((item: ReceivedEvent) => {
    const currentStatus = normalizePreparationStatus(
      item.municipal_status
    );

    setSelectedEvent(item);
    setPreparationStatus(currentStatus);
    setLocalInstructions(item.local_instructions || "");
    setRegistrationOpen(
      currentStatus === "prepared" &&
        item.registration_open === true
    );
  }, []);

  const handlePreparationStatusChange = useCallback(
    (value: PreparationStatus) => {
      setPreparationStatus(value);

      if (value !== "prepared") {
        setRegistrationOpen(false);
      }
    },
    []
  );

  const savePreparation = useCallback(async () => {
    if (!selectedEvent || savingPreparation) {
      return;
    }

    const trimmedInstructions = localInstructions.trim();

    if (
      preparationStatus !== "pending" &&
      !trimmedInstructions
    ) {
      alert(
        "Please enter local instructions before marking the event as preparing or prepared."
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

      const savedStatus = preparationStatus;

      const { error } = await supabase
        .from("event_municipalities")
        .update({
          municipal_status: savedStatus,
          local_instructions: trimmedInstructions || null,
          registration_open:
            savedStatus === "prepared"
              ? registrationOpen
              : false,
          prepared_by:
            savedStatus === "prepared"
              ? user.id
              : null,
        })
        .eq("id", selectedEvent.id);

      if (error) {
        console.error(
          "Preparation update error:",
          error.message
        );
        alert(
          `Unable to update event preparation: ${error.message}`
        );
        return;
      }

      closePrepareModal();
      await fetchReceivedEvents();

      alert(
        `Event preparation status updated to ${getPreparationStatusLabel(
          savedStatus
        )}.`
      );
    } catch (error) {
      console.error(
        "Unexpected preparation update error:",
        error
      );
      alert(
        error instanceof Error
          ? `Unable to update event preparation: ${error.message}`
          : "An unexpected error occurred while updating the event."
      );
    } finally {
      setSavingPreparation(false);
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

  const summary = useMemo(
    () => getMunicipalDashboardSummary(receivedEvents),
    [receivedEvents]
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
    refreshEvents: fetchReceivedEvents,
  };
}
