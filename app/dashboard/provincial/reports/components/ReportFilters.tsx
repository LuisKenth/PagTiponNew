import type { EventRow } from "../types";

type ParticipantCategoryOption = {
  value: string;
  label: string;
};

type ReportFiltersProps = {
  events: EventRow[];
  municipalityOptions: string[];
  participantCategoryOptions: ParticipantCategoryOption[];

  selectedEventId: string;
  onEventChange: (value: string) => void;

  selectedMunicipality: string;
  onMunicipalityChange: (value: string) => void;

  selectedParticipantCategory: string;
  onParticipantCategoryChange: (value: string) => void;

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
  participantCategoryOptions,

  selectedEventId,
  onEventChange,

  selectedMunicipality,
  onMunicipalityChange,

  selectedParticipantCategory,
  onParticipantCategoryChange,

  dateFrom,
  onDateFromChange,

  dateTo,
  onDateToChange,

  hasActiveFilters,
  onReset,
}: ReportFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Report Filters
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Filter reports by event, municipality, participant category,
            or event date.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
              Filters Active
            </span>
          )}

          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {/* Event */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Event
          </label>

          <select
            value={selectedEventId}
            onChange={(event) =>
              onEventChange(event.target.value)
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          >
            <option value="all">
              All Events
            </option>

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

        {/* Municipality */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Municipality
          </label>

          <select
            value={selectedMunicipality}
            onChange={(event) =>
              onMunicipalityChange(event.target.value)
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          >
            <option value="all">
              All Municipalities
            </option>

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

        {/* Participant Category */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Participant Category
          </label>

          <select
            value={selectedParticipantCategory}
            onChange={(event) =>
              onParticipantCategoryChange(
                event.target.value
              )
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          >
            <option value="all">
              All Participant Categories
            </option>

            {participantCategoryOptions.map((category) => (
              <option
                key={category.value}
                value={category.value}
              >
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Date From
          </label>

          <input
            type="date"
            value={dateFrom}
            onChange={(event) =>
              onDateFromChange(event.target.value)
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="text-sm font-medium text-slate-700">
            Date To
          </label>

          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) =>
              onDateToChange(event.target.value)
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          />
        </div>
      </div>
    </div>
  );
}