"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import MunicipalDashboardHeader from "./components/MunicipalDashboardHeader";
import MunicipalDashboardSummary from "./components/MunicipalDashboardSummary";
import PrepareEventModal from "./components/PrepareEventModal";
import ReceivedEventsSection from "./components/ReceivedEventsSection";
import useMunicipalDashboard from "./hooks/useMunicipalDashboard";

type NotificationTargetEvent = {
  id?: string | number | null;
  event_id?: string | number | null;
  event?: {
    id?: string | number | null;
  } | null;
};

export default function MunicipalDashboardPage() {
  const router = useRouter();

  const notificationTargetHandled = useRef(false);
  const [highlightedEventId, setHighlightedEventId] =
    useState<string | null>(null);

  const {
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
  } = useMunicipalDashboard();

  useEffect(() => {
    if (
      loading ||
      notificationTargetHandled.current ||
      receivedEvents.length === 0
    ) {
      return;
    }

    const searchParameters = new URLSearchParams(
      window.location.search,
    );

    const assignmentId =
      searchParameters.get("assignmentId");

    const eventId =
      searchParameters.get("eventId");

    /*
     * Normal dashboard visit:
     * walang notification target sa URL.
     */
    if (!assignmentId && !eventId) {
      return;
    }

    const targetEvent = receivedEvents.find(
      (receivedEvent) => {
        const candidate =
          receivedEvent as unknown as NotificationTargetEvent;

        const candidateAssignmentId =
          candidate.id != null
            ? String(candidate.id)
            : "";

        const candidateEventId =
          candidate.event_id != null
            ? String(candidate.event_id)
            : candidate.event?.id != null
              ? String(candidate.event.id)
              : "";

        const assignmentMatches =
          Boolean(assignmentId) &&
          candidateAssignmentId === assignmentId;

        const eventMatches =
          Boolean(eventId) &&
          candidateEventId === eventId;

        return assignmentMatches || eventMatches;
      },
    );

    /*
     * Huwag ulit-ulitin ang automatic opening
     * kapag nag-render muli ang dashboard.
     */
    notificationTargetHandled.current = true;

    /*
     * Alisin ang query parameters kahit hindi nakita
     * ang event para hindi ito paulit-ulit subukan.
     */
    if (!targetEvent) {
      router.replace(
        "/dashboard/municipal",
        {
          scroll: false,
        },
      );

      return;
    }

    /*
     * Buksan ang preparation modal ng event
     * na kaugnay ng notification.
     */
    const targetAssignmentId = String(
      targetEvent.id,
    );

    setHighlightedEventId(targetAssignmentId);

    openPrepareModal(targetEvent);

    router.replace(
      "/dashboard/municipal",
      {
        scroll: false,
      },
    );

    const highlightTimer = window.setTimeout(() => {
      setHighlightedEventId(null);
    }, 4000);

    return () => {
      window.clearTimeout(highlightTimer);
    };
  }, [
    loading,
    receivedEvents,
    openPrepareModal,
    router,
  ]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <MunicipalDashboardHeader
          municipality={municipality}
        />

        <MunicipalDashboardSummary
          summary={summary}
        />

        <ReceivedEventsSection
          events={receivedEvents}
          loading={loading}
          highlightedEventId={highlightedEventId}
          onPrepare={openPrepareModal}
        />
      </div>

      <PrepareEventModal
        selectedEvent={selectedEvent}
        preparationStatus={preparationStatus}
        localInstructions={localInstructions}
        registrationOpen={registrationOpen}
        saving={savingPreparation}
        onStatusChange={
          handlePreparationStatusChange
        }
        onInstructionsChange={
          setLocalInstructions
        }
        onRegistrationChange={
          setRegistrationOpen
        }
        onClose={closePrepareModal}
        onSave={savePreparation}
      />
    </main>
  );
}