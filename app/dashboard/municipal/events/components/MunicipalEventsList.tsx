import {
  FilterX,
  Search,
} from "lucide-react";

import type { ReceivedEvent } from "../../types/municipalDashboard";

import ReceivedEventCard from "../../components/ReceivedEventCard";

type MunicipalEventsListProps = {
  events: ReceivedEvent[];
  loading: boolean;
  firstVisibleItem: number;
  lastVisibleItem: number;
  totalFilteredEvents: number;
  hasActiveFilters: boolean;
  onPrepare: (
    item: ReceivedEvent,
  ) => void;
  onClearFilters: () => void;
};

export default function MunicipalEventsList({
  events,
  loading,
  firstVisibleItem,
  lastVisibleItem,
  totalFilteredEvents,
  hasActiveFilters,
  onPrepare,
  onClearFilters,
}: MunicipalEventsListProps) {
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Municipal Event Assignments
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Open an event to manage its
            preparation and registration.
          </p>
        </div>

        {!loading &&
          totalFilteredEvents > 0 && (
            <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {firstVisibleItem}–
              {lastVisibleItem} of{" "}
              {totalFilteredEvents}
            </span>
          )}
      </div>

      <div className="p-4 sm:p-5 lg:p-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
                />
              ),
            )}
          </div>
        ) : totalFilteredEvents === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <Search className="h-10 w-10 text-slate-300" />

            <h3 className="mt-4 text-base font-bold text-slate-900">
              No matching events found
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Try changing your search,
              preparation status, or
              registration filters.
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <FilterX className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((item) => (
              <ReceivedEventCard
                key={item.id}
                item={item}
                onPrepare={onPrepare}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
