import Link from "next/link";

import type { MemoEvent } from "../types";

import {
  formatDate,
  getStatusClass,
} from "../utils";

type EventsWithoutMemoProps = {
  events: MemoEvent[];
};

export default function EventsWithoutMemo({
  events,
}: EventsWithoutMemoProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Events Without Official Memo
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          These provincial events currently have no uploaded
          memo.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">
                  {event.title || "Untitled Event"}
                </p>

                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusClass(
                    event.status
                  )}`}
                >
                  {event.status || "No status"}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Created {formatDate(event.created_at)}
              </p>
            </div>

            <Link
              href={`/dashboard/provincial/events/${event.id}/edit`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Add Memo
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}