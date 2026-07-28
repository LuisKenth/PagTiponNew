import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
} from "lucide-react";

import type { MunicipalityEventItem } from "../types/municipalityDetails";
import { formatDate } from "../../utils/municipalityUtils";

type MunicipalityEventsListProps = {
  events: MunicipalityEventItem[];
};

function getPreparationStatusClass(status: string | null) {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "prepared") {
    return "bg-green-50 text-green-700";
  }

  if (
    normalizedStatus === "preparing" ||
    normalizedStatus === "in_progress"
  ) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

function getPreparationStatusLabel(status: string | null) {
  if (!status) return "Pending";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function getEventStatusClass(status: string | null) {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "ongoing") {
    return "bg-blue-50 text-blue-700";
  }

  if (normalizedStatus === "completed") {
    return "bg-green-50 text-green-700";
  }

  if (normalizedStatus === "cancelled") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getEventStatusLabel(status: string | null) {
  if (!status) return "Unknown";

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function MunicipalityEventsList({
  events,
}: MunicipalityEventsListProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Provincial Events
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Events sent to this municipality and their current
          preparation status.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
            <CalendarDays size={22} />
          </div>

          <p className="mt-3 font-semibold text-slate-900">
            No provincial events
          </p>

          <p className="mt-1 text-sm text-slate-500">
            No provincial event has been sent to this
            municipality.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {events.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {item.event?.title ||
                        "Unavailable event"}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEventStatusClass(
                        item.event?.status || null
                      )}`}
                    >
                      {getEventStatusLabel(
                        item.event?.status || null
                      )}
                    </span>
                  </div>

                  {item.event?.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                      {item.event.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={14} />

                      {formatDate(item.event?.start_at || null)}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <ClipboardCheck size={14} />

                      Preparation:
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${getPreparationStatusClass(
                          item.preparation_status
                        )}`}
                      >
                        {getPreparationStatusLabel(
                          item.preparation_status
                        )}
                      </span>
                    </span>
                  </div>
                </div>

                {item.event && (
                  <Link
                    href={`/dashboard/provincial/events/${item.event.id}`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    View Event
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}