"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

import type { ReceivedEvent } from "../types/municipalDashboard";

import MunicipalDashboardLoading from "./MunicipalDashboardLoading";
import ReceivedEventCard from "./ReceivedEventCard";

type ReceivedEventsSectionProps = {
  events: ReceivedEvent[];
  loading: boolean;
  highlightedEventId?: string | null;
  onPrepare: (item: ReceivedEvent) => void;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export default function ReceivedEventsSection({
  events,
  loading,
  highlightedEventId = null,
  onPrepare,
}: ReceivedEventsSectionProps) {
  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(5);

  const eventCardRefs = useRef<
    Record<string, HTMLDivElement | null>
  >({});

  const totalPages = Math.max(
    1,
    Math.ceil(events.length / pageSize),
  );

  const paginatedEvents = useMemo(() => {
    const startIndex =
      (currentPage - 1) * pageSize;

    const endIndex =
      startIndex + pageSize;

    return events.slice(
      startIndex,
      endIndex,
    );
  }, [
    events,
    currentPage,
    pageSize,
  ]);

  const firstVisibleItem =
    events.length === 0
      ? 0
      : (currentPage - 1) *
          pageSize +
        1;

  const lastVisibleItem = Math.min(
    currentPage * pageSize,
    events.length,
  );

  /*
   * Keep the current page valid when events
   * are removed or the page size changes.
   */
  useEffect(() => {
    setCurrentPage((previousPage) =>
      Math.min(previousPage, totalPages),
    );
  }, [totalPages]);

  /*
   * When an event is opened through a notification,
   * automatically move to the page containing it.
   */
  useEffect(() => {
    if (
      !highlightedEventId ||
      events.length === 0
    ) {
      return;
    }

    const targetIndex =
      events.findIndex(
        (item) =>
          String(item.id) ===
          highlightedEventId,
      );

    if (targetIndex < 0) {
      return;
    }

    const targetPage =
      Math.floor(
        targetIndex / pageSize,
      ) + 1;

    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }
  }, [
    highlightedEventId,
    events,
    pageSize,
    currentPage,
  ]);

  /*
   * Scroll to the highlighted card after its
   * pagination page has been rendered.
   */
  useEffect(() => {
    if (!highlightedEventId) {
      return;
    }

    const scrollTimer =
      window.setTimeout(() => {
        const highlightedCard =
          eventCardRefs.current[
            highlightedEventId
          ];

        if (!highlightedCard) {
          return;
        }

        highlightedCard.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 250);

    return () => {
      window.clearTimeout(
        scrollTimer,
      );
    };
  }, [
    highlightedEventId,
    currentPage,
  ]);

  function handlePageSizeChange(
    newPageSize: number,
  ) {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }

  function goToPreviousPage() {
    setCurrentPage((previousPage) =>
      Math.max(1, previousPage - 1),
    );
  }

  function goToNextPage() {
    setCurrentPage((previousPage) =>
      Math.min(
        totalPages,
        previousPage + 1,
      ),
    );
  }

  return (
    <section
      aria-labelledby="received-events-heading"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Section header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <CalendarDays className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2
              id="received-events-heading"
              className="text-lg font-bold text-slate-900 sm:text-xl"
            >
              Received Provincial Events
            </h2>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Review event details, update local
              preparation, and control participant
              registration.
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <span className="h-2 w-2 rounded-full bg-slate-400" />

          {loading
            ? "Loading"
            : `${events.length} ${
                events.length === 1
                  ? "Event"
                  : "Events"
              }`}
        </span>
      </div>

      {/* Section content */}
      <div className="p-4 sm:p-5 lg:p-6">
        {loading ? (
          <MunicipalDashboardLoading />
        ) : events.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
              <Inbox className="h-7 w-7" />
            </div>

            <h3 className="mt-4 text-base font-bold text-slate-900">
              No provincial events received
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Published events assigned to your
              municipality will appear here for
              local preparation and registration
              management.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedEvents.map(
              (item) => {
                const eventAssignmentId =
                  String(item.id);

                const isHighlighted =
                  highlightedEventId ===
                  eventAssignmentId;

                return (
                  <div
                    key={
                      eventAssignmentId
                    }
                    ref={(element) => {
                      eventCardRefs.current[
                        eventAssignmentId
                      ] = element;
                    }}
                    className={`scroll-mt-24 rounded-2xl transition-all duration-500 ${
                      isHighlighted
                        ? "scale-[1.01] bg-blue-50 shadow-lg shadow-blue-100 ring-4 ring-blue-400/40"
                        : ""
                    }`}
                  >
                    <ReceivedEventCard
                      item={item}
                      onPrepare={
                        onPrepare
                      }
                    />
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading &&
        events.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-800">
                  {firstVisibleItem}
                </span>
                {" – "}
                <span className="font-semibold text-slate-800">
                  {lastVisibleItem}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-800">
                  {events.length}
                </span>{" "}
                events
              </p>

              <label className="flex items-center gap-2 text-sm text-slate-500">
                <span>Show</span>

                <select
                  value={pageSize}
                  onChange={(event) =>
                    handlePageSizeChange(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  aria-label="Events per page"
                >
                  {PAGE_SIZE_OPTIONS.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    ),
                  )}
                </select>

                <span>per page</span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={
                  currentPage === 1
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="whitespace-nowrap text-sm font-medium text-slate-600">
                Page{" "}
                <span className="font-bold text-slate-900">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">
                  {totalPages}
                </span>
              </span>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={
                  currentPage ===
                  totalPages
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
    </section>
  );
}