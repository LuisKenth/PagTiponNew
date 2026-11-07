export const VENUE_PHOTO_BUCKET = "venue-photos";
export const VENUE_PHOTO_LIMIT = 3;
export const VENUE_PHOTO_BYTES = 5 * 1024 * 1024;
export type VenueLocation = {
  id: string;
  venue_name: string;
  municipality: string;
  capacity: number | null;
  address: string | null;
  landmark: string | null;
  maps_url: string | null;
  map_embed_url: string | null;
  photo_paths: string[];
  latitude: number | null;
  longitude: number | null;
  location_revision: number;
  google_place_id?: string | null;
};
export type VenueLocationInput = {
  address: string;
  landmark: string;
  maps_url: string;
  map_embed_url: string;
};
function googleUrl(value: string) {
  if (value.length > 4000 || /[\s\x00-\x1f\x7f]/u.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port
      ? url
      : null;
  } catch {
    return null;
  }
}
export function validMapsUrl(value: string) {
  if (!value) return true;
  const u = googleUrl(value);
  if (!u) return false;
  return (
    ((u.hostname === "www.google.com" || u.hostname === "google.com") &&
      /^\/maps(?:\/|$)/u.test(u.pathname)) ||
    u.hostname === "maps.google.com" ||
    (u.hostname === "maps.app.goo.gl" && u.pathname.length > 1) ||
    (u.hostname === "goo.gl" &&
      u.pathname.startsWith("/maps/") &&
      u.pathname.length > 6)
  );
}
export function extractMapEmbed(value: string) {
  const raw = value.trim();
  const src = raw.startsWith("<")
    ? raw.match(/\bsrc\s*=\s*["']([^"']+)["']/iu)?.[1]
    : raw;
  return (src ?? raw).replaceAll("&amp;", "&");
}
export function validMapEmbed(value: string) {
  if (!value) return true;
  const u = googleUrl(value);
  return Boolean(
    u &&
    u.hostname === "www.google.com" &&
    u.pathname === "/maps/embed" &&
    u.searchParams.get("pb"),
  );
}
export function cleanLocation(value: VenueLocationInput): VenueLocationInput {
  return {
    address: value.address.trim(),
    landmark: value.landmark.trim(),
    maps_url: googleUrl(value.maps_url.trim())?.href ?? value.maps_url.trim(),
    map_embed_url:
      googleUrl(extractMapEmbed(value.map_embed_url))?.href ??
      extractMapEmbed(value.map_embed_url),
  };
}
export function locationError(value: VenueLocationInput) {
  const v = cleanLocation(value);
  if (Array.from(v.address).length > 500)
    return "Address must not exceed 500 characters.";
  if (Array.from(v.landmark).length > 250)
    return "Landmark must not exceed 250 characters.";
  if (!validMapsUrl(v.maps_url))
    return "Use a valid HTTPS Google Maps share link.";
  if (!validMapEmbed(v.map_embed_url))
    return "Copy the embed code from Google Maps: Share → Embed a map → Copy HTML.";
  return null;
}
export function venueMapLink(venue: VenueLocation) {
  if (venue.latitude != null && venue.longitude != null)
    return `https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}#map=17/${venue.latitude}/${venue.longitude}`;
  return venue.maps_url && validMapsUrl(venue.maps_url)
    ? venue.maps_url
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue.venue_name, venue.address, venue.municipality, "Antique, Philippines"].filter(Boolean).join(", "))}`;
}
export function photoError(file: Pick<File, "type" | "size">) {
  return !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ? "Choose JPG, PNG, or WebP images."
    : file.size <= 0 || file.size > VENUE_PHOTO_BYTES
      ? "Each photo must be between 1 byte and 5 MB."
      : null;
}
