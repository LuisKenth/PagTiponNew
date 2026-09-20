"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { usePathname } from "next/navigation";

import {
  CheckCircle2,
  CircleAlert,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type EmailDeliveryStatus =
  | "queued"
  | "completed"
  | "partial"
  | "failed";

type EmailNotificationType =
  | "event_published"
  | "event_cancelled";

type EmailDeliveryRow = {
  id: string;

  event_id: string;

  notification_type: string;

  status:
    EmailDeliveryStatus;

  total_recipients: number;

  sent_count: number;

  failed_count: number;

  failed_messages:
    | string[]
    | null;

  created_at: string;

  updated_at: string;

  completed_at:
    | string
    | null;
};

type ToastState = {
  type:
    | "success"
    | "warning"
    | "error";

  title: string;

  message: string;
};

type TrackingEventDetail = {
  eventId: string;

  notificationType?:
    EmailNotificationType;
};

const STORAGE_KEY =
  "pagtipon_pending_event_email_id";

const TYPE_STORAGE_KEY =
  "pagtipon_pending_event_email_type";

const TRACKING_EVENT =
  "pagtipon:event-email-tracking";

export default function ProvincialEmailStatusToast() {
  const pathname =
    usePathname();

  const [
    toast,
    setToast,
  ] =
    useState<ToastState | null>(
      null,
    );

  const timeoutRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const channelRef =
    useRef<
      ReturnType<
        typeof supabase.channel
      > | null
    >(null);

  const pollingRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);

  /*
   * =========================================================
   * CLOSE TOAST
   * =========================================================
   *
   * Only remove the pending event ID after
   * the user has already seen the result.
   */
  const closeToast =
    () => {
      if (
        timeoutRef.current
      ) {
        clearTimeout(
          timeoutRef.current,
        );

        timeoutRef.current =
          null;
      }

      sessionStorage.removeItem(
        STORAGE_KEY,
      );

      sessionStorage.removeItem(
        TYPE_STORAGE_KEY,
      );

      setToast(
        null,
      );
    };

  useEffect(() => {
    let finished =
      false;

    let activeEventId:
      | string
      | null =
      null;

    let activeNotificationType:
      | EmailNotificationType
      | null =
      null;

    /*
     * =======================================================
     * CLEANUP HELPERS
     * =======================================================
     */

    const clearToastTimer =
      () => {
        if (
          timeoutRef.current
        ) {
          clearTimeout(
            timeoutRef.current,
          );

          timeoutRef.current =
            null;
        }
      };

    const clearPolling =
      () => {
        if (
          pollingRef.current
        ) {
          clearInterval(
            pollingRef.current,
          );

          pollingRef.current =
            null;
        }
      };

    const removeRealtimeChannel =
      async () => {
        if (
          channelRef.current
        ) {
          const channel =
            channelRef.current;

          channelRef.current =
            null;

          await supabase.removeChannel(
            channel,
          );
        }
      };

    const cleanupTracking =
      () => {
        clearPolling();

        void removeRealtimeChannel();
      };

    /*
     * =======================================================
     * DISPLAY FINAL EMAIL RESULT
     * =======================================================
     */

    const showToast = (
      row: EmailDeliveryRow,
    ) => {
      /*
       * Sending is still in progress.
       */
      if (
        row.status ===
        "queued"
      ) {
        return;
      }

      /*
       * Prevent duplicate result handling
       * inside the same tracking lifecycle.
       */
      if (
        finished
      ) {
        return;
      }

      finished =
        true;

      console.log(
        "Email delivery toast received:",
        {
          eventId:
            row.event_id,

          status:
            row.status,

          totalRecipients:
            row.total_recipients,

          sent:
            row.sent_count,

          failed:
            row.failed_count,
        },
      );

      /*
       * Stop Realtime and polling because
       * we already have the final result.
       */
      cleanupTracking();

      /*
       * IMPORTANT:
       *
       * Do NOT remove STORAGE_KEY here.
       *
       * Navigation may still be completing.
       * Keeping the ID allows the destination
       * page to recover and display the toast
       * if this component is refreshed/remounted.
       */

      const total =
        row.total_recipients ??
        0;

      const sent =
        row.sent_count ??
        0;

      const failed =
        row.failed_count ??
        0;

      const isCancellationNotification =
        row.notification_type ===
        "event_cancelled";

      /*
       * =====================================================
       * SUCCESS
       * =====================================================
       */

      if (
        row.status ===
        "completed"
      ) {
        setToast({
          type:
            "success",

          title:
            isCancellationNotification
              ? "Cancellation emails sent"
              : "Email notifications sent",

          message:
            `${
              isCancellationNotification
                ? "Cancellation email notifications"
                : "Email notifications"
            } sent to ${sent} of ${total} Municipal Admin${
              total === 1
                ? ""
                : "s"
            }.`,
        });
      }

      /*
       * =====================================================
       * PARTIAL SUCCESS
       * =====================================================
       */
      else if (
        row.status ===
        "partial"
      ) {
        setToast({
          type:
            "warning",

          title:
            isCancellationNotification
              ? "Some cancellation emails failed"
              : "Some emails failed",

          message:
            `${
              isCancellationNotification
                ? "Cancellation email notifications"
                : "Email notifications"
            } sent to ${sent} of ${total} Municipal Admin${
              total === 1
                ? ""
                : "s"
            }. ${failed} email${
              failed === 1
                ? ""
                : "s"
            } could not be sent.`,
        });
      }

      /*
       * =====================================================
       * COMPLETE FAILURE
       * =====================================================
       */
      else {
        const failedTotal =
          failed ||
          total;

        setToast({
          type:
            "error",

          title:
            "Email notification failed",

          message:
            `The event was ${
              row.notification_type ===
              "event_cancelled"
                ? "cancelled"
                : "published"
            } successfully, but ${failedTotal} email notification${
              failedTotal ===
              1
                ? ""
                : "s"
            } could not be sent.`,
        });
      }

      /*
       * Keep the notification visible for
       * 30 seconds during testing.
       *
       * STORAGE_KEY is removed only when the
       * toast finishes its display period.
       */
      clearToastTimer();

      timeoutRef.current =
        setTimeout(
          () => {
            sessionStorage.removeItem(
              STORAGE_KEY,
            );

            sessionStorage.removeItem(
              TYPE_STORAGE_KEY,
            );

            setToast(
              null,
            );

            timeoutRef.current =
              null;
          },
          30000,
        );
    };

    /*
     * =======================================================
     * LOAD CURRENT TRACKING STATUS
     * =======================================================
     */

    const loadCurrentStatus =
      async (
        eventId: string,
        notificationType:
          EmailNotificationType,
      ) => {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "event_email_deliveries",
            )
            .select(
              `
                id,
                event_id,
                notification_type,
                status,
                total_recipients,
                sent_count,
                failed_count,
                failed_messages,
                created_at,
                updated_at,
                completed_at
              `,
            )
            .eq(
              "event_id",
              eventId,
            )
            .eq(
              "notification_type",
              notificationType,
            )
            .maybeSingle();

        if (
          error
        ) {
          console.warn(
            "Could not load event email delivery status:",
            error.message,
          );

          return;
        }

        if (
          data
        ) {
          showToast(
            data as EmailDeliveryRow,
          );
        }
      };

    /*
     * =======================================================
     * START TRACKING
     * =======================================================
     */

    const startTracking =
      async (
        eventId: string,
        notificationType:
          EmailNotificationType =
          "event_published",
      ) => {
        if (
          !eventId
        ) {
          return;
        }

        /*
         * Avoid duplicate setup.
         */
        if (
          activeEventId ===
            eventId &&
          activeNotificationType ===
            notificationType &&
          !finished
        ) {
          return;
        }

        finished =
          false;

        activeEventId =
          eventId;

        activeNotificationType =
          notificationType;

        cleanupTracking();

        /*
         * Keep the pending ID available across
         * route navigation and refresh.
         */
        sessionStorage.setItem(
          STORAGE_KEY,
          eventId,
        );

        sessionStorage.setItem(
          TYPE_STORAGE_KEY,
          notificationType,
        );

        console.log(
          "Starting email delivery tracking:",
          {
            eventId,
            notificationType,
          },
        );

        /*
         * First database check.
         *
         * Brevo may already have finished by
         * the time tracking starts.
         */
        await loadCurrentStatus(
          eventId,
          notificationType,
        );

        if (
          finished
        ) {
          return;
        }

        /*
         * =====================================================
         * SUPABASE REALTIME
         * =====================================================
         */

        const channel =
          supabase
            .channel(
              `provincial-event-email-${eventId}-${Date.now()}`,
            )
            .on(
              "postgres_changes",
              {
                event:
                  "UPDATE",

                schema:
                  "public",

                table:
                  "event_email_deliveries",

                filter:
                  `event_id=eq.${eventId}`,
              },
              (
                payload,
              ) => {
                const row =
                  payload.new as EmailDeliveryRow;

                if (
                  row.notification_type !==
                  notificationType
                ) {
                  return;
                }

                console.log(
                  "Email delivery realtime update:",
                  row,
                );

                showToast(
                  row,
                );
              },
            )
            .subscribe(
              (
                status,
              ) => {
                console.log(
                  "Email delivery realtime status:",
                  status,
                );

                if (
                  status ===
                  "SUBSCRIBED"
                ) {
                  /*
                   * Check again because delivery
                   * might finish while Realtime
                   * is connecting.
                   */
                  void loadCurrentStatus(
                    eventId,
                    notificationType,
                  );
                }
              },
            );

        channelRef.current =
          channel;

        /*
         * =====================================================
         * POLLING FALLBACK
         * =====================================================
         *
         * Even if Realtime misses an event,
         * check the database every 2 seconds.
         */

        pollingRef.current =
          setInterval(
            () => {
              if (
                !finished
              ) {
                void loadCurrentStatus(
                  eventId,
                  notificationType,
                );
              }
            },
            2000,
          );
      };

    /*
     * =======================================================
     * CUSTOM EVENT LISTENER
     * =======================================================
     */

    const handleTrackingEvent =
      (
        event: Event,
      ) => {
        const customEvent =
          event as CustomEvent<TrackingEventDetail>;

        const eventId =
          customEvent.detail
            ?.eventId;

        const notificationType =
          customEvent.detail
            ?.notificationType ??
          "event_published";

        if (
          !eventId
        ) {
          return;
        }

        console.log(
          "Received new email tracking event:",
          {
            eventId,
            notificationType,
          },
        );

        void startTracking(
          eventId,
          notificationType,
        );
      };

    window.addEventListener(
      TRACKING_EVENT,
      handleTrackingEvent,
    );

    /*
     * =======================================================
     * NAVIGATION / REFRESH RECOVERY
     * =======================================================
     *
     * usePathname causes this effect to run again
     * when the Provincial Admin navigates from
     * Create Event → Provincial Events.
     */

    const existingEventId =
      sessionStorage.getItem(
        STORAGE_KEY,
      );

    const storedNotificationType =
      sessionStorage.getItem(
        TYPE_STORAGE_KEY,
      );

    const existingNotificationType:
      EmailNotificationType =
      storedNotificationType ===
      "event_cancelled"
        ? "event_cancelled"
        : "event_published";

    if (
      existingEventId
    ) {
      console.log(
        "Recovering pending email tracking:",
        {
          eventId:
            existingEventId,
          notificationType:
            existingNotificationType,
        },
      );

      void startTracking(
        existingEventId,
        existingNotificationType,
      );
    }

    return () => {
      window.removeEventListener(
        TRACKING_EVENT,
        handleTrackingEvent,
      );

      /*
       * Clear runtime listeners, but DO NOT
       * remove STORAGE_KEY here.
       *
       * The next route can continue tracking.
       */
      clearToastTimer();

      cleanupTracking();
    };
  }, [
    pathname,
  ]);

  /*
   * =========================================================
   * NOTHING TO DISPLAY
   * =========================================================
   */

  if (
    !toast
  ) {
    return null;
  }

  const isSuccess =
    toast.type ===
    "success";

  const isWarning =
    toast.type ===
    "warning";

  /*
   * =========================================================
   * TOAST UI
   * =========================================================
   */

  return (
    <div className="fixed right-4 top-20 z-[9999] w-[calc(100%-2rem)] max-w-md">
      <div
        className={`rounded-xl border bg-white p-4 shadow-xl ${
          isSuccess
            ? "border-emerald-200"
            : isWarning
              ? "border-amber-200"
              : "border-red-200"
        }`}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : isWarning ? (
              <CircleAlert className="h-5 w-5 text-amber-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">
              {toast.title}
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={
              closeToast
            }
            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
