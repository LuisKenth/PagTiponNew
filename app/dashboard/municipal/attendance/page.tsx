
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import useAttendanceEventList from "./hooks/useAttendanceEventList";

const PAGE_SIZE = 10;

function formatEventDate(value: string | null) {
  if (!value) return "Date not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-green-50 text-green-700";
    case "ongoing":
      return "bg-blue-50 text-blue-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    case "published":
    case "upcoming":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function MunicipalAttendancePage() {
  const {
    events,
    loading,
    errorMessage,
    refresh,
  } = useAttendanceEventList();

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const filteredEvents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return events;

    return events.filter((event) =>
      event.title.toLowerCase().includes(search),
    );
  }, [events, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEvents.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const firstItem =
    filteredEvents.length === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;

  const lastItem = Math.min(
    currentPage * PAGE_SIZE,
    filteredEvents.length,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white">
            <ClipboardList size={24} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Event Attendance
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Select an event to view and monitor participant
            attendance records.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Event Search and List */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Attendance Events
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Search for an event and open its attendance
            records.
          </p>

          <div className="relative mt-5 max-w-xl">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search event title..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {errorMessage ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          ) : loading ? (
            <div
              role="status"
              className="py-12 text-center text-sm text-slate-500"
            >
              Loading attendance events...
            </div>
          ) : paginatedEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <CalendarDays
                size={28}
                className="mx-auto text-slate-400"
              />

              <h3 className="mt-3 font-semibold text-slate-900">
                No events found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {searchTerm
                  ? "Try a different event title."
                  : "No attendance events are available yet."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {paginatedEvents.map((event) => (
                <article
                  key={event.eventMunicipalityId}
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-indigo-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 break-words font-bold text-slate-900">
                      {event.title}
                    </h3>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                        event.status,
                      )}`}
                    >
                      {formatStatus(event.status)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <CalendarDays size={16} />
                    {formatEventDate(event.startAt)}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users size={17} />
                      Registered Participants
                    </div>

                    <span className="text-lg font-bold text-slate-900">
                      {event.registeredCount}
                    </span>
                  </div>

                  <Link
                    href={`/dashboard/municipal/attendance/${encodeURIComponent(
                      event.eventMunicipalityId,
                    )}`}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    View Attendance
                    <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        {!loading &&
          !errorMessage &&
          filteredEvents.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
              <p className="text-sm text-slate-500">
                Showing {firstItem}–{lastItem} of{" "}
                {filteredEvents.length} events
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setPage(Math.max(1, currentPage - 1))
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-sm text-slate-600">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage(
                      Math.min(totalPages, currentPage + 1),
                    )
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
      </section>
    </div>
  );
}
