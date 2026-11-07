"use client";

import { useState, type FormEvent } from "react";

import {
  Building2,
  CheckCircle2,
  Loader2,
  PencilLine,
  Plus,
  Save,
  UsersRound,
  X,
} from "lucide-react";

import type { MunicipalVenue } from "../types/municipalVenues";

import VenueMap, { type SelectedVenuePin } from "@/app/components/VenueMap";
import { photoError } from "@/lib/venues/location";
import type { VenueLocationDraft } from "../hooks/useMunicipalVenues";
type VenueFormProps = {
  editingVenue: MunicipalVenue | null;
  venueName: string;
  capacity: string;
  saving: boolean;
  location: VenueLocationDraft;
  photoFiles: File[];
  onLocationChange: (value: VenueLocationDraft) => void;
  onPhotosChange: (files: File[]) => void;
  onPlaceSelect: (place: SelectedVenuePin) => void;

  onVenueNameChange: (value: string) => void;

  onCapacityChange: (value: string) => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;

  onCancelEdit: () => void;
};

export default function VenueForm({
  editingVenue,
  venueName,
  capacity,
  saving,
  location,
  photoFiles,
  onLocationChange,
  onPhotosChange,
  onPlaceSelect,
  onVenueNameChange,
  onCapacityChange,
  onSubmit,
  onCancelEdit,
}: VenueFormProps) {
  const [fileError, setFileError] = useState("");
  const isEditing = editingVenue !== null;

  /*
   * The select is intentionally
   * uncontrolled.
   *
   * useMunicipalVenues reads its value
   * using FormData during submit.
   *
   * Because of this, page.tsx does not
   * need any new props.
   */
  const defaultStatus = editingVenue?.status ?? "active";

  return (
    <section
      aria-labelledby="venue-form-heading"
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        isEditing ? "border-amber-200" : "border-slate-200"
      }`}
    >
      <div
        className={`flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
          isEditing ? "border-amber-100 bg-amber-50/40" : "border-slate-200"
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
                {isEditing ? "Edit Venue" : "Add New Venue"}
              </h2>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  isEditing
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isEditing ? "Edit mode" : "New record"}
              </span>
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {isEditing
                ? `Update the name, capacity, or status of ${editingVenue.venue_name}.`
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

      <form onSubmit={onSubmit} aria-busy={saving} className="p-5 sm:p-6">
        <div className="mb-5">
          <VenueMap
            latitude={location.latitude}
            longitude={location.longitude}
            onSelect={onPlaceSelect}
            disabled={saving}
          />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {/* VENUE NAME */}
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
                required
                maxLength={150}
                type="text"
                value={venueName}
                onChange={(event) => onVenueNameChange(event.target.value)}
                disabled={saving}
                placeholder="Example: Municipal Gymnasium"
                autoComplete="off"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-600 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Use the official or commonly recognized venue name.
            </p>
          </div>

          {/* CAPACITY */}
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
                required
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={capacity}
                onChange={(event) => onCapacityChange(event.target.value)}
                disabled={saving}
                placeholder="Example: 300"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-600 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Enter the maximum number of attendees allowed.
            </p>
          </div>

          {/* STATUS */}
          <div>
            <label
              htmlFor="venue-status"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Venue Status
            </label>

            <div className="relative">
              <CheckCircle2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                key={editingVenue?.id ?? "new-venue"}
                id="venue-status"
                name="status"
                defaultValue={defaultStatus}
                disabled={saving}
                className="min-h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-400 focus:border-slate-600 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="active">Active</option>

                <option value="inactive">Inactive</option>
              </select>

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                ▼
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Active venues can be assigned to events. Inactive venues remain in
              records but cannot be selected for event preparation.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label
            htmlFor="venue-address"
            className="text-sm font-semibold text-slate-800"
          >
            Address
            <input
              id="venue-address"
              value={location.address}
              disabled={saving}
              maxLength={500}
              onChange={(e) => {
                onLocationChange({
                  ...location,
                  address: e.target.value,
                  google_place_id: null,
                  maps_url: location.google_place_id ? "" : location.maps_url,
                  map_embed_url: location.google_place_id
                    ? ""
                    : location.map_embed_url,
                });
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal"
            />
          </label>
          <label
            htmlFor="venue-landmark"
            className="text-sm font-semibold text-slate-800"
          >
            Landmark (optional)
            <input
              id="venue-landmark"
              value={location.landmark}
              disabled={saving}
              maxLength={250}
              onChange={(e) =>
                onLocationChange({ ...location, landmark: e.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal"
            />
          </label>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Confirm the official venue name and address before saving. The
          municipality assigned to this record is your municipality; map search
          does not verify municipal boundaries. Editing the address clears the
          selected map location.
        </p>
        {location.latitude != null && (
          <p
            role="status"
            className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            Map pin selected. Add the maximum capacity, then Save Venue.
          </p>
        )}
        <label
          htmlFor="new-venue-photos"
          className="mt-5 block text-sm font-semibold text-slate-800"
        >
          Venue photos (optional)
          <input
            key={editingVenue?.id ?? "new"}
            id="new-venue-photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={saving}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              setFileError("");
              if (
                photoFiles.length +
                  files.length +
                  (editingVenue?.photo_paths.length ?? 0) >
                3
              ) {
                setFileError("Choose up to 3 photos.");
                return;
              }
              const invalid = files.map(photoError).find(Boolean);
              if (invalid) {
                setFileError(invalid);
                return;
              }
              onPhotosChange([...photoFiles, ...files]);
            }}
            className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm font-normal"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          JPG, PNG, or WebP · Up to 3 photos total · Maximum 5 MB each. Manage
          saved photos through View Location.
        </p>
        {fileError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {fileError}
          </p>
        )}
        {photoFiles.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs"
          >
            <span className="break-all">{file.name}</span>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                onPhotosChange(photoFiles.filter((_, i) => i !== index))
              }
              className="shrink-0 font-semibold text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Venue name and capacity are required. Set the status to Inactive
            when the venue should no longer be available for event assignments.
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
                : "Save Venue"}
          </button>
        </div>
      </form>
    </section>
  );
}
