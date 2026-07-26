import type { EventWithMunicipalities } from "../types";

import EventMobileCard from "./EventMobileCard";
import EventTableRow from "./EventTableRow";
import EventsEmptyState from "./EventsEmptyState";

type EventsTableProps = {
  events: EventWithMunicipalities[];

  loading: boolean;

  deletingId: string | null;
  publishingId: string | null;
  cancellingId: string | null;

  currentTime: number;
  isFiltered: boolean;

  onDelete: (event: EventWithMunicipalities) => void;
  onPublish: (event: EventWithMunicipalities) => void;
  onCancel: (event: EventWithMunicipalities) => void;

  onClearFilters: () => void;
};

export default function EventsTable({
  events,
  loading,
  deletingId,
  publishingId,
  cancellingId,
  currentTime,
  isFiltered,
  onDelete,
  onPublish,
  onCancel,
  onClearFilters,
}: EventsTableProps) {
  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          <p className="mt-3 text-sm text-slate-500">
            Loading provincial events...
          </p>
        </div>
      </div>
    );
  }

  /*
   * FILTER HAS NO RESULTS
   */
  if (
    events.length === 0 &&
    isFiltered
  ) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5 text-slate-400"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
              />

              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-slate-900">
            No matching events found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Try changing your search
            or filter selections.
          </p>

          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  }

  /*
   * NO EVENTS
   */
  if (events.length === 0) {
    return (
      <div className="p-6">
        <EventsEmptyState />
      </div>
    );
  }

  return (
    <>
      {/* =========================
          MOBILE EVENT CARDS
          ========================= */}
      <div className="space-y-3 p-4 md:hidden">
        {events.map((event) => (
          <EventMobileCard
            key={event.id}
            event={event}
            currentTime={currentTime}
            deletingId={deletingId}
            publishingId={publishingId}
            cancellingId={cancellingId}
            onDelete={onDelete}
            onPublish={onPublish}
            onCancel={onCancel}
          />
        ))}
      </div>

      {/* =========================
          DESKTOP TABLE
          ========================= */}
      <div className="hidden overflow-x-auto p-6 md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-3 pr-4 font-semibold">
                Event Name
              </th>

              <th className="py-3 pr-4 font-semibold">
                Schedule
              </th>

              <th className="py-3 pr-4 font-semibold">
                Target Municipalities
              </th>

              <th className="py-3 pr-4 font-semibold">
                Memo
              </th>

              <th className="py-3 pr-4 font-semibold">
                Preparation
              </th>

              <th className="py-3 pr-4 font-semibold">
                Status
              </th>

              <th className="py-3 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {events.map((event) => (
              <EventTableRow
                key={event.id}
                event={event}
                deletingId={deletingId}
                publishingId={publishingId}
                cancellingId={cancellingId}
                currentTime={currentTime}
                onDelete={onDelete}
                onPublish={onPublish}
                onCancel={onCancel}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}