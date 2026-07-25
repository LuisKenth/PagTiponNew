"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  EventMunicipalityRow,
  EventRow,
} from "../types";
import {
  formatDate,
  formatStatusLabel,
  getEventStatus,
  getStatusStyle,
} from "../utils";

type RecentEventsProps = {
  loading: boolean;
  events: EventRow[];
  eventMunicipalities: EventMunicipalityRow[];
};

export default function RecentEvents({
  loading,
  events,
  eventMunicipalities,
}: RecentEventsProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const recentEvents = useMemo(() => events.slice(0, 5), [events]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Recent Provincial Events
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest events created and distributed to municipalities.
          </p>
        </div>

        <Link
          href="/dashboard/provincial/events"
          className="text-sm font-semibold text-slate-700 hover:text-slate-950"
        >
          View all →
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Loading events...
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
            <p className="font-medium text-slate-700">
              No provincial events yet.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first provincial event.
            </p>

            <Link
              href="/dashboard/provincial/events/create"
              className="mt-4 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create Event
            </Link>
          </div>
        ) : (
          recentEvents.map((event) => {
            const status = getEventStatus(event, now);

            const targetCount = eventMunicipalities.filter(
              (item) => String(item.event_id) === String(event.id)
            ).length;

            return (
              <div
                key={String(event.id)}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/50"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {event.title || "Untitled Event"}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(event.start_date || event.created_at)}
                    </p>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {event.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                        status
                      )}`}
                    >
                      {formatStatusLabel(status)}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {targetCount}{" "}
                      {targetCount === 1
                        ? "municipality"
                        : "municipalities"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
