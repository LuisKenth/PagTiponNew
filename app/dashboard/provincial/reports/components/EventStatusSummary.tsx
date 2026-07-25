import type { EventStatusSummary as EventStatusSummaryType } from "../types";

type EventStatusSummaryProps = {
  summary: EventStatusSummaryType;
  totalEvents: number;
};

export default function EventStatusSummary({
  summary,
  totalEvents,
}: EventStatusSummaryProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Event Status Summary
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current status distribution of provincial events included in the
            selected report filters.
          </p>
        </div>

        <div className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {totalEvents} {totalEvents === 1 ? "event" : "events"} total
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatusCard
          label="Draft"
          value={summary.draft}
          description="Saved but not yet published"
          className="border-amber-200 bg-amber-50"
          labelClassName="text-amber-700"
          valueClassName="text-amber-900"
          descriptionClassName="text-amber-700"
        />

        <StatusCard
          label="Published"
          value={summary.published}
          description="Published provincial events"
          className="border-blue-200 bg-blue-50"
          labelClassName="text-blue-700"
          valueClassName="text-blue-900"
          descriptionClassName="text-blue-700"
        />

        <StatusCard
          label="Upcoming"
          value={summary.upcoming}
          description="Scheduled upcoming events"
          className="border-indigo-200 bg-indigo-50"
          labelClassName="text-indigo-700"
          valueClassName="text-indigo-900"
          descriptionClassName="text-indigo-700"
        />

        <StatusCard
          label="Ongoing"
          value={summary.ongoing}
          description="Events currently in progress"
          className="border-green-200 bg-green-50"
          labelClassName="text-green-700"
          valueClassName="text-green-900"
          descriptionClassName="text-green-700"
        />

        <StatusCard
          label="Completed"
          value={summary.completed}
          description="Finished provincial events"
          className="border-slate-200 bg-slate-50"
          labelClassName="text-slate-700"
          valueClassName="text-slate-900"
          descriptionClassName="text-slate-600"
        />

        <StatusCard
          label="Cancelled"
          value={summary.cancelled}
          description="Cancelled provincial events"
          className="border-red-200 bg-red-50"
          labelClassName="text-red-700"
          valueClassName="text-red-900"
          descriptionClassName="text-red-700"
        />
      </div>
    </div>
  );
}

type StatusCardProps = {
  label: string;
  value: number;
  description: string;
  className: string;
  labelClassName: string;
  valueClassName: string;
  descriptionClassName: string;
};

function StatusCard({
  label,
  value,
  description,
  className,
  labelClassName,
  valueClassName,
  descriptionClassName,
}: StatusCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <p className={`text-sm font-medium ${labelClassName}`}>
        {label}
      </p>

      <p className={`mt-2 text-2xl font-bold ${valueClassName}`}>
        {value}
      </p>

      <p className={`mt-1 text-xs ${descriptionClassName}`}>
        {description}
      </p>
    </div>
  );
}
