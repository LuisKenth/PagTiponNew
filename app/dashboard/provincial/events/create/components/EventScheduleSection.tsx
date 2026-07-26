"use client";

import { useEffect, useState } from "react";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  TriangleAlert,
} from "lucide-react";

type EventScheduleSectionProps = {
  startAt: string;
  endAt: string;
  onStartAtChange: (value: string) => void;
  onEndAtChange: (value: string) => void;
};

function getDuration(startAt: string, endAt: string) {
  if (!startAt || !endAt) {
    return null;
  }

  const start = new Date(startAt);
  const end = new Date(endAt);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return null;
  }

  const totalMinutes = Math.floor(
    (end.getTime() - start.getTime()) / 60000
  );

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }

  if (minutes > 0) {
    parts.push(
      `${minutes} ${minutes === 1 ? "minute" : "minutes"}`
    );
  }

  return parts.length > 0
    ? parts.join(" ")
    : "Less than 1 minute";
}

function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) =>
    String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

export default function EventScheduleSection({
  startAt,
  endAt,
  onStartAtChange,
  onEndAtChange,
}: EventScheduleSectionProps) {
  const [now, setNow] = useState(new Date());

  /*
   * Keep current time updated while the form remains open.
   * This prevents an old selected start time from staying
   * marked as valid after that time has already passed.
   */
  useEffect(() => {
    const updateCurrentTime = () => {
      setNow(new Date());
    };

    updateCurrentTime();

    const interval = window.setInterval(
      updateCurrentTime,
      30_000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const hasStart = Boolean(startAt);
  const hasEnd = Boolean(endAt);

  const startDate = hasStart
    ? new Date(startAt)
    : null;

  const endDate = hasEnd
    ? new Date(endAt)
    : null;

  const validStartDate =
    startDate !== null &&
    !Number.isNaN(startDate.getTime());

  const validEndDate =
    endDate !== null &&
    !Number.isNaN(endDate.getTime());

  /*
   * Start time must still be in the future.
   */
  const startIsPast =
    validStartDate &&
    startDate.getTime() <= now.getTime();

  /*
   * End must always be later than start.
   */
  const endBeforeOrEqualStart =
    validStartDate &&
    validEndDate &&
    endDate.getTime() <= startDate.getTime();

  const invalidSchedule =
    Boolean(
      startIsPast ||
      endBeforeOrEqualStart
    );

  const validSchedule =
    Boolean(
      validStartDate &&
      validEndDate &&
      !startIsPast &&
      !endBeforeOrEqualStart
    );

  const duration =
    validSchedule
      ? getDuration(startAt, endAt)
      : null;

  const minimumStartTime =
    toDateTimeLocalValue(now);

  const minimumEndTime =
    startAt || minimumStartTime;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <CalendarDays size={19} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Event Schedule
            </h2>

            <p className="text-sm text-slate-500">
              Set when the provincial event will start and end.
            </p>
          </div>
        </div>

        {validSchedule ? (
          <div className="flex self-start items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:self-auto">
            <CheckCircle2 size={14} />
            Valid Schedule
          </div>
        ) : invalidSchedule ? (
          <div className="flex self-start items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 sm:self-auto">
            <TriangleAlert size={14} />
            Invalid Schedule
          </div>
        ) : (
          <div className="flex self-start items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 sm:self-auto">
            <Clock3 size={14} />
            Incomplete
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Start */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label
              htmlFor="start-date"
              className="text-sm font-medium text-slate-700"
            >
              Start Date & Time
            </label>

            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
              Required to publish
            </span>
          </div>

          <div className="relative">
            <CalendarDays
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="start-date"
              type="datetime-local"
              value={startAt}
              min={minimumStartTime}
              onChange={(e) =>
                onStartAtChange(e.target.value)
              }
              className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:ring-4 ${
                startIsPast
                  ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                  : "border-slate-200 focus:border-slate-400 focus:ring-slate-100"
              }`}
            />
          </div>

          <p
            className={`mt-2 text-xs ${
              startIsPast
                ? "font-medium text-red-500"
                : "text-slate-400"
            }`}
          >
            {startIsPast
              ? "Start date and time must be later than the current time."
              : "Set the official starting date and time."}
          </p>
        </div>

        {/* End */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label
              htmlFor="end-date"
              className="text-sm font-medium text-slate-700"
            >
              End Date & Time
            </label>

            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
              Required to publish
            </span>
          </div>

          <div className="relative">
            <CalendarDays
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="end-date"
              type="datetime-local"
              value={endAt}
              min={minimumEndTime}
              onChange={(e) =>
                onEndAtChange(e.target.value)
              }
              className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:ring-4 ${
                endBeforeOrEqualStart
                  ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                  : "border-slate-200 focus:border-slate-400 focus:ring-slate-100"
              }`}
            />
          </div>

          <p
            className={`mt-2 text-xs ${
              endBeforeOrEqualStart
                ? "font-medium text-red-500"
                : "text-slate-400"
            }`}
          >
            {endBeforeOrEqualStart
              ? "End date and time must be later than the start."
              : "Set the expected ending date and time."}
          </p>
        </div>
      </div>

      {/* Valid Schedule */}
      {validSchedule && duration && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock3
                size={16}
                className="text-emerald-600"
              />

              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Event Duration
              </p>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-800">
              {duration}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={16}
                className="text-slate-500"
              />

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Schedule Status
              </p>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-800">
              Ready for publishing
            </p>
          </div>
        </div>
      )}

      {/* Invalid Start */}
      {startIsPast && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <TriangleAlert
            size={18}
            className="mt-0.5 shrink-0 text-red-500"
          />

          <div>
            <p className="text-sm font-semibold text-red-700">
              Event start time has already passed
            </p>

            <p className="mt-1 text-xs leading-5 text-red-600">
              Select a new start date and time later than the
              current time before publishing this event.
            </p>
          </div>
        </div>
      )}

      {/* Invalid End */}
      {!startIsPast &&
        endBeforeOrEqualStart && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <TriangleAlert
              size={18}
              className="mt-0.5 shrink-0 text-red-500"
            />

            <div>
              <p className="text-sm font-semibold text-red-700">
                Invalid event end time
              </p>

              <p className="mt-1 text-xs leading-5 text-red-600">
                The event end date and time must be later than
                the selected start date and time.
              </p>
            </div>
          </div>
        )}

      {/* Incomplete */}
      {!validSchedule &&
        !invalidSchedule && (
          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs leading-5 text-slate-500">
              Schedule details may remain incomplete while saving a
              draft. Both the start and end date and time are required
              before publishing.
            </p>
          </div>
        )}
    </section>
  );
}