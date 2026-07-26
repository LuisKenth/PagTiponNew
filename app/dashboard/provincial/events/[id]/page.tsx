"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import {
  getAutomaticEventStatus,
  getStatusClass,
} from "../utils";

import EventMemosSection, {
  type EventMemo,
} from "./components/EventMemosSection";

type EventItem = {
  id: string;
  title: string | null;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  memo_url: string | null;
  memo_filename: string | null;
  created_by: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EventMunicipality = {
  id: string;
  event_id: string;
  municipality: string;
  preparation_status?: string | null;
  memo_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "No date set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date set";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getPreparationClass(
  status?: string | null
) {
  if (status === "ready") {
    return "bg-green-50 text-green-700";
  }

  if (status === "in_progress") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

function getMemoStatusClass(
  status?: string | null
) {
  if (status === "acknowledged") {
    return "bg-green-50 text-green-700";
  }

  if (status === "received") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-slate-100 text-slate-600";
}

function formatStatusLabel(
  status?: string | null
) {
  if (!status) {
    return "Pending";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default function ProvincialEventDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = params.id as string;

  const [event, setEvent] =
    useState<EventItem | null>(null);

  const [
    municipalities,
    setMunicipalities,
  ] = useState<EventMunicipality[]>([]);

  const [memos, setMemos] =
    useState<EventMemo[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    currentTime,
    setCurrentTime,
  ] = useState(() => Date.now());

  const [
    publishing,
    setPublishing,
  ] = useState(false);

  const [
    cancelling,
    setCancelling,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  /*
   * FETCH EVENT DETAILS
   */
  const fetchEventDetails = async () => {
    setLoading(true);

    /*
     * EVENT
     */
    const {
      data: eventData,
      error: eventError,
    } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError) {
      console.error(
        "Event details error:",
        eventError.message
      );

      setEvent(null);
      setMunicipalities([]);
      setMemos([]);
      setLoading(false);

      return;
    }

    const now = Date.now();

    const automaticStatus =
      getAutomaticEventStatus(
        eventData,
        now
      );

    /*
     * Synchronize automatic status
     * with the database.
     */
    if (
      automaticStatus !==
        eventData.status &&
      automaticStatus !== "draft" &&
      automaticStatus !== "cancelled"
    ) {
      const {
        error: statusError,
      } = await supabase
        .from("events")
        .update({
          status:
            automaticStatus,
        })
        .eq(
          "id",
          eventId
        );

      if (statusError) {
        console.error(
          "Status synchronization error:",
          statusError.message
        );
      }
    }

    setEvent({
      ...(eventData as EventItem),
      status:
        automaticStatus,
    });

    /*
     * MUNICIPALITIES
     */
    const {
      data: municipalityData,
      error: municipalityError,
    } = await supabase
      .from(
        "event_municipalities"
      )
      .select("*")
      .eq(
        "event_id",
        eventId
      )
      .order(
        "municipality",
        {
          ascending: true,
        }
      );

    if (municipalityError) {
      console.error(
        "Municipality details error:",
        municipalityError.message
      );

      setMunicipalities([]);
    } else {
      setMunicipalities(
        municipalityData || []
      );
    }

    /*
     * OFFICIAL MEMOS
     */
    const {
      data: memoData,
      error: memoError,
    } = await supabase
      .from("event_memos")
      .select(`
        id,
        event_id,
        file_name,
        file_url,
        file_path,
        file_size,
        file_type,
        created_at
      `)
      .eq(
        "event_id",
        eventId
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (memoError) {
      console.error(
        "Event memos error:",
        memoError.message
      );

      setMemos([]);
    } else {
      setMemos(
        (memoData || []) as EventMemo[]
      );
    }

    setCurrentTime(now);
    setLoading(false);
  };

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  /*
   * REFRESH DISPLAYED STATUS
   * EVERY 30 SECONDS
   */
  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setCurrentTime(
          Date.now()
        );
      }, 30_000);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);

  /*
   * PUBLISH DRAFT
   */
  const handlePublish = async () => {
    if (!event) {
      return;
    }

    const automaticStatus =
      getAutomaticEventStatus(
        event,
        Date.now()
      );

    if (
      automaticStatus !== "draft"
    ) {
      alert(
        "Only draft events can be published."
      );

      return;
    }

    if (!event.title?.trim()) {
      alert(
        "Please add an event title before publishing."
      );

      return;
    }

    if (
      !event.description?.trim()
    ) {
      alert(
        "Please add an event description before publishing."
      );

      return;
    }

    if (
      !event.start_at ||
      !event.end_at
    ) {
      alert(
        "Please set the event schedule before publishing."
      );

      return;
    }

    const startTime =
      new Date(
        event.start_at
      ).getTime();

    const endTime =
      new Date(
        event.end_at
      ).getTime();

    if (
      Number.isNaN(startTime) ||
      Number.isNaN(endTime)
    ) {
      alert(
        "The event schedule is invalid."
      );

      return;
    }

    if (
      endTime <= startTime
    ) {
      alert(
        "End date and time must be after start date and time."
      );

      return;
    }

    if (
      municipalities.length ===
      0
    ) {
      alert(
        "Please assign at least one municipality before publishing."
      );

      return;
    }

    const hasMemo =
      memos.length > 0 ||
      Boolean(
        event.memo_url ||
          event.memo_filename
      );

    if (!hasMemo) {
      alert(
        "Please upload an official memo before publishing."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Publish "${
          event.title ||
          "Untitled Event"
        }"?\n\nThe event will become available to its assigned municipalities.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setPublishing(true);

      const publishedStatus =
        getAutomaticEventStatus(
          {
            ...event,
            status:
              "published",
          },
          Date.now()
        );

      const {
        error: publishError,
      } = await supabase
        .from("events")
        .update({
          status:
            publishedStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          event.id
        );

      if (publishError) {
        throw publishError;
      }

      setEvent(
        (currentEvent) =>
          currentEvent
            ? {
                ...currentEvent,
                status:
                  publishedStatus,
              }
            : currentEvent
      );

      setCurrentTime(
        Date.now()
      );

      alert(
        `"${event.title}" was published successfully.`
      );
    } catch (error) {
      console.error(
        "Publish event error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to publish the event.";

      alert(
        `Failed to publish event.\n\n${message}`
      );
    } finally {
      setPublishing(false);
    }
  };

  /*
   * CANCEL UPCOMING EVENT
   */
  const handleCancel = async () => {
    if (!event) {
      return;
    }

    /*
     * Re-read latest schedule/status
     * before cancelling.
     */
    const {
      data: latestEvent,
      error: latestError,
    } = await supabase
      .from("events")
      .select(
        "id, status, start_at, end_at"
      )
      .eq(
        "id",
        event.id
      )
      .single();

    if (latestError) {
      alert(
        "Unable to verify the current event status."
      );

      return;
    }

    const latestStatus =
      getAutomaticEventStatus(
        latestEvent,
        Date.now()
      );

    /*
     * Only upcoming events may
     * be cancelled.
     */
    if (
      latestStatus !== "upcoming"
    ) {
      alert(
        "Only upcoming events can be cancelled."
      );

      await fetchEventDetails();

      return;
    }

    const confirmed =
      window.confirm(
        `Cancel "${
          event.title ||
          "Untitled Event"
        }"?\n\nThe event will remain in PagTipon as a historical record.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setCancelling(true);

      const {
        error: cancelError,
      } = await supabase
        .from("events")
        .update({
          status:
            "cancelled",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          event.id
        );

      if (cancelError) {
        throw cancelError;
      }

      setEvent(
        (currentEvent) =>
          currentEvent
            ? {
                ...currentEvent,
                status:
                  "cancelled",
              }
            : currentEvent
      );

      alert(
        `"${event.title}" was cancelled successfully.`
      );
    } catch (error) {
      console.error(
        "Cancel event error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to cancel the event.";

      alert(
        `Failed to cancel event.\n\n${message}`
      );
    } finally {
      setCancelling(false);
    }
  };

  /*
   * DELETE DRAFT EVENT
   */
  const handleDelete = async () => {
    if (!event) {
      return;
    }

    const {
      data: latestEvent,
      error: latestError,
    } = await supabase
      .from("events")
      .select(
        "id, status, start_at, end_at"
      )
      .eq(
        "id",
        event.id
      )
      .single();

    if (latestError) {
      alert(
        "Unable to verify the current event status."
      );

      return;
    }

    const latestStatus =
      getAutomaticEventStatus(
        latestEvent,
        Date.now()
      );

    if (
      latestStatus !== "draft"
    ) {
      alert(
        "Only draft events can be permanently deleted."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${
          event.title ||
          "Untitled Event"
        }"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      /*
       * Remove municipality assignments.
       */
      const {
        error:
          municipalityDeleteError,
      } = await supabase
        .from(
          "event_municipalities"
        )
        .delete()
        .eq(
          "event_id",
          event.id
        );

      if (
        municipalityDeleteError
      ) {
        throw municipalityDeleteError;
      }

      /*
       * Remove event memo records.
       */
      const {
        error: memoDeleteError,
      } = await supabase
        .from("event_memos")
        .delete()
        .eq(
          "event_id",
          event.id
        );

      if (memoDeleteError) {
        throw memoDeleteError;
      }

      /*
       * Remove actual event.
       */
      const {
        error: eventDeleteError,
      } = await supabase
        .from("events")
        .delete()
        .eq(
          "id",
          event.id
        );

      if (eventDeleteError) {
        throw eventDeleteError;
      }

      alert(
        `"${event.title}" was deleted successfully.`
      );

      router.replace(
        "/dashboard/provincial/events"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Delete event error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete the event.";

      alert(
        `Failed to delete event.\n\n${message}`
      );
    } finally {
      setDeleting(false);
    }
  };

  /*
   * LOADING
   */
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex min-h-32 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

            <p className="mt-3 text-sm text-slate-500">
              Loading event details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * NOT FOUND
   */
  if (!event) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/provincial/events"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to Events
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Event not found
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            The selected provincial
            event does not exist or
            cannot be loaded.
          </p>
        </div>
      </div>
    );
  }

  /*
   * CALCULATED STATUS
   */
  const automaticStatus =
    getAutomaticEventStatus(
      event,
      currentTime
    );

  const isDraft =
    automaticStatus === "draft";

  const isUpcoming =
    automaticStatus === "upcoming";

  const isOngoing =
    automaticStatus === "ongoing";

  const isCompleted =
    automaticStatus === "completed";

  const isCancelled =
    automaticStatus === "cancelled";

  const canEdit =
    isDraft || isUpcoming;

  /*
   * PREPARATION COUNTS
   */
  const readyCount =
    municipalities.filter(
      (item) =>
        item.preparation_status ===
        "ready"
    ).length;

  const inProgressCount =
    municipalities.filter(
      (item) =>
        item.preparation_status ===
        "in_progress"
    ).length;

  const pendingCount =
    municipalities.filter(
      (item) =>
        !item.preparation_status ||
        item.preparation_status ===
          "pending"
    ).length;

  const preparationPercentage =
    municipalities.length === 0
      ? 0
      : Math.round(
          (readyCount /
            municipalities.length) *
            100
        );

  const hasMemo =
    memos.length > 0 ||
    Boolean(
      event.memo_url ||
        event.memo_filename
    );

  return (
    <div className="space-y-6">
      {/* =========================
          HEADER
          ========================= */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link
            href="/dashboard/provincial/events"
            className="mb-3 inline-flex text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            ← Back to Events
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {event.title ||
                "Untitled Event"}
            </h1>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                automaticStatus
              )}`}
            >
              {automaticStatus}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Provincial event overview,
            official memos, and
            municipality preparation
            monitoring.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-2">
          {/* EDIT */}
          {canEdit && (
            <Link
              href={`/dashboard/provincial/events/${event.id}/edit`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Edit Event
            </Link>
          )}

          {/* PUBLISH */}
          {isDraft && (
            <button
              type="button"
              disabled={
                publishing
              }
              onClick={
                handlePublish
              }
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing
                ? "Publishing..."
                : "Publish Event"}
            </button>
          )}

          {/* CANCEL */}
          {isUpcoming && (
            <button
              type="button"
              disabled={
                cancelling
              }
              onClick={
                handleCancel
              }
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelling
                ? "Cancelling..."
                : "Cancel Event"}
            </button>
          )}

          {/* DELETE */}
          {isDraft && (
            <button
              type="button"
              disabled={
                deleting
              }
              onClick={
                handleDelete
              }
              className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting
                ? "Deleting..."
                : "Delete Draft"}
            </button>
          )}
        </div>
      </div>

      {/* =========================
          STATUS NOTICE
          ========================= */}
      {isDraft && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">
            Draft Event
          </p>

          <p className="mt-1 text-sm text-amber-700">
            This event has not yet been
            published to its assigned
            municipalities.
          </p>
        </div>
      )}

      {isUpcoming && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="text-sm font-semibold text-blue-800">
            Upcoming Event
          </p>

          <p className="mt-1 text-sm text-blue-700">
            This event may still be
            edited or cancelled before
            its scheduled start time.
          </p>
        </div>
      )}

      {isOngoing && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm font-semibold text-green-800">
            Event in Progress
          </p>

          <p className="mt-1 text-sm text-green-700">
            Editing and cancellation are
            locked while this event is
            ongoing to protect attendance
            and event records.
          </p>
        </div>
      )}

      {isCompleted && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-sm font-semibold text-slate-800">
            Event Completed
          </p>

          <p className="mt-1 text-sm text-slate-600">
            This event is preserved as a
            historical record and can no
            longer be edited or
            cancelled.
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-800">
            Event Cancelled
          </p>

          <p className="mt-1 text-sm text-red-700">
            This event remains available
            for historical reference but
            can no longer be modified.
          </p>
        </div>
      )}

      {/* =========================
          MAIN CONTENT
          ========================= */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* EVENT INFORMATION */}
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Event Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  General event details
                  and schedule.
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                  automaticStatus
                )}`}
              >
                {automaticStatus}
              </span>
            </div>

            <div className="mt-6 space-y-6">
              {/* DESCRIPTION */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {event.description ||
                    "No description provided."}
                </p>
              </div>

              {/* SCHEDULE */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Start Date & Time
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDate(
                      event.start_at
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    End Date & Time
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDate(
                      event.end_at
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* OFFICIAL MEMOS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Official Memos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Official documents
                  attached to this
                  provincial event.
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  hasMemo
                    ? "bg-green-50 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {hasMemo
                  ? "Memo Available"
                  : "No Memo"}
              </span>
            </div>

            <EventMemosSection
              eventId={event.id}
              memos={memos}
              legacyMemoUrl={
                event.memo_url
              }
              legacyMemoFilename={
                event.memo_filename
              }
            />
          </div>

          {/* EVENT HISTORY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Record Information
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Created
                </p>

                <p className="mt-2 text-sm font-medium text-slate-800">
                  {formatDate(
                    event.created_at
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Last Updated
                </p>

                <p className="mt-2 text-sm font-medium text-slate-800">
                  {formatDate(
                    event.updated_at
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =========================
            PREPARATION SUMMARY
            ========================= */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Preparation Summary
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Overall municipality
              preparation progress.
            </p>

            {/* PROGRESS */}
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">
                  Overall Progress
                </p>

                <p className="text-sm font-bold text-slate-900">
                  {
                    preparationPercentage
                  }
                  %
                </p>
              </div>

              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{
                    width: `${preparationPercentage}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                {readyCount} of{" "}
                {
                  municipalities.length
                }{" "}
                municipalities ready
              </p>
            </div>

            {/* COUNTS */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Target Municipalities
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {
                    municipalities.length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                  Ready
                </p>

                <p className="mt-1 text-2xl font-bold text-green-700">
                  {readyCount}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  In Progress
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-700">
                  {
                    inProgressCount
                  }
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Pending
                </p>

                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {pendingCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          MUNICIPALITY PREPARATION
          ========================= */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Municipality Preparation
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track preparation and memo
            status for each assigned
            municipality.
          </p>
        </div>

        {municipalities.length ===
        0 ? (
          <div className="p-6">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No municipalities
                assigned
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Assign municipalities
                before publishing this
                event.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE */}
            <div className="space-y-3 p-4 md:hidden">
              {municipalities.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {
                        item.municipality
                      }
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getPreparationClass(
                          item.preparation_status
                        )}`}
                      >
                        {formatStatusLabel(
                          item.preparation_status
                        )}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getMemoStatusClass(
                          item.memo_status
                        )}`}
                      >
                        Memo:{" "}
                        {formatStatusLabel(
                          item.memo_status
                        )}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* DESKTOP */}
            <div className="hidden overflow-x-auto px-6 pb-6 md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-3 pr-4 font-semibold">
                      Municipality
                    </th>

                    <th className="py-3 pr-4 font-semibold">
                      Preparation
                    </th>

                    <th className="py-3 pr-4 font-semibold">
                      Memo Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {municipalities.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="py-4 pr-4 font-semibold text-slate-900">
                          {
                            item.municipality
                          }
                        </td>

                        <td className="py-4 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getPreparationClass(
                              item.preparation_status
                            )}`}
                          >
                            {formatStatusLabel(
                              item.preparation_status
                            )}
                          </span>
                        </td>

                        <td className="py-4 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getMemoStatusClass(
                              item.memo_status
                            )}`}
                          >
                            {formatStatusLabel(
                              item.memo_status
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}