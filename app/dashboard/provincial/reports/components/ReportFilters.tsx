import type { EventRow } from "../types";

type ReportFiltersProps = {
  events: EventRow[];
  municipalityOptions: string[];
  selectedEventId: string;
  onEventChange: (value: string) => void;
  selectedMunicipality: string;
  onMunicipalityChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
};

export default function ReportFilters({
  events,
  municipalityOptions,
  selectedEventId,
  onEventChange,
  selectedMunicipality,
  onMunicipalityChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  hasActiveFilters,
  onReset,
}: ReportFiltersProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Report Filters
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Filter reports by event, municipality, or event date.
          </p>
        </div>

        {hasActiveFilters && (
          <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Filters Active
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Event
          </label>

          <select
            value={selectedEventId}
            onChange={(event) => onEventChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900"
          >
            <option value="all">All Events</option>

            {events.map((event) => (
              <option
                key={String(event.id)}
                value={String(event.id)}
              >
                {event.title || "Untitled Event"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Municipality
          </label>

          <select
            value={selectedMunicipality}
            onChange={(event) =>
              onMunicipalityChange(event.target.value)
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900"
          >
            <option value="all">All Municipalities</option>

            {municipalityOptions.map((municipality) => (
              <option
                key={municipality}
                value={municipality}
              >
                {municipality}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Date From
          </label>

          <input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">
            Date To
          </label>

          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => onDateToChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          disabled={!hasActiveFilters}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
