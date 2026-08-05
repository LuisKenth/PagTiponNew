"use client";

import {
  Building2,
  CircleAlert,
  LoaderCircle,
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

function formatVenueDate(
  value: string | null,
) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
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
      <div className="flex min-h-64 items-center justify-center px-6 py-12">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-slate-500" />

          <p className="mt-3 text-sm font-medium text-slate-500">
            Loading municipal venues...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-64 items-center justify-center px-6 py-12">
        <div className="max-w-lg text-center">
          <CircleAlert className="mx-auto h-9 w-9 text-red-500" />

          <h3 className="mt-3 font-bold text-slate-900">
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
      <div className="flex min-h-64 items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <SearchX className="mx-auto h-10 w-10 text-slate-300" />

          <h3 className="mt-4 font-bold text-slate-900">
            No venues found
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add a new municipal venue or
            adjust the current search.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Venue",
                "Municipality",
                "Capacity",
                "Last Updated",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className={`px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 ${
                    heading === "Actions"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {heading}
                </th>
              ))}
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

              return (
                <tr
                  key={venue.id}
                  className={`transition ${
                    editing
                      ? "bg-amber-50/60"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          editing
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-bold text-slate-900">
                          {venue.venue_name}
                        </p>

                        {editing && (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Currently editing
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {venue.municipality}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                      <UsersRound className="h-4 w-4" />

                      {venue.capacity?.toLocaleString() ||
                        "N/A"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 align-top text-sm text-slate-500">
                    {formatVenueDate(
                      venue.updated_at ||
                        venue.created_at,
                    )}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onEdit(venue)
                        }
                        disabled={deleting}
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleting ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}

                        {deleting
                          ? "Deleting..."
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

      <div className="divide-y divide-slate-200 lg:hidden">
        {venues.map((venue) => {
          const deleting =
            deletingVenueId === venue.id;

          const editing =
            editingVenueId === venue.id;

          return (
            <article
              key={venue.id}
              className={`p-5 ${
                editing
                  ? "bg-amber-50/60"
                  : "bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
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
                  <h3 className="font-bold text-slate-900">
                    {venue.venue_name}
                  </h3>

                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {venue.municipality}
                  </p>

                  {editing && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      Currently editing
                    </p>
                  )}
                </div>
              </div>

              <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Capacity
                  </dt>

                  <dd className="mt-1 font-semibold text-slate-800">
                    {venue.capacity?.toLocaleString() ||
                      "N/A"}{" "}
                    people
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Last Updated
                  </dt>

                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {formatVenueDate(
                      venue.updated_at ||
                        venue.created_at,
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onEdit(venue)
                  }
                  disabled={deleting}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
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
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
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
