"use client";
/* eslint-disable @next/next/no-img-element -- Private signed image URLs are short-lived and rendered without the image optimization proxy. */
import { supabase } from "@/lib/supabase";
import {
  cleanLocation,
  locationError,
  photoError,
  validMapEmbed,
  VENUE_PHOTO_BUCKET,
  VENUE_PHOTO_LIMIT,
  venueMapLink,
  type VenueLocation,
  type VenueLocationInput,
} from "@/lib/venues/location";
import { ExternalLink, Loader2, MapPin, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import VenueMap from "./VenueMap";
type Target = {
  venueId?: string;
  eventMunicipalityId?: string;
  editable?: boolean;
  label?: string;
};
const blank: VenueLocationInput = {
  address: "",
  landmark: "",
  maps_url: "",
  map_embed_url: "",
};
function errorText(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "Unable to load venue details. Please try again.";
}
export default function VenueLocationButton(props: Target) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
      >
        <MapPin className="h-4 w-4" />
        {props.label ?? "View Location"}
      </button>
      {open && (
        <VenueLocationDialog {...props} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
function VenueLocationDialog({
  venueId,
  eventMunicipalityId,
  editable = false,
  onClose,
}: Target & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useId();
  const [venue, setVenue] = useState<VenueLocation | null>(null),
    [draft, setDraft] = useState<VenueLocationInput>(blank);
  const [pin, setPin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [paths, setPaths] = useState<string[]>([]),
    [files, setFiles] = useState<File[]>([]),
    [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [photoWarning, setPhotoWarning] = useState(""),
    [success, setSuccess] = useState("");
  const active = useRef(true),
    inputRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setPhotoWarning("");
    try {
      const { data, error } = await supabase.rpc("get_venue_location", {
        p_venue_id: venueId ?? null,
        p_event_municipality_id: eventMunicipalityId ?? null,
      });
      if (error) throw error;
      if (!active.current) return;
      const item = data as VenueLocation | null;
      setVenue(item);
      setPin(
        item?.latitude != null && item?.longitude != null
          ? { latitude: item.latitude, longitude: item.longitude }
          : null,
      );
      setFiles([]);
      setPaths(item?.photo_paths ?? []);
      setImages({});
      if (!item) return;
      setDraft({
        address: item.address ?? "",
        landmark: item.landmark ?? "",
        maps_url: item.maps_url ?? "",
        map_embed_url: item.map_embed_url ?? "",
      });
      if (item.photo_paths.length) {
        const { data: urls, error: signError } = await supabase.storage
          .from(VENUE_PHOTO_BUCKET)
          .createSignedUrls(item.photo_paths, 600);
        if (!active.current) return;
        if (signError || urls?.some((url) => url.error))
          setPhotoWarning(
            "Some photos could not be loaded. Retry photos to try again.",
          );
        setImages(
          Object.fromEntries(
            (urls ?? [])
              .filter((url) => url.signedUrl && url.path)
              .map((url) => [url.path!, url.signedUrl!]),
          ),
        );
      }
    } catch (e) {
      if (active.current) setError(errorText(e));
    } finally {
      if (active.current) setLoading(false);
    }
  }, [venueId, eventMunicipalityId]);
  useEffect(() => {
    active.current = true;
    dialog.current?.showModal();
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      active.current = false;
      window.clearTimeout(timer);
    };
  }, [load]);
  const dirty =
    JSON.stringify(cleanLocation(draft)) !==
      JSON.stringify({
        address: venue?.address ?? "",
        landmark: venue?.landmark ?? "",
        maps_url: venue?.maps_url ?? "",
        map_embed_url: venue?.map_embed_url ?? "",
      }) ||
    JSON.stringify(paths) !== JSON.stringify(venue?.photo_paths ?? []) ||
    files.length > 0;
  function close() {
    if (busy) return;
    if (
      editable &&
      dirty &&
      !window.confirm("Discard unsaved venue location changes?")
    )
      return;
    onClose();
  }
  async function refreshImages() {
    if (!venue) return;
    setPhotoWarning("");
    const { data, error } = await supabase.storage
      .from(VENUE_PHOTO_BUCKET)
      .createSignedUrls(paths, 600);
    if (!active.current) return;
    if (error || data?.some((item) => item.error))
      setPhotoWarning(
        "Some photos could not be loaded. Check your connection and try again.",
      );
    setImages(
      Object.fromEntries(
        (data ?? [])
          .filter((item) => item.path && item.signedUrl)
          .map((item) => [item.path!, item.signedUrl!]),
      ),
    );
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !venue) return;
    setSuccess("");
    setError("");
    const details = cleanLocation(draft),
      validation = locationError(details);
    if (validation) {
      setError(validation);
      return;
    }
    if (paths.length + files.length > VENUE_PHOTO_LIMIT) {
      setError("A venue may have at most 3 photos.");
      return;
    }
    setBusy(true);
    const uploaded: string[] = [];
    try {
      // Database RPC performs the authoritative role, approval, municipality and ban checks.
      const { data: authorized, error: authError } = await supabase.rpc(
        "can_manage_venue_location",
        { p_venue_id: venue.id },
      );
      if (authError) throw authError;
      if (!authorized)
        throw new Error(
          "Only an active Municipal Admin of this municipality may edit this venue.",
        );
      for (const file of files) {
        const invalid = photoError(file);
        if (invalid) throw new Error(invalid);
        const ext =
          file.type === "image/jpeg"
            ? "jpg"
            : file.type === "image/png"
              ? "png"
              : "webp";
        const path = `${venue.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from(VENUE_PHOTO_BUCKET)
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
            cacheControl: "600",
          });
        if (error) throw error;
        uploaded.push(path);
      }
      const { data, error } = await supabase
        .from("venues")
        .update({
          ...details,
          latitude: pin?.latitude ?? null,
          longitude: pin?.longitude ?? null,
          google_place_id:
            details.address !== (venue.address ?? "") ||
            details.maps_url !== (venue.maps_url ?? "") ||
            details.map_embed_url !== (venue.map_embed_url ?? "")
              ? null
              : (venue.google_place_id ?? null),
          photo_paths: [...paths, ...uploaded],
        })
        .eq("id", venue.id)
        .eq("location_revision", venue.location_revision)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        throw new Error(
          "This venue changed in another session. Close and reopen Venue Details before saving again.",
        );
      const removed = venue.photo_paths.filter((path) => !paths.includes(path));
      if (removed.length) {
        const { error: cleanup } = await supabase.storage
          .from(VENUE_PHOTO_BUCKET)
          .remove(removed);
        if (cleanup && active.current)
          setPhotoWarning(
            "Changes saved, but some removed photo files could not be cleaned up.",
          );
      }
      if (active.current) {
        setSuccess("Venue location and photos saved successfully.");
        await load();
      }
    } catch (e) {
      // Cleanup cannot delete attached photos: the Storage DELETE policy prevents it.
      if (uploaded.length) {
        try {
          await supabase.storage.from(VENUE_PHOTO_BUCKET).remove(uploaded);
        } catch {
          /* Retain the original save error; attached assets are protected by RLS. */
        }
      }
      if (active.current)
        setError(
          `${errorText(e)} If the connection was lost while saving, reopen Venue Details to confirm the saved record before retrying.`,
        );
    } finally {
      if (active.current) setBusy(false);
    }
  }
  const fieldClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";
  return (
    <dialog
      ref={dialog}
      aria-labelledby={heading}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={onClose}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60"
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Venue Details
          </p>
          <h2 id={heading} className="mt-1 break-words text-xl font-bold">
            {venue?.venue_name ?? "Venue location & photos"}
          </h2>
          {venue && (
            <p className="mt-1 text-sm text-slate-500">
              {venue.municipality} ·{" "}
              {venue.capacity?.toLocaleString("en-PH") ?? "—"} people
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Close venue details"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </header>
      <div className="space-y-5 p-5 sm:p-6" aria-busy={loading || busy}>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {success}
          </p>
        )}
        {loading ? (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-slate-600"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading venue details…
          </p>
        ) : !venue ? (
          <>
            <p className="text-sm text-slate-600">
              {error
                ? "Unable to load venue details."
                : "The venue has not been assigned yet. Please check again later."}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <section className="space-y-3">
              <div>
                <h3 className="font-semibold">Address</h3>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">
                  {venue.address || "Address has not been added yet."}
                </p>
              </div>
              {venue.landmark && (
                <div>
                  <h3 className="font-semibold">Landmark</h3>
                  <p className="mt-1 break-words text-sm text-slate-600">
                    {venue.landmark}
                  </p>
                </div>
              )}
              <a
                href={venueMapLink(venue)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <ExternalLink size={16} />
                {venue.latitude != null ? "Open map location" : "Open map link"}
              </a>
              {venue.latitude != null && venue.longitude != null ? (
                <VenueMap
                  latitude={venue.latitude}
                  longitude={venue.longitude}
                />
              ) : venue.map_embed_url && validMapEmbed(venue.map_embed_url) ? (
                <>
                  <iframe
                    title={`Map of ${venue.venue_name}`}
                    src={venue.map_embed_url}
                    width="100%"
                    height="300"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                    className="w-full rounded-xl border border-slate-200"
                  />
                  <p className="text-xs text-slate-500">
                    If the map does not load, use the Google Maps button above.
                  </p>
                </>
              ) : (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  No embedded map has been added yet.
                </p>
              )}
            </section>
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Venue photos</h3>
                {paths.length > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void refreshImages()}
                    className="text-xs font-semibold text-indigo-600"
                  >
                    Retry photos
                  </button>
                )}
              </div>
              {photoWarning && (
                <p role="alert" className="mt-2 text-sm text-amber-800">
                  {photoWarning}
                </p>
              )}
              {paths.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {paths.map((path, index) => (
                    <div
                      key={path}
                      className="overflow-hidden rounded-xl border border-slate-200"
                    >
                      {images[path] ? (
                        <a
                          href={images[path]}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={images[path]}
                            alt={`${venue.venue_name} photo ${index + 1}`}
                            className="h-36 w-full object-cover"
                            onError={() =>
                              setPhotoWarning(
                                "A photo could not be loaded. Use Retry photos to try again.",
                              )
                            }
                          />
                          <span className="block p-2 text-xs text-indigo-700">
                            Open full photo
                          </span>
                        </a>
                      ) : (
                        <p className="p-4 text-xs text-slate-500">
                          Photo preview unavailable.
                        </p>
                      )}
                      {editable && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setPaths((items) =>
                              items.filter((item) => item !== path),
                            )
                          }
                          className="flex w-full items-center justify-center gap-1 border-t p-2 text-xs font-semibold text-red-600"
                        >
                          <Trash2 size={13} />
                          Remove photo
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No photos added yet.
                </p>
              )}
            </section>
            {editable && (
              <form
                onSubmit={(e) => void save(e)}
                className="space-y-4 border-t border-slate-200 pt-5"
                noValidate
              >
                <h3 className="font-bold">Edit location & photos</h3>
                <p className="text-xs leading-5 text-slate-500">
                  Add or edit these details after creating your venue.
                  Participants can view them through their assigned event.
                </p>
                <fieldset disabled={busy} className="space-y-4">
                  <VenueMap
                    latitude={pin?.latitude}
                    longitude={pin?.longitude}
                    onSelect={setPin}
                    disabled={busy}
                  />
                  {(
                    [
                      ["address", "Address", 500],
                      ["landmark", "Landmark (optional)", 250],
                      ["maps_url", "Google Maps share link (optional)", 4000],
                      [
                        "map_embed_url",
                        "Google Maps embed code or link (optional)",
                        undefined,
                      ],
                    ] as const
                  ).map(([field, label, max]) => (
                    <label
                      key={field}
                      className="block text-sm font-medium"
                      htmlFor={`venue-location-${field}`}
                    >
                      {label}
                      {field === "map_embed_url" ? (
                        <textarea
                          id={`venue-location-${field}`}
                          value={draft[field]}
                          onChange={(e) =>
                            setDraft((v) => ({ ...v, [field]: e.target.value }))
                          }
                          rows={3}
                          className={fieldClass}
                        />
                      ) : (
                        <input
                          id={`venue-location-${field}`}
                          value={draft[field]}
                          maxLength={max}
                          onChange={(e) =>
                            setDraft((v) => ({ ...v, [field]: e.target.value }))
                          }
                          placeholder={
                            field === "maps_url"
                              ? "https://maps.app.goo.gl/…"
                              : undefined
                          }
                          className={fieldClass}
                        />
                      )}
                    </label>
                  ))}
                  <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    Choose a pin on the map above and save your changes.
                    Existing optional Google Maps links are still supported; no
                    Google API key is needed.
                  </p>
                  <label
                    htmlFor="venue-location-photos"
                    className="block text-sm font-medium"
                  >
                    Add photos ({paths.length + files.length}/3)
                    <input
                      ref={inputRef}
                      id="venue-location-photos"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => {
                        const chosen = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        setError("");
                        if (paths.length + files.length + chosen.length > 3) {
                          setError("A venue may have at most 3 photos.");
                          return;
                        }
                        const invalid = chosen.map(photoError).find(Boolean);
                        if (invalid) {
                          setError(invalid);
                          return;
                        }
                        setFiles((old) => [...old, ...chosen]);
                      }}
                      className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm font-normal"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    JPG, PNG, or WebP · Maximum 5 MB each · Up to 3 photos.
                    Photos are saved when you click Save.
                  </p>
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-xs"
                    >
                      <span className="min-w-0 break-all">
                        {file.name} · New photo
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((old) => old.filter((_, i) => i !== index))
                        }
                        className="shrink-0 text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="submit"
                    disabled={!dirty || busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save location & photos
                  </button>
                </fieldset>
              </form>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
