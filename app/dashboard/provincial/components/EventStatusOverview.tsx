"use client";

import { useEffect, useMemo, useState } from "react";
import type { EventRow } from "../types";
import { getEventStatus } from "../utils";

type EventStatusOverviewProps = {
  loading: boolean;
  events: EventRow[];
};

type StatusCardProps = {
  label: string;
  count: number;
  description: string;
  dotColor: string;
};

function StatusCard({
  label,
  count,
  description,
  dotColor,
}: StatusCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {count}
          </p>
        </div>

        <span
          className={`mt-1 h-3 w-3 rounded-full ${dotColor}`}
        />
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function EventStatusOverview({
  loading,
  events,
}: EventStatusOverviewProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const statusCounts = useMemo(() => {
    const counts = {
      draft: 0,
      upcoming: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
    };

    events.forEach((event) => {
      const status = getEventStatus(event, now);

      if (status === "draft") {
        counts.draft += 1;
      }

      if (status === "upcoming") {
        counts.upcoming += 1;
      }

      if (status === "ongoing") {
        counts.ongoing += 1;
      }

      if (status === "completed") {
        counts.completed += 1;
      }

      if (status === "cancelled") {
        counts.cancelled += 1;
      }
    });

    return counts;
  }, [events, now]);

  const activeEvents =
    statusCounts.upcoming + statusCounts.ongoing;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Event Status Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current distribution of provincial events by status.
          </p>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {loading
            ? "Loading..."
            : `${events.length} total ${
                events.length === 1 ? "event" : "events"
              }`}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <p className="font-medium text-slate-700">
            No event status data yet.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Event information will appear here once provincial
            events are created.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatusCard
              label="Draft"
              count={statusCounts.draft}
              description="Saved events not yet published."
              dotColor="bg-amber-500"
            />

            <StatusCard
              label="Upcoming"
              count={statusCounts.upcoming}
              description="Published events scheduled ahead."
              dotColor="bg-blue-500"
            />

            <StatusCard
              label="Ongoing"
              count={statusCounts.ongoing}
              description="Events currently in progress."
              dotColor="bg-emerald-500"
            />

            <StatusCard
              label="Completed"
              count={statusCounts.completed}
              description="Finished provincial events."
              dotColor="bg-slate-500"
            />

            <StatusCard
              label="Cancelled"
              count={statusCounts.cancelled}
              description="Events marked as cancelled."
              dotColor="bg-red-500"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Active Event Activity
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Upcoming and ongoing provincial events combined.
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-2xl font-bold text-slate-900">
                {activeEvents}
              </p>

              <p className="text-xs font-medium text-slate-500">
                active {activeEvents === 1 ? "event" : "events"}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}