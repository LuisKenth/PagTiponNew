"use client";

import type {
  FormEvent,
} from "react";

import {
  Building2,
  Save,
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
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              editingVenue
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-950 text-white"
            }`}
          >
            <Building2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingVenue
                ? "Edit Venue"
                : "Add New Venue"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {editingVenue
                ? `Update the information for ${editingVenue.venue_name}.`
                : "Create a municipal venue that can be assigned to future events."}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]"
      >
        <div>
          <label
            htmlFor="venue-name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Venue Name
          </label>

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
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="venue-capacity"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Maximum Capacity
          </label>

          <input
            id="venue-capacity"
            type="number"
            min="1"
            step="1"
            value={capacity}
            onChange={(event) =>
              onCapacityChange(
                event.target.value,
              )
            }
            disabled={saving}
            placeholder="Example: 300"
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 sm:flex-row lg:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />

            {saving
              ? "Saving..."
              : editingVenue
                ? "Update Venue"
                : "Add Venue"}
          </button>

          {editingVenue && (
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
