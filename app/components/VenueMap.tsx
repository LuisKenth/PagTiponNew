"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

export type SelectedVenuePin = { latitude: number; longitude: number };
export default function VenueMap({
  latitude,
  longitude,
  onSelect,
  disabled = false,
}: {
  latitude?: number | null;
  longitude?: number | null;
  onSelect?: (pin: SelectedVenuePin) => void;
  disabled?: boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const selectedRef = useRef(onSelect),
    disabledRef = useRef(disabled);
  const [expanded, setExpanded] = useState(!onSelect);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    selectedRef.current = onSelect;
    disabledRef.current = disabled;
  }, [onSelect, disabled]);
  useEffect(() => {
    if (!expanded) return;
    let active = true;
    let map: LeafletMap | undefined;
    const timer = window.setTimeout(() => {
      setError("");
      void import("leaflet")
        .then((L) => {
          if (!active || !node.current) return;
          const hasPin = latitude != null && longitude != null;
          const center: [number, number] = hasPin
            ? [latitude, longitude]
            : [11.05, 122.05];
          map = L.map(node.current, { scrollWheelZoom: false }).setView(
            center,
            hasPin ? 17 : 9,
          );
          mapRef.current = map;
          const layer = L.tileLayer(
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 19,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          ).addTo(map);
          layer.on("tileerror", () => {
            if (active)
              setError(
                "Map tiles could not load. Check your connection and try again.",
              );
          });
          const icon = L.divIcon({
            className: "",
            html: '<span style="display:block;width:24px;height:24px;border:3px solid white;border-radius:50%;background:#4f46e5;box-shadow:0 1px 6px #333"></span>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          let marker = hasPin
            ? L.marker(center, { icon, keyboard: false }).addTo(map)
            : null;
          if (selectedRef.current)
            map.on("click", (event: L.LeafletMouseEvent) => {
              if (disabledRef.current) return;
              const lat = Number(event.latlng.lat.toFixed(6));
              const lng = Number(event.latlng.wrap().lng.toFixed(6));
              if (marker) marker.setLatLng([lat, lng]);
              else
                marker = L.marker([lat, lng], { icon, keyboard: false }).addTo(
                  map!,
                );
              selectedRef.current?.({ latitude: lat, longitude: lng });
            });
          map.invalidateSize();
        })
        .catch(() => {
          if (active)
            setError(
              "Unable to load the map. Check your connection and try again.",
            );
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
      map?.remove();
      mapRef.current = null;
    };
    // Coordinates are the initial view; clicks update the marker without recreating the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, attempt]);
  useEffect(() => {
    if (!expanded || !node.current) return;
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(node.current);
    return () => observer.disconnect();
  }, [expanded]);
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {onSelect && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setExpanded((v) => !v)}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {expanded ? "Hide map" : "Choose location on map"}
          </button>
          <p className="text-sm text-slate-600">
            Zoom in, then click the venue location to place or move the pin.
            Enter the venue name, address and capacity, then Save Venue.
          </p>
        </>
      )}
      {expanded && (
        <div inert={disabled} className="relative z-0">
          <div
            ref={node}
            style={{ height: "320px", width: "100%" }}
            aria-label={
              onSelect ? "Choose venue location" : "Venue location map"
            }
            className="h-[320px] w-full rounded-xl border border-slate-300"
          />
        </div>
      )}
      {latitude != null && longitude != null && (
        <p role="status" className="text-sm text-slate-600">
          Selected pin: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-amber-800">
          {error}{" "}
          <button
            type="button"
            disabled={disabled}
            className="font-semibold underline"
            onClick={() => setAttempt((v) => v + 1)}
          >
            Try again
          </button>
        </p>
      )}
    </section>
  );
}
