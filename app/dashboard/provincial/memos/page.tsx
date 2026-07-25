"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  title: string | null;
  memo_url: string | null;
  memo_filename: string | null;
  status: string | null;
  created_at: string | null;
};

type MunicipalityRow = {
  id: string;
  event_id: string;
  municipality: string;
};

type MemoEvent = EventRow & {
  municipalities: MunicipalityRow[];
};

function formatDate(value: string | null) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusClass(status: string | null) {
  if (status === "published") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "draft") {
    return "bg-slate-100 text-slate-700";
  }

  if (status === "upcoming") {
    return "bg-indigo-50 text-indigo-700";
  }

  if (status === "ongoing") {
    return "bg-green-50 text-green-700";
  }

  if (status === "completed") {
    return "bg-slate-100 text-slate-700";
  }

  if (status === "cancelled") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function OfficialMemosPage() {
  const [events, setEvents] = useState<MemoEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemos = async () => {
    setLoading(true);

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select(
        `
        id,
        title,
        memo_url,
        memo_filename,
        status,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (eventError) {
      console.error("Official memos error:", eventError.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    if (!eventData || eventData.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const eventIds = eventData.map((event) => event.id);

    const { data: municipalityData, error: municipalityError } =
      await supabase
        .from("event_municipalities")
        .select("id, event_id, municipality")
        .in("event_id", eventIds);

    if (municipalityError) {
      console.error(
        "Municipality fetch error:",
        municipalityError.message
      );

      setEvents([]);
      setLoading(false);
      return;
    }

    const mappedEvents: MemoEvent[] = eventData.map((event) => ({
      ...event,
      municipalities:
        municipalityData?.filter(
          (item) => item.event_id === event.id
        ) || [],
    }));

    setEvents(mappedEvents);
    setLoading(false);
  };

  useEffect(() => {
    fetchMemos();
  }, []);

  const eventsWithMemo = events.filter(
    (event) => event.memo_url || event.memo_filename
  );

  const eventsWithoutMemo = events.filter(
    (event) => !event.memo_url && !event.memo_filename
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-slate-500">
          Provincial Admin
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Official Memos
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          View official memos uploaded and distributed with provincial events.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Official Memos
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {eventsWithMemo.length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Provincial events with uploaded official memos
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Events Without Memo
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {eventsWithoutMemo.length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Events that currently have no attached memo
          </p>
        </div>
      </div>

      {/* Memo List */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Official Memo List
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Memos attached to provincial events.
            </p>
          </div>

          <Link
            href="/dashboard/provincial/events/create"
            className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Create Event
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">
              Loading official memos...
            </p>
          </div>
        ) : eventsWithMemo.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <p className="font-semibold text-slate-900">
              No official memos uploaded yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Official memos attached to provincial events will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4">Event</th>
                  <th className="py-3 pr-4">Memo</th>
                  <th className="py-3 pr-4">Target Municipalities</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Uploaded</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {eventsWithMemo.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="max-w-[240px] py-4 pr-4 align-top">
                      <p className="break-words font-semibold text-slate-900">
                        {event.title || "Untitled Event"}
                      </p>
                    </td>

                    <td className="max-w-[240px] py-4 pr-4 align-top">
                      <p className="break-all text-slate-700">
                        {event.memo_filename || "Official Memo"}
                      </p>
                    </td>

                    <td className="max-w-[300px] py-4 pr-4 align-top">
                      {event.municipalities.length === 0 ? (
                        <span className="text-xs text-slate-400">
                          No municipality assigned
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {event.municipalities.map((item) => (
                            <span
                              key={item.id}
                              className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                            >
                              {item.municipality}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-4 pr-4 align-top">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClass(
                          event.status
                        )}`}
                      >
                        {event.status || "No status"}
                      </span>
                    </td>

                    <td className="min-w-[165px] py-4 pr-4 align-top text-slate-500">
                      {formatDate(event.created_at)}
                    </td>

                    <td className="py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/provincial/events/${event.id}`}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          View Event
                        </Link>

                        {event.memo_url && (
                          <Link
                            href={`/dashboard/provincial/memos/${event.id}`}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                          >
                            View Memo
                          </Link>
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

      {/* Events Without Memo */}
      {!loading && eventsWithoutMemo.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Events Without Official Memo
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These provincial events currently have no uploaded memo.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {eventsWithoutMemo.map((event) => (
              <div
                key={event.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {event.title || "Untitled Event"}
                    </p>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusClass(
                        event.status
                      )}`}
                    >
                      {event.status || "No status"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Created {formatDate(event.created_at)}
                  </p>
                </div>

                <Link
                  href={`/dashboard/provincial/events/${event.id}/edit`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Add Memo
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}