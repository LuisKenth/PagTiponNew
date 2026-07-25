"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  if (!value) return "No date set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date set";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

function getPreparationClass(status?: string | null) {
  if (status === "ready") return "bg-green-50 text-green-700";
  if (status === "in_progress") return "bg-blue-50 text-blue-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";

  return "bg-amber-50 text-amber-700";
}

export default function ProvincialEventDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = params.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [municipalities, setMunicipalities] = useState<EventMunicipality[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEventDetails = async () => {
    setLoading(true);

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError) {
      console.error("Event details error:", eventError.message);
      setEvent(null);
      setMunicipalities([]);
      setLoading(false);
      return;
    }

    const { data: municipalityData, error: municipalityError } = await supabase
      .from("event_municipalities")
      .select("*")
      .eq("event_id", eventId)
      .order("municipality", { ascending: true });

    if (municipalityError) {
      console.error("Municipality details error:", municipalityError.message);
      setMunicipalities([]);
    } else {
      setMunicipalities(municipalityData || []);
    }

    setEvent(eventData);
    setLoading(false);
  };

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back
        </button>

        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Event not found
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            The selected provincial event does not exist or cannot be loaded.
          </p>
        </div>
      </div>
    );
  }

  const readyCount = municipalities.filter(
    (item) => item.preparation_status === "ready"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-3 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold text-slate-900">
            {event.title || "Untitled Event"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Provincial event details and municipality preparation monitoring.
          </p>
        </div>

        <Link
          href="/dashboard/provincial/events"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to Events
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Event Information
            </h2>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClass(
                event.status
              )}`}
            >
              {event.status || "No status"}
            </span>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Description
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                {event.description || "No description provided."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Start Date
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formatDate(event.start_at)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  End Date
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formatDate(event.end_at)}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Official Memo
              </p>

              {event.memo_url ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-900">
                    {event.memo_filename || "Uploaded memo file"}
                  </p>

                  <Link
                    href={`/dashboard/provincial/events/${event.id}/memo`}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Open Memo
                  </Link>
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  No memo file uploaded.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Preparation Summary
          </h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Target Municipalities
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {municipalities.length}
              </p>
            </div>

            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase text-green-600">
                Ready
              </p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                {readyCount}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase text-amber-600">
                Pending
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {municipalities.length - readyCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Target Municipalities
        </h2>

        {municipalities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm text-slate-500">
              No municipalities assigned to this event.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4">Municipality</th>
                  <th className="py-3 pr-4">Preparation Status</th>
                </tr>
              </thead>

              <tbody>
                {municipalities.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="py-4 pr-4 font-medium text-slate-900">
                      {item.municipality}
                    </td>

                    <td className="py-4 pr-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${getPreparationClass(
                          item.preparation_status
                        )}`}
                      >
                        {item.preparation_status || "pending"}
                      </span>
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