"use client";

import { useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  PencilLine,
  X,
} from "lucide-react";

import MunicipalDashboardHeader from "./components/MunicipalDashboardHeader";
import MunicipalDashboardSummary from "./components/MunicipalDashboardSummary";
import PrepareEventModal from "./components/PrepareEventModal";
import ReceivedEventsSection from "./components/ReceivedEventsSection";
import useMunicipalDashboard from "./hooks/useMunicipalDashboard";

type NotificationTargetEvent = {
  id?: string | number | null;
  event_id?: string | number | null;
  event_municipality_id?: string | number | null;
  assignment_id?: string | number | null;
  eventMunicipalityId?: string | number | null;

  event?: {
    id?: string | number | null;
  } | null;

  events?: {
    id?: string | number | null;
  } | null;
};

type NotificationType = string | null;

function normalizeId(
  value: string | number | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function getAssignmentIds(
  receivedEvent: NotificationTargetEvent,
) {
  return [
    receivedEvent.id,
    receivedEvent.event_municipality_id,
    receivedEvent.assignment_id,
    receivedEvent.eventMunicipalityId,
  ]
    .map(normalizeId)
    .filter(Boolean);
}

function getEventIds(
  receivedEvent: NotificationTargetEvent,
) {
  return [
    receivedEvent.event_id,
    receivedEvent.event?.id,
    receivedEvent.events?.id,
  ]
    .map(normalizeId)
    .filter(Boolean);
}

export default function MunicipalDashboardPage() {
  /*
   * Prevent the notification target from opening
   * repeatedly during component re-renders.
   */
  const notificationTargetHandled = useRef(false);

  const [
    highlightedEventId,
    setHighlightedEventId,
  ] = useState<string | null>(null);

  const [
    notificationType,
    setNotificationType,
  ] = useState<NotificationType>(null);

  const [
    notificationMessage,
    setNotificationMessage,
  ] = useState<string | null>(null);

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

  /*
   * OPEN EXACT RECEIVED EVENT FROM NOTIFICATION
   *
   * Supported URL:
   *
   * /dashboard/municipal
   * ?assignmentId=...
   * &eventId=...
   * &notificationType=event_updated
   */
  useEffect(() => {
    if (
      loading ||
      notificationTargetHandled.current
    ) {
      return;
    }

    const searchParameters =
      new URLSearchParams(window.location.search);

    const assignmentId = normalizeId(
      searchParameters.get("assignmentId"),
    );

    const eventId = normalizeId(
      searchParameters.get("eventId"),
    );

    const targetNotificationType =
      searchParameters.get("notificationType");

    /*
     * Normal dashboard visit:
     * no notification-linked event in the URL.
     */
    if (!assignmentId && !eventId) {
      return;
    }

    /*
     * First, search using assignmentId because this
     * identifies the exact event_municipalities row.
     */
    let targetEvent = assignmentId
      ? receivedEvents.find((receivedEvent) => {
          const candidate =
            receivedEvent as unknown as NotificationTargetEvent;

          return getAssignmentIds(candidate).includes(
            assignmentId,
          );
        })
      : undefined;

    /*
     * Use the provincial event ID as fallback.
     */
    if (!targetEvent && eventId) {
      targetEvent = receivedEvents.find(
        (receivedEvent) => {
          const candidate =
            receivedEvent as unknown as NotificationTargetEvent;

          return getEventIds(candidate).includes(eventId);
        },
      );
    }

    /*
     * Prevent the same notification target from
     * being processed repeatedly.
     */
    notificationTargetHandled.current = true;

    /*
     * Remove query parameters without triggering
     * another Next.js navigation.
     *
     * Using router.replace here can cause the
     * selected event modal to reset immediately.
     */
    window.history.replaceState(
      {},
      "",
      "/dashboard/municipal",
    );

    /*
     * Target event was not found in receivedEvents.
     */
    if (!targetEvent) {
      console.warn(
        "Notification-linked municipal event was not found.",
        {
          assignmentId,
          eventId,
          notificationType:
            targetNotificationType,
        },
      );

      setNotificationType(
        targetNotificationType,
      );

      setNotificationMessage(
        "The event linked to this notification could not be found in your current received-events list.",
      );

      return;
    }

    const candidate =
      targetEvent as unknown as NotificationTargetEvent;

    const targetAssignmentId =
      getAssignmentIds(candidate)[0] ||
      assignmentId ||
      eventId;

    /*
     * Temporarily highlight the matching card.
     */
    setHighlightedEventId(
      targetAssignmentId,
    );

    setNotificationType(
      targetNotificationType,
    );

    /*
     * Display the correct dashboard notice.
     */
    if (
      targetNotificationType ===
      "event_cancelled"
    ) {
      setNotificationMessage(
        "This provincial event has been cancelled. Municipal preparation and participant registration have been stopped.",
      );
    } else if (
      targetNotificationType ===
      "event_updated"
    ) {
      setNotificationMessage(
        "This provincial event was recently updated. Review its latest schedule, memo, and event details.",
      );
    } else {
      setNotificationMessage(null);
    }

    /*
     * Open the exact received-event modal.
     */
    openPrepareModal(targetEvent);

    /*
     * Remove the card highlight after four seconds.
     */
    const highlightTimer =
      window.setTimeout(() => {
        setHighlightedEventId(null);
      }, 4000);

    return () => {
      window.clearTimeout(
        highlightTimer,
      );
    };
  }, [
    loading,
    receivedEvents,
    openPrepareModal,
  ]);

  const closeNotificationMessage = () => {
    setNotificationMessage(null);
    setNotificationType(null);
  };

  const isCancellationNotice =
    notificationType === "event_cancelled";

  const isUpdateNotice =
    notificationType === "event_updated";

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <MunicipalDashboardHeader
          municipality={municipality}
        />

        {/* NOTIFICATION-LINKED EVENT MESSAGE */}
        {notificationMessage && (
          <section
            className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm sm:p-5 ${
              isCancellationNotice
                ? "border-red-200 bg-red-50"
                : isUpdateNotice
                  ? "border-violet-200 bg-violet-50"
                  : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-3 pr-10">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isCancellationNotice
                    ? "bg-red-100 text-red-700"
                    : isUpdateNotice
                      ? "bg-violet-100 text-violet-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {isUpdateNotice ? (
                  <PencilLine className="h-5 w-5" />
                ) : (
                  <CircleAlert className="h-5 w-5" />
                )}
              </div>

              <div>
                <h2
                  className={`text-sm font-bold ${
                    isCancellationNotice
                      ? "text-red-900"
                      : isUpdateNotice
                        ? "text-violet-900"
                        : "text-amber-900"
                  }`}
                >
                  {isCancellationNotice
                    ? "Event Cancelled"
                    : isUpdateNotice
                      ? "Event Updated"
                      : "Notification Event"}
                </h2>

                <p
                  className={`mt-1 text-sm leading-6 ${
                    isCancellationNotice
                      ? "text-red-700"
                      : isUpdateNotice
                        ? "text-violet-700"
                        : "text-amber-700"
                  }`}
                >
                  {notificationMessage}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                closeNotificationMessage
              }
              aria-label="Close notification message"
              className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg transition ${
                isCancellationNotice
                  ? "text-red-500 hover:bg-red-100 hover:text-red-700"
                  : isUpdateNotice
                    ? "text-violet-500 hover:bg-violet-100 hover:text-violet-700"
                    : "text-amber-500 hover:bg-amber-100 hover:text-amber-700"
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </section>
        )}

        <MunicipalDashboardSummary
          summary={summary}
        />

        <ReceivedEventsSection
          events={receivedEvents}
          loading={loading}
          highlightedEventId={
            highlightedEventId
          }
          onPrepare={openPrepareModal}
        />
      </div>

      <PrepareEventModal
        selectedEvent={selectedEvent}
        preparationStatus={
          preparationStatus
        }
        localInstructions={
          localInstructions
        }
        registrationOpen={
          registrationOpen
        }
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