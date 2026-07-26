"use client";

import Link from "next/link";
import { useMemo } from "react";
import type {
  EventMunicipalityRow,
  EventRow,
  RSVPRow,
} from "../types";

type ImportantAlertsProps = {
  loading: boolean;
  events: EventRow[];
  eventMunicipalities: EventMunicipalityRow[];
  rsvps: RSVPRow[];
};

type AlertItem = {
  title: string;
  description: string;
  count: number;
  href: string;
  style: string;
  icon: string;
};

export default function ImportantAlerts({
  loading,
  events,
  eventMunicipalities,
  rsvps,
}: ImportantAlertsProps) {
  const alerts = useMemo<AlertItem[]>(() => {
    const result: AlertItem[] = [];

    // Draft events
    const draftEvents = events.filter(
      (event) =>
        String(event.status || "").toLowerCase() === "draft"
    ).length;

    if (draftEvents > 0) {
      result.push({
        title: "Draft Events",
        description:
          "Provincial events are saved but have not been published yet.",
        count: draftEvents,
        href: "/dashboard/provincial/events",
        style:
          "border-amber-200 bg-amber-50 text-amber-800",
        icon: "D",
      });
    }

    // Municipalities not yet prepared
    const pendingPreparation = eventMunicipalities.filter(
      (item) => {
        const status = String(
          item.status || "pending"
        ).toLowerCase();

        return ![
          "prepared",
          "ready",
          "registration_open",
        ].includes(status);
      }
    ).length;

    if (pendingPreparation > 0) {
      result.push({
        title: "Preparation Pending",
        description:
          "Municipal event assignments still require preparation.",
        count: pendingPreparation,
        href: "/dashboard/provincial/municipalities",
        style:
          "border-orange-200 bg-orange-50 text-orange-800",
        icon: "P",
      });
    }

    // Registrations still closed
    const closedRegistrations =
      eventMunicipalities.filter((item) => {
        const registrationStatus = String(
          item.registration_status || "closed"
        ).toLowerCase();

        return registrationStatus !== "open";
      }).length;

    if (closedRegistrations > 0) {
      result.push({
        title: "Registration Closed",
        description:
          "Municipal event assignments have not opened registration yet.",
        count: closedRegistrations,
        href: "/dashboard/provincial/municipalities",
        style:
          "border-blue-200 bg-blue-50 text-blue-800",
        icon: "R",
      });
    }

    // Events without municipality assignments
    const eventsWithoutTargets = events.filter((event) => {
      return !eventMunicipalities.some(
        (item) =>
          String(item.event_id) === String(event.id)
      );
    }).length;

    if (eventsWithoutTargets > 0) {
      result.push({
        title: "No Target Municipality",
        description:
          "Provincial events do not have a municipality assignment.",
        count: eventsWithoutTargets,
        href: "/dashboard/provincial/events",
        style:
          "border-red-200 bg-red-50 text-red-800",
        icon: "!",
      });
    }

    // Municipality assignments without registrations
    const assignmentsWithoutRegistrations =
      eventMunicipalities.filter((item) => {
        if (!item.id) {
          return false;
        }

        return !rsvps.some(
          (rsvp) =>
            String(rsvp.event_municipality_id) ===
            String(item.id)
        );
      }).length;

    if (assignmentsWithoutRegistrations > 0) {
      result.push({
        title: "No Registrations Yet",
        description:
          "Municipal event assignments currently have no registered participants.",
        count: assignmentsWithoutRegistrations,
        href: "/dashboard/provincial/reports",
        style:
          "border-violet-200 bg-violet-50 text-violet-800",
        icon: "0",
      });
    }

    return result;
  }, [events, eventMunicipalities, rsvps]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Important Alerts
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Items that may require provincial admin attention.
          </p>
        </div>

        {!loading && alerts.length > 0 && (
          <span className="w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            {alerts.length}{" "}
            {alerts.length === 1 ? "alert" : "alerts"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-800">
            All clear
          </p>

          <p className="mt-1 text-sm text-emerald-700">
            There are currently no items requiring
            immediate attention.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {alerts.map((alert) => (
            <Link
              key={alert.title}
              href={alert.href}
              className={`group rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${alert.style}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 font-bold">
                  {alert.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {alert.title}
                    </p>

                    <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold">
                      {alert.count}
                    </span>
                  </div>

                  <p className="mt-1 text-sm opacity-80">
                    {alert.description}
                  </p>

                  <p className="mt-2 text-xs font-semibold">
                    Review details →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}