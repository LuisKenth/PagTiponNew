"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  CircleAlert,
  PencilLine,
  X,
} from "lucide-react";

import MunicipalDashboardHeader from "./components/MunicipalDashboardHeader";
import MunicipalDashboardSummary from "./components/MunicipalDashboardSummary";
import ReceivedEventsSection from "./components/ReceivedEventsSection";
import useMunicipalDashboard from "./hooks/useMunicipalDashboard";

import type {
  ReceivedEvent,
} from "./types/municipalDashboard";

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

type NotificationType =
  | string
  | null;

function normalizeId(
  value:
    | string
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
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
  const router = useRouter();

  /*
   * Prevent the same notification-linked
   * navigation from being processed repeatedly
   * during re-renders.
   */
  const notificationTargetHandled =
    useRef(false);

  const [
    notificationType,
    setNotificationType,
  ] =
    useState<NotificationType>(
      null,
    );

  const [
    notificationMessage,
    setNotificationMessage,
  ] =
    useState<string | null>(
      null,
    );

  /*
   * Dashboard now loads event information only.
   *
   * Preparation editing is intentionally NOT
   * exposed here. The Event Preparation page
   * is the only municipal preparation workspace.
   */
  const {
    municipality,
    receivedEvents,
    summary,
    loading,
    venues,
  } = useMunicipalDashboard();

  /*
   * Navigate to the authoritative Event
   * Preparation page for a specific municipal
   * event assignment.
   */
  function openPreparationPage(
    item: ReceivedEvent,
  ) {
    const assignmentId =
      normalizeId(item.id);

    if (!assignmentId) {
      return;
    }

    router.push(
      `/dashboard/municipal/preparations?assignmentId=${encodeURIComponent(
        assignmentId,
      )}`,
    );
  }

  /*
   * HANDLE NOTIFICATION-LINKED EVENTS
   *
   * Previous behavior:
   * - notification opened the preparation modal
   *   directly on the Municipal Dashboard.
   *
   * New behavior:
   * - find the exact municipal event assignment
   * - redirect to the Event Preparation page
   * - Event Preparation becomes the only page
   *   that can manage preparation controls.
   *
   * Supported incoming URL:
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
      new URLSearchParams(
        window.location.search,
      );

    const assignmentId =
      normalizeId(
        searchParameters.get(
          "assignmentId",
        ),
      );

    const eventId =
      normalizeId(
        searchParameters.get(
          "eventId",
        ),
      );

    const targetNotificationType =
      searchParameters.get(
        "notificationType",
      );

    /*
     * Normal dashboard visit.
     */
    if (
      !assignmentId &&
      !eventId
    ) {
      return;
    }

    /*
     * First try the exact
     * event_municipalities assignment ID.
     */
    let targetEvent =
      assignmentId
        ? receivedEvents.find(
            (
              receivedEvent,
            ) => {
              const candidate =
                receivedEvent as unknown as NotificationTargetEvent;

              return getAssignmentIds(
                candidate,
              ).includes(
                assignmentId,
              );
            },
          )
        : undefined;

    /*
     * Fall back to provincial event ID.
     */
    if (
      !targetEvent &&
      eventId
    ) {
      targetEvent =
        receivedEvents.find(
          (
            receivedEvent,
          ) => {
            const candidate =
              receivedEvent as unknown as NotificationTargetEvent;

            return getEventIds(
              candidate,
            ).includes(
              eventId,
            );
          },
        );
    }

    notificationTargetHandled.current =
      true;

    /*
     * Notification target could not be found.
     *
     * Stay on the Dashboard and display a
     * helpful notice.
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

      window.history.replaceState(
        {},
        "",
        "/dashboard/municipal",
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
      getAssignmentIds(
        candidate,
      )[0] ||
      assignmentId;

    if (!targetAssignmentId) {
      window.history.replaceState(
        {},
        "",
        "/dashboard/municipal",
      );

      setNotificationType(
        targetNotificationType,
      );

      setNotificationMessage(
        "The municipal event assignment linked to this notification could not be identified.",
      );

      return;
    }

    /*
     * Build the Event Preparation URL.
     *
     * notificationType is preserved so the
     * Preparation page can optionally show
     * notification-specific context.
     */
    const destinationParameters =
      new URLSearchParams();

    destinationParameters.set(
      "assignmentId",
      targetAssignmentId,
    );

    if (targetNotificationType) {
      destinationParameters.set(
        "notificationType",
        targetNotificationType,
      );
    }

    /*
     * Replace instead of push because the
     * notification-linked Dashboard URL is only
     * an intermediate route.
     */
    router.replace(
      `/dashboard/municipal/preparations?${destinationParameters.toString()}`,
    );
  }, [
    loading,
    receivedEvents,
    router,
  ]);

  const closeNotificationMessage =
    () => {
      setNotificationMessage(null);
      setNotificationType(null);
    };

  const isCancellationNotice =
    notificationType ===
    "event_cancelled";

  const isUpdateNotice =
    notificationType ===
    "event_updated";

  return (
    <div className="space-y-5 sm:space-y-6">
      <MunicipalDashboardHeader
        municipality={municipality}
      />

      {/* Notification lookup message */}
      {notificationMessage && (
        <section
          className={`relative overflow-hidden rounded-2xl border shadow-sm ${
            isCancellationNotice
              ? "border-red-200 bg-red-50"
              : isUpdateNotice
                ? "border-violet-200 bg-violet-50"
                : "border-amber-200 bg-amber-50"
          }`}
        >
          <div
            className={`h-1 w-full ${
              isCancellationNotice
                ? "bg-red-500"
                : isUpdateNotice
                  ? "bg-violet-500"
                  : "bg-amber-500"
            }`}
          />

          <div className="flex items-start gap-3 p-4 pr-12 sm:p-5 sm:pr-14">
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

            <div className="min-w-0">
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
                    : "Event Notification"}
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
            className={`absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg transition sm:right-4 sm:top-5 ${
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
        venues={venues}
        loading={loading}
        highlightedEventId={null}
        onPrepare={
          openPreparationPage
        }
      />
    </div>
  );
}