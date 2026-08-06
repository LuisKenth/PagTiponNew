"use client";

import type {
  FormEvent,
} from "react";

import {
  Building2,
  Loader2,
  PencilLine,
  Plus,
  Save,
  UsersRound,
  X,
} from "lucide-react";

import type {
  MunicipalVenue,
} from "../types/municipalVenues";

type VenueFormProps = {
  editingVenue: MunicipalVenue | null;
  venueName: string;
  capacity: string;
  saving: boolean;
  onVenueNameChange: (
    value: string,
  ) => void;
  onCapacityChange: (
    value: string,
  ) => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
  onCancelEdit: () => void;
};

export default function VenueForm({
  editingVenue,
  venueName,
  capacity,
  saving,
  onVenueNameChange,
  onCapacityChange,
  onSubmit,
  onCancelEdit,
}: VenueFormProps) {
  const isEditing =
    editingVenue !== null;

  return (
    <section
      aria-labelledby="venue-form-heading"
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        isEditing
          ? "border-amber-200"
          : "border-slate-200"
      }`}
    >
      <div
        className={`flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
          isEditing
            ? "border-amber-100 bg-amber-50/40"
            : "border-slate-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${
              isEditing
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-950 text-white"
            }`}
          >
            {isEditing ? (
              <PencilLine className="h-5 w-5" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="venue-form-heading"
                className="text-lg font-bold text-slate-900"
              >
                {isEditing
                  ? "Edit Venue"
                  : "Add New Venue"}
              </h2>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  isEditing
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isEditing
                  ? "Edit mode"
                  : "New record"}
              </span>
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {isEditing
                ? `Update the name or capacity of ${editingVenue.venue_name}.`
                : "Create an approved municipal venue for future event assignments."}
            </p>
          </div>
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={saving}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <X className="h-4 w-4" />
            Cancel Edit
          </button>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        aria-busy={saving}
        className="p-5 sm:p-6"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <label
              htmlFor="venue-name"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Venue Name
            </label>

            <div className="relative">
              <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="venue-name"
                type="text"
                value={venueName}
                onChange={(event) =>
                  onVenueNameChange(
                    event.target.value,
                  )
                }
                disabled={saving}
                placeholder="Example: Municipal Gymnasium"
                autoComplete="off"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-600 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Use the official or commonly
              recognized venue name.
            </p>
          </div>

          <div>
            <label
              htmlFor="venue-capacity"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Maximum Capacity
            </label>

            <div className="relative">
              <UsersRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="venue-capacity"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={capacity}
                onChange={(event) =>
                  onCapacityChange(
                    event.target.value,
                  )
                }
                disabled={saving}
                placeholder="Example: 300"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-600 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Enter the maximum number of
              attendees allowed.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Both fields are required. Capacity
            must be greater than zero.
          </p>

          <button
            type="submit"
            disabled={saving}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
              isEditing
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-slate-950 hover:bg-slate-800"
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEditing ? (
              <Save className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {saving
              ? isEditing
                ? "Updating Venue..."
                : "Adding Venue..."
              : isEditing
                ? "Save Changes"
                : "Add Venue"}
          </button>
        </div>
      </form>
    </section>
  );
}