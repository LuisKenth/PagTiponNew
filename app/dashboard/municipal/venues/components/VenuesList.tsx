"use client";

import {
  Building2,
  CalendarClock,
  CircleAlert,
  Loader2,
  MapPin,
  PencilLine,
  SearchX,
  Trash2,
  UsersRound,
} from "lucide-react";

import type {
  MunicipalVenue,
} from "../types/municipalVenues";

type VenuesListProps = {
  venues: MunicipalVenue[];
  loading: boolean;
  errorMessage: string | null;
  deletingVenueId: string | null;
  editingVenueId: string | null;
  onEdit: (
    venue: MunicipalVenue,
  ) => void;
  onDelete: (
    venue: MunicipalVenue,
  ) => void;
};

type FormattedVenueDate = {
  date: string;
  time: string;
};

const capacityFormatter =
  new Intl.NumberFormat("en-PH");

const venueDateFormatter =
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const venueTimeFormatter =
  new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });

function formatVenueDate(
  value: string | null,
): FormattedVenueDate | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date: venueDateFormatter.format(date),
    time: venueTimeFormatter.format(date),
  };
}

function formatVenueCapacity(
  capacity: number | null,
) {
  if (
    typeof capacity !== "number" ||
    !Number.isFinite(capacity)
  ) {
    return "N/A";
  }

  return capacityFormatter.format(
    capacity,
  );
}

export default function VenuesList({
  venues,
  loading,
  errorMessage,
  deletingVenueId,
  editingVenueId,
  onEdit,
  onDelete,
}: VenuesListProps) {
  if (loading) {
    return (
      <div
        aria-live="polite"
        className="flex min-h-72 items-center justify-center px-6 py-14"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
          </div>

          <h3 className="mt-4 text-sm font-bold text-slate-800">
            Loading venues
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Retrieving the latest municipal
            venue records.
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        role="alert"
        className="flex min-h-72 items-center justify-center px-6 py-14"
      >
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <CircleAlert className="h-6 w-6" />
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            Unable to load venues
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center px-6 py-14">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            <SearchX className="h-7 w-7 text-slate-400" />
          </div>

          <h3 className="mt-4 font-bold text-slate-900">
            No venues found
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            No venue matches the current
            search. Clear the search or add
            a new municipal venue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full table-fixed">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th
                scope="col"
                className="w-[31%] px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Venue
              </th>

              <th
                scope="col"
                className="w-[17%] px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Municipality
              </th>

              <th
                scope="col"
                className="w-[15%] px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Capacity
              </th>

              <th
                scope="col"
                className="w-[20%] px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Last Updated
              </th>

              <th
                scope="col"
                className="w-[17%] px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {venues.map((venue) => {
              const deleting =
                deletingVenueId ===
                venue.id;

              const editing =
                editingVenueId ===
                venue.id;

              const formattedDate =
                formatVenueDate(
                  venue.updated_at ||
                    venue.created_at,
                );

              return (
                <tr
                  key={venue.id}
                  className={`group transition-colors ${
                    editing
                      ? "bg-amber-50/70"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  <td
                    className={`border-l-4 px-5 py-4 ${
                      editing
                        ? "border-amber-400"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                          editing
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                        }`}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p
                          title={
                            venue.venue_name
                          }
                          className="truncate font-bold text-slate-900"
                        >
                          {
                            venue.venue_name
                          }
                        </p>

                        {editing ? (
                          <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Currently editing
                          </span>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">
                            Approved venue
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />

                      <span className="truncate">
                        {
                          venue.municipality
                        }
                      </span>
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                      <UsersRound className="h-4 w-4 shrink-0" />

                      {formatVenueCapacity(
                        venue.capacity,
                      )}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {formattedDate ? (
                      <div className="flex items-center gap-2.5">
                        <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />

                        <div>
                          <p className="whitespace-nowrap text-sm font-medium text-slate-700">
                            {
                              formattedDate.date
                            }
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {
                              formattedDate.time
                            }
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">
                        Not available
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onEdit(venue)
                        }
                        disabled={deleting}
                        aria-label={`Edit ${venue.venue_name}`}
                        className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          editing
                            ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onDelete(venue)
                        }
                        disabled={
                          deletingVenueId !==
                          null
                        }
                        aria-label={`Delete ${venue.venue_name}`}
                        className="inline-flex min-h-9 min-w-[82px] items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}

                        {deleting
                          ? "Deleting"
                          : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile and tablet cards */}
      <div className="space-y-3 bg-slate-50/60 p-4 lg:hidden">
        {venues.map((venue) => {
          const deleting =
            deletingVenueId ===
            venue.id;

          const editing =
            editingVenueId ===
            venue.id;

          const formattedDate =
            formatVenueDate(
              venue.updated_at ||
                venue.created_at,
            );

          return (
            <article
              key={venue.id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                editing
                  ? "border-amber-300 ring-2 ring-amber-100"
                  : "border-slate-200"
              }`}
            >
              <div
                className={`flex items-start gap-3 border-b p-4 ${
                  editing
                    ? "border-amber-100 bg-amber-50/60"
                    : "border-slate-100"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    editing
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-950 text-white"
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words font-bold text-slate-900">
                      {venue.venue_name}
                    </h3>

                    {editing && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        Editing
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {venue.municipality}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                <div className="p-4">
                  <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <UsersRound className="h-3.5 w-3.5" />
                    Capacity
                  </dt>

                  <dd className="mt-2 text-base font-bold text-emerald-700">
                    {formatVenueCapacity(
                      venue.capacity,
                    )}
                  </dd>

                  <p className="mt-0.5 text-xs text-slate-400">
                    people
                  </p>
                </div>

                <div className="p-4">
                  <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Updated
                  </dt>

                  <dd className="mt-2 text-sm font-semibold text-slate-700">
                    {formattedDate
                      ? formattedDate.date
                      : "Not available"}
                  </dd>

                  {formattedDate && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {
                        formattedDate.time
                      }
                    </p>
                  )}
                </div>
              </dl>

              <div className="grid grid-cols-2 gap-2 p-4">
                <button
                  type="button"
                  onClick={() =>
                    onEdit(venue)
                  }
                  disabled={deleting}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    editing
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <PencilLine className="h-4 w-4" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onDelete(venue)
                  }
                  disabled={
                    deletingVenueId !== null
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}

                  {deleting
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}