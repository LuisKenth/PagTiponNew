import type { EventWithMunicipalities } from "../types";
import { getAutomaticEventStatus } from "../utils";
import SummaryCard from "./SummaryCard";

type EventsSummaryProps = {
  events: EventWithMunicipalities[];
  currentTime: number;
};

export default function EventsSummary({
  events,
  currentTime,
}: EventsSummaryProps) {
  const statuses = events.map((event) =>
    getAutomaticEventStatus(event, currentTime)
  );

  const totalEvents = events.length;

  const draftEvents = statuses.filter(
    (status) => status === "draft"
  ).length;

  const activeEvents = statuses.filter(
    (status) => status === "upcoming" || status === "ongoing"
  ).length;

  const completedEvents = statuses.filter(
    (status) => status === "completed"
  ).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Total Events"
        value={totalEvents}
        description="All provincial events currently recorded."
        badgeClass="bg-slate-100 text-slate-700"
      />

      <SummaryCard
        label="Draft Events"
        value={draftEvents}
        description="Saved events that have not yet been published."
        badgeClass="bg-amber-50 text-amber-700"
      />

      <SummaryCard
        label="Upcoming / Ongoing"
        value={activeEvents}
        description="Published events that are upcoming or currently ongoing."
        badgeClass="bg-blue-50 text-blue-700"
      />

      <SummaryCard
        label="Completed"
        value={completedEvents}
        description="Events whose scheduled end time has already passed."
        badgeClass="bg-green-50 text-green-700"
      />
    </div>
  );
}