"use client";

import {
  useEffect,
  useRef,
} from "react";

import type { ReceivedEvent } from "../types/municipalDashboard";
import MunicipalDashboardLoading from "./MunicipalDashboardLoading";
import ReceivedEventCard from "./ReceivedEventCard";

type ReceivedEventsSectionProps = {
  events: ReceivedEvent[];
  loading: boolean;
  highlightedEventId?: string | null;
  onPrepare: (item: ReceivedEvent) => void;
};

export default function ReceivedEventsSection({
  events,
  loading,
  highlightedEventId = null,
  onPrepare,
}: ReceivedEventsSectionProps) {
  const eventCardRefs = useRef<
    Record<string, HTMLDivElement | null>
  >({});

  useEffect(() => {
    if (!highlightedEventId) {
      return;
    }

    const highlightedCard =
      eventCardRefs.current[highlightedEventId];

    if (!highlightedCard) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      highlightedCard.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 200);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [highlightedEventId]);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Received Provincial Events
      </h2>

      {loading ? (
        <MunicipalDashboardLoading />
      ) : events.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-medium text-slate-800">
            No provincial events received yet.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Published events assigned to this municipality
            will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {events.map((item) => {
            const eventAssignmentId = String(item.id);

            const isHighlighted =
              highlightedEventId === eventAssignmentId;

            return (
              <div
                key={eventAssignmentId}
                ref={(element) => {
                  eventCardRefs.current[
                    eventAssignmentId
                  ] = element;
                }}
                className={`scroll-mt-24 rounded-2xl transition-all duration-500 ${
                  isHighlighted
                    ? "scale-[1.01] bg-blue-50 ring-4 ring-blue-400/50"
                    : ""
                }`}
              >
                <ReceivedEventCard
                  item={item}
                  onPrepare={onPrepare}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}