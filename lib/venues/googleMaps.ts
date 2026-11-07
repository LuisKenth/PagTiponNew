"use client";
export type GooglePlace = {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  location?: { lat: () => number; lng: () => number };
  fetchFields: (input: { fields: string[] }) => Promise<unknown>;
};
type Listener = { remove: () => void };
export type GoogleMap = {
  setCenter: (point: unknown) => void;
  setZoom: (zoom: number) => void;
  addListener: (
    event: string,
    handler: (event: { placeId?: string; stop?: () => void }) => void,
  ) => Listener;
};
type Marker = { map: GoogleMap | null; position?: unknown; title?: string };
export type GoogleMaps = {
  importLibrary: (name: string) => Promise<unknown>;
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => GoogleMap;
  marker: {
    AdvancedMarkerElement: new (options: Record<string, unknown>) => Marker;
  };
  places: {
    Place: new (options: { id: string }) => GooglePlace;
    PlaceAutocompleteElement: new (
      options?: Record<string, unknown>,
    ) => HTMLElement & {
      includedRegionCodes?: string[];
      locationBias?: unknown;
      placeholder?: string;
    };
  };
  event: { clearInstanceListeners: (instance: unknown) => void };
};
declare global {
  interface Window {
    google?: { maps: GoogleMaps };
    pagtiponGoogleReady?: () => void;
    gm_authFailure?: () => void;
  }
}
let pending: Promise<GoogleMaps> | undefined,
  authFailed = false;
export function googleMapsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
}
export function googleMapId() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
}
export function loadGoogleMaps(): Promise<GoogleMaps> {
  if (!googleMapsConfigured())
    return Promise.reject(
      new Error(
        "Map search is not enabled. You can enter venue details manually.",
      ),
    );
  if (authFailed)
    return Promise.reject(
      new Error(
        "Google Maps is unavailable. Ask the system administrator to check the Maps configuration.",
      ),
    );
  if (window.google?.maps?.places && window.google.maps.marker)
    return Promise.resolve(window.google.maps);
  if (pending) return pending;
  pending = new Promise<GoogleMaps>((resolve, reject) => {
    const script = document.createElement("script");
    let finished = false;
    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      script.remove();
      pending = undefined;
      reject(new Error(message));
    };
    const timer = window.setTimeout(
      () =>
        fail(
          "Google Maps took too long to load. Check your connection and try again.",
        ),
      20000,
    );
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      authFailed = true;
      previousAuthFailure?.();
      window.dispatchEvent(new Event("pagtipon-google-maps-error"));
      fail(
        "Google Maps is unavailable. Ask the system administrator to check the Maps configuration.",
      );
    };
    window.pagtiponGoogleReady = () => {
      void (async () => {
        try {
          const maps = window.google?.maps;
          if (!maps) throw new Error();
          await Promise.all(
            ["maps", "places", "marker"].map((name) =>
              maps.importLibrary(name),
            ),
          );
          if (finished) return;
          finished = true;
          window.clearTimeout(timer);
          resolve(maps);
        } catch {
          fail(
            "Google Maps could not load. Check your connection and try again.",
          );
        }
      })();
    };
    const url = new URL("https://maps.googleapis.com/maps/api/js");
    url.search = new URLSearchParams({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      v: "weekly",
      loading: "async",
      libraries: "maps,places,marker",
      callback: "pagtiponGoogleReady",
      language: "en",
      region: "PH",
    }).toString();
    script.src = url.href;
    script.async = true;
    script.onerror = () =>
      fail("Google Maps could not load. Check your connection and try again.");
    document.head.appendChild(script);
  });
  return pending;
}
export function googlePlaceLink(placeId: string, name: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name.slice(0, 150))}&query_place_id=${encodeURIComponent(placeId)}`;
}
