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

  const recentEvents = useMemo(() => {
    return events.slice(0, 5);
  }, [events]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Recent Provincial Events
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest provincial events and their municipality distribution.
          </p>
        </div>

        <Link
          href="/dashboard/provincial/events"
          className="text-sm font-semibold text-slate-700 transition hover:text-slate-950"
        >
          View all events →
        </Link>
      </div>

      {/* CONTENT */}
      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-slate-500">
              +
            </div>

            <p className="mt-4 font-semibold text-slate-800">
              No provincial events yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create your first provincial event to start coordinating
              municipalities.
            </p>

            <Link
              href="/dashboard/provincial/events/create"
              className="mt-4 inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Create Event
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEvents.map((event) => {
              const status = getEventStatus(event, now);

              const municipalityAssignments =
                eventMunicipalities.filter(
                  (item) =>
                    String(item.event_id) === String(event.id)
                );

              const targetCount =
                municipalityAssignments.length;

              const preparedCount =
                municipalityAssignments.filter((item) => {
                  const preparationStatus = String(
                    item.status || ""
                  ).toLowerCase();

                  const registrationStatus = String(
                    item.registration_status || ""
                  ).toLowerCase();

                  return (
                    preparationStatus === "prepared" ||
                    preparationStatus === "ready" ||
                    preparationStatus === "registration_open" ||
                    registrationStatus === "open"
                  );
                }).length;

              const progress =
                targetCount > 0
                  ? Math.round(
                      (preparedCount / targetCount) * 100
                    )
                  : 0;

              return (
                <div
                  key={String(event.id)}
                  className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4">
                    {/* EVENT TOP */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {event.title || "Untitled Event"}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                              status
                            )}`}
                          >
                            {formatStatusLabel(status)}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(
                            event.start_date ||
                              event.created_at
                          )}
                        </p>

                        {event.description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                            {event.description}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/dashboard/provincial/events/${event.id}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                      >
                        View Details
                      </Link>
                    </div>

                    {/* MUNICIPALITY INFO */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Target Municipalities
                        </p>

                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {targetCount}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Prepared
                        </p>

                        <p className="mt-1 text-lg font-bold text-emerald-700">
                          {preparedCount}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Preparation Progress
                        </p>

                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {progress}%
                        </p>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    {targetCount > 0 && (
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-500">
                            Municipality preparation
                          </span>

                          <span className="font-semibold text-slate-700">
                            {preparedCount}/{targetCount}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {targetCount === 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                        No municipality has been assigned to this event yet.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}