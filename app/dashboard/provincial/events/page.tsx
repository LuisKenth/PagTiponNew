"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type EventItem = {
  id: string;
  title: string | null;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  memo_url: string | null;
  memo_filename: string | null;
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
};

type EventWithMunicipalities = EventItem & {
  municipalities: EventMunicipality[];
};

function getEventName(event: EventItem) {
  return event.title || "Untitled Event";
}

function isValidDate(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function formatDate(value?: string | null) {
  if (!isValidDate(value)) return "No date set";

  return new Date(value as string).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getMemoLabel(event: EventItem) {
  if (event.memo_url || event.memo_filename) {
    return "Uploaded";
  }

  return "No memo";
}

function getPreparationLabel(municipalities: EventMunicipality[]) {
  if (municipalities.length === 0) return "Pending";

  const readyCount = municipalities.filter(
    (item) => item.preparation_status === "ready"
  ).length;

  if (readyCount === 0) return "Pending";
  if (readyCount === municipalities.length) return "Ready";

  return `${readyCount}/${municipalities.length} ready`;
}

function getStatusClass(status?: string | null) {
  if (status === "published") return "bg-blue-50 text-blue-700";
  if (status === "draft") return "bg-slate-100 text-slate-700";
  if (status === "upcoming") return "bg-indigo-50 text-indigo-700";
  if (status === "ongoing") return "bg-green-50 text-green-700";
  if (status === "completed") return "bg-slate-100 text-slate-700";
  if (status === "cancelled") return "bg-red-50 text-red-700";

  return "bg-slate-100 text-slate-700";
}

export default function ProvincialEventsPage() {
  const [events, setEvents] = useState<EventWithMunicipalities[]>([]);
  const [loading, setLoading] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (eventError) {
      console.error("Events error:", eventError.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    const eventIds = (eventData || []).map((event) => event.id);

    if (eventIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data: municipalityData, error: municipalityError } =
      await supabase
        .from("event_municipalities")
        .select("*")
        .in("event_id", eventIds);

    if (municipalityError) {
      console.error(
        "Event municipalities error:",
        municipalityError.message
      );

      setEvents([]);
      setLoading(false);
      return;
    }

    const mappedEvents = (eventData || []).map((event) => {
      const municipalities =
        municipalityData?.filter(
          (item) => item.event_id === event.id
        ) || [];

      return {
        ...event,
        municipalities,
      };
    });

    setEvents(mappedEvents);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (event: EventWithMunicipalities) => {
    if (event.status !== "draft") {
      alert(
        "Only draft events can be permanently deleted. Published events should be cancelled instead."
      );
      return;
    }

    const eventName = getEventName(event);

    const confirmed = window.confirm(
      `Are you sure you want to delete "${eventName}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(event.id);

      // Delete municipality assignments first.
      const { error: municipalityError } = await supabase
        .from("event_municipalities")
        .delete()
        .eq("event_id", event.id);

      if (municipalityError) {
        throw municipalityError;
      }

      // Delete the actual event.
      const { error: eventError } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (eventError) {
        throw eventError;
      }

      // Remove it immediately from the table.
      setEvents((currentEvents) =>
        currentEvents.filter(
          (currentEvent) => currentEvent.id !== event.id
        )
      );

      alert(`"${eventName}" was deleted successfully.`);
    } catch (error) {
      console.error("Delete event error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete the event.";

      alert(`Failed to delete event.\n\n${message}`);

      // Refresh para bumalik ang municipality assignments
      // kung event deletion ang nag-fail.
      await fetchEvents();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Provincial Events
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage provincial-level events and monitor municipality
            preparation.
          </p>
        </div>

        <Link
          href="/dashboard/provincial/events/create"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Create Provincial Event
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Event List
        </h2>

        {loading ? (
          <p className="text-sm text-slate-500">
            Loading events...
          </p>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              No provincial events yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create your first provincial event to assign municipalities.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4">
                    Event Name
                  </th>

                  <th className="py-3 pr-4">
                    Schedule
                  </th>

                  <th className="py-3 pr-4">
                    Target Municipalities
                  </th>

                  <th className="py-3 pr-4">
                    Memo Status
                  </th>

                  <th className="py-3 pr-4">
                    Preparation
                  </th>

                  <th className="py-3 pr-4">
                    Status
                  </th>

                  <th className="py-3 pr-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="max-w-[260px] py-4 pr-4 align-top">
                      <p className="break-words font-semibold text-slate-900">
                        {getEventName(event)}
                      </p>
                    </td>

                    <td className="min-w-[190px] py-4 pr-4 align-top text-slate-600">
                      <p>
                        {formatDate(event.start_at)}
                      </p>

                      <p className="text-xs text-slate-400">
                        to {formatDate(event.end_at)}
                      </p>
                    </td>

                    <td className="max-w-[280px] py-4 pr-4 align-top">
                      <div className="flex flex-wrap gap-1">
                        {event.municipalities.length === 0 ? (
                          <span className="text-xs text-slate-400">
                            No municipality
                          </span>
                        ) : (
                          event.municipalities.map((item) => (
                            <span
                              key={item.id}
                              className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                            >
                              {item.municipality}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="py-4 pr-4 align-top">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          event.memo_url ||
                          event.memo_filename
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {getMemoLabel(event)}
                      </span>
                    </td>

                    <td className="py-4 pr-4 align-top">
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        {getPreparationLabel(
                          event.municipalities
                        )}
                      </span>
                    </td>

                    <td className="py-4 pr-4 align-top">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusClass(
                          event.status
                        )}`}
                      >
                        {event.status || "No status"}
                      </span>
                    </td>

                    <td className="py-4 pr-4 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/provincial/events/${event.id}`}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>

                        <Link
                          href={`/dashboard/provincial/events/${event.id}/edit`}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </Link>

                        {event.status === "draft" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(event)
                            }
                            disabled={
                              deletingId === event.id
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === event.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}