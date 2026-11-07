"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import {
  googleMapId,
  googleMapsConfigured,
  loadGoogleMaps,
  type GoogleMaps,
  type GooglePlace,
} from "@/lib/venues/googleMaps";
export type SelectedGoogleVenue = {
  placeId: string;
  name: string;
  address: string;
};
export default function GoogleVenueMap({
  placeId,
  onSelect,
  disabled = false,
}: {
  placeId?: string | null;
  onSelect?: (place: SelectedGoogleVenue) => void;
  disabled?: boolean;
}) {
  const mapNode = useRef<HTMLDivElement>(null),
    searchNode = useRef<HTMLDivElement>(null),
    selectRef = useRef(onSelect);
  const disabledRef = useRef(disabled);
  const [expanded, setExpanded] = useState(!onSelect),
    [attempt, setAttempt] = useState(0),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    selectRef.current = onSelect;
    disabledRef.current = disabled;
  }, [onSelect, disabled]);
  const picking = Boolean(onSelect),
    configured = googleMapsConfigured();
  useEffect(() => {
    if (!expanded || !configured) return;
    let active = true,
      version = 0,
      maps: GoogleMaps | undefined,
      cleanupMap: (() => void) | undefined;
    const authFailure = () => {
      if (active)
        setError(
          "Google Maps is unavailable. Ask the system administrator to check the Maps configuration.",
        );
    };
    window.addEventListener("pagtipon-google-maps-error", authFailure);
    const timer = window.setTimeout(() => {
      void (async () => {
        setError("");
        setStatus("Loading Google Maps…");
        try {
          maps = await loadGoogleMaps();
          if (!active || !mapNode.current) return;
          const map = new maps.Map(mapNode.current, {
            center: { lat: 11.05, lng: 122.05 },
            zoom: 9,
            mapId: googleMapId(),
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            gestureHandling: "cooperative",
          });
          const marker = new maps.marker.AdvancedMarkerElement({ map });
          const show = async (place: GooglePlace, select: boolean) => {
            const request = ++version;
            setStatus("Loading selected place…");
            setError("");
            try {
              await place.fetchFields({
                fields: select
                  ? ["displayName", "formattedAddress", "location"]
                  : ["location"],
              });
              if (!active || request !== version || disabledRef.current) return;
              if (!place.location || !place.id)
                throw new Error(
                  "This place has no map location. Choose another result.",
                );
              marker.position = place.location;
              marker.title = place.displayName ?? "Venue";
              map.setCenter(place.location);
              map.setZoom(17);
              if (select) {
                if (!place.displayName)
                  throw new Error("Enter a venue name for this location.");
                selectRef.current?.({
                  placeId: place.id,
                  name: place.displayName,
                  address: place.formattedAddress ?? "",
                });
              }
              setStatus(
                select
                  ? "Location selected. Review the venue name and address, enter capacity, then Save Venue."
                  : "",
              );
            } catch (e) {
              if (active && request === version) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Unable to load this place. Try another result.",
                );
                setStatus("");
              }
            }
          };
          let autocomplete: HTMLElement | undefined;
          const selectHandler = (event: Event) => {
            if (disabledRef.current) return;
            const prediction = (
              event as Event & {
                placePrediction?: { toPlace: () => GooglePlace };
              }
            ).placePrediction;
            if (prediction) void show(prediction.toPlace(), true);
          };
          const autocompleteError = () => {
            if (active) {
              ++version;
              setStatus("");
              setError(
                "Place search failed. Check your connection and try again.",
              );
            }
          };
          if (picking && searchNode.current) {
            const widget = new maps.places.PlaceAutocompleteElement();
            widget.includedRegionCodes = ["ph"];
            widget.locationBias = {
              center: { lat: 11.05, lng: 122.05 },
              radius: 50000,
            };
            widget.placeholder = "Search venue name, municipality, Antique";
            widget.setAttribute("aria-label", "Search venues on Google Maps");
            autocomplete = widget;
            widget.addEventListener("gmp-select", selectHandler);
            widget.addEventListener("gmp-error", autocompleteError);
            searchNode.current.replaceChildren(widget);
          }
          const listener = picking
            ? map.addListener("click", (event) => {
                if (disabledRef.current) return;
                if (event.placeId) {
                  event.stop?.();
                  void show(
                    new maps!.places.Place({ id: event.placeId }),
                    true,
                  );
                } else {
                  setStatus(
                    "Choose a named place on the map or select a search result.",
                  );
                }
              })
            : undefined;
          cleanupMap = () => {
            listener?.remove();
            autocomplete?.removeEventListener("gmp-select", selectHandler);
            autocomplete?.removeEventListener("gmp-error", autocompleteError);
            autocomplete?.remove();
            marker.map = null;
            maps?.event.clearInstanceListeners(map);
          };
          setStatus("");
          if (placeId) void show(new maps.places.Place({ id: placeId }), false);
        } catch (e) {
          if (active) {
            setError(
              e instanceof Error ? e.message : "Google Maps is unavailable.",
            );
            setStatus("");
          }
        }
      })();
    }, 0);
    const element = mapNode.current;
    return () => {
      active = false;
      ++version;
      window.clearTimeout(timer);
      window.removeEventListener("pagtipon-google-maps-error", authFailure);
      cleanupMap?.();
      element?.replaceChildren();
    };
  }, [expanded, configured, attempt, picking, placeId]);
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      {picking && (
        <div>
          <button
            type="button"
            disabled={disabled || !configured}
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <MapPin size={16} />
            {expanded ? "Hide map" : "Choose on Google Maps"}
          </button>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Search for a venue or click a named place. Selecting it fills the
            name and address; Save Venue adds it to your municipal list.
          </p>
        </div>
      )}
      {!configured && (
        <p className="text-sm text-slate-600">
          Google Maps is not enabled yet. You can enter venue details manually
          or open its Google Maps link.
        </p>
      )}
      {expanded && configured && (
        <>
          <div inert={disabled} className="space-y-3">
            {picking && <div ref={searchNode} className="min-w-0" />}
            <div
              ref={mapNode}
              aria-label={
                picking ? "Choose venue location on Google Maps" : "Venue map"
              }
              className="h-[320px] w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-100"
            />
          </div>
          {status && (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-slate-700"
            >
              {status.startsWith("Loading") && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {status}
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
            >
              {error}
              <button
                type="button"
                disabled={disabled}
                onClick={() => setAttempt((v) => v + 1)}
                className="ml-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
