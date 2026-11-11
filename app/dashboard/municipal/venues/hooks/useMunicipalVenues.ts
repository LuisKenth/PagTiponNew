"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
  MunicipalVenue,
  MunicipalVenueProfile,
  VenueFeedback,
  VenueStatus,
} from "../types/municipalVenues";

import type { SelectedVenuePin } from "@/app/components/VenueMap";
import {
  cleanLocation,
  locationError,
  photoError,
  VENUE_PHOTO_BUCKET,
} from "@/lib/venues/location";

export type VenueLocationDraft = {
  address: string;
  landmark: string;
  maps_url: string;
  map_embed_url: string;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
};
const emptyLocation: VenueLocationDraft = {
  address: "",
  landmark: "",
  maps_url: "",
  map_embed_url: "",
  google_place_id: null,
  latitude: null,
  longitude: null,
};
const DEFAULT_PAGE_SIZE = 5;

type VenueDatabaseRow = {
  id: string;
  venue_name: string;
  municipality: string;
  capacity: number | null;
  address: string | null;
  landmark: string | null;
  maps_url: string | null;
  map_embed_url: string | null;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  location_revision: number;
  photo_paths: string[];
  status: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeValue(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeVenueStatus(value: string | null | undefined): VenueStatus {
  return normalizeValue(value) === "inactive" ? "inactive" : "active";
}

function cleanVenueNameValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getDatabaseErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const code = (
    error as {
      code?: unknown;
    }
  ).code;

  return typeof code === "string" ? code : null;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (
      error as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return fallbackMessage;
}

export default function useMunicipalVenues() {
  const [venues, setVenues] = useState<MunicipalVenue[]>([]);

  const [municipality, setMunicipality] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [editingVenue, setEditingVenue] = useState<MunicipalVenue | null>(null);

  const [venueName, setVenueName] = useState("");

  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState<VenueLocationDraft>(emptyLocation);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [formVersion, setFormVersion] = useState(0);
  const [pendingCleanupId, setPendingCleanupId] = useState<string | null>(null);
  const creationId = useRef<string | null>(null);
  function selectGoogleVenue(place: SelectedVenuePin) {
    setLocation((old) => ({
      ...old,
      google_place_id: null,
      latitude: place.latitude,
      longitude: place.longitude,
      maps_url: "",
      map_embed_url: "",
    }));
    setFeedback(null);
  }

  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<VenueFeedback | null>(null);

  /*
   * LOAD MUNICIPAL VENUES
   */
  const fetchVenues = useCallback(async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in first.");
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, municipality")
        .eq("id", user.id)
        .single<MunicipalVenueProfile>();

      if (profileError || !profile) {
        throw new Error(profileError?.message || "Profile not found.");
      }

      if (profile.role !== "municipal_admin") {
        throw new Error("Only municipal admins can manage venues.");
      }

      if (!profile.municipality) {
        throw new Error("Your account has no assigned municipality.");
      }

      setMunicipality(profile.municipality);

      /*
       * status is now included.
       */
      const { data, error } = await supabase
        .from("venues")
        .select(
          `
              id,
              venue_name,
              municipality,
              capacity,
              address,landmark,maps_url,map_embed_url,latitude,longitude,google_place_id,location_revision,photo_paths,
              status,
              created_by,
              created_at,
              updated_at
            `,
        )
        .eq("municipality", profile.municipality)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const venueRows = (data ?? []) as VenueDatabaseRow[];

      /*
       * Normalize DB status defensively.
       *
       * Anything other than explicit
       * "inactive" is treated as active.
       */
      const mappedVenues = venueRows.map<MunicipalVenue>((venue) => ({
        id: venue.id,

        venue_name: venue.venue_name,

        municipality: venue.municipality,

        capacity: venue.capacity,
        address: venue.address,
        landmark: venue.landmark,
        maps_url: venue.maps_url,
        map_embed_url: venue.map_embed_url,
        google_place_id: venue.google_place_id,
        latitude: venue.latitude,
        longitude: venue.longitude,
        location_revision: venue.location_revision,
        photo_paths: venue.photo_paths ?? [],

        status: normalizeVenueStatus(venue.status),

        created_by: venue.created_by,

        created_at: venue.created_at,

        updated_at: venue.updated_at,
      }));

      setVenues(mappedVenues);
      const { data: pending } = await supabase.rpc(
        "pending_venue_photo_cleanup",
      );
      setPendingCleanupId(pending ?? null);
    } catch (error) {
      console.error("Municipal venues error:", error);

      setVenues([]);

      setErrorMessage(
        getErrorMessage(error, "Unable to load municipal venues."),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchVenues();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchVenues]);

  /*
   * SEARCH
   *
   * Status can now also be searched:
   * active / inactive.
   */
  const filteredVenues = useMemo(() => {
    const normalizedSearch = normalizeValue(searchTerm);

    if (!normalizedSearch) {
      return venues;
    }

    return venues.filter((venue) => {
      return [
        venue.venue_name,
        venue.municipality,
        venue.capacity,
        venue.status,
      ].some((value) => normalizeValue(value).includes(normalizedSearch));
    });
  }, [searchTerm, venues]);

  const totalCapacity = useMemo(
    () => venues.reduce((total, venue) => total + (venue.capacity ?? 0), 0),
    [venues],
  );

  const totalPages = Math.max(1, Math.ceil(filteredVenues.length / pageSize));

  const paginatedVenues = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredVenues.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredVenues, pageSize]);

  const firstVisibleItem =
    filteredVenues.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const lastVisibleItem = Math.min(
    currentPage * pageSize,
    filteredVenues.length,
  );

  const hasActiveSearch = searchTerm.trim().length > 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setCurrentPage((previousPage) => Math.min(previousPage, totalPages)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [totalPages]);

  function resetForm() {
    setVenueName("");
    setCapacity("");
    setEditingVenue(null);
    setLocation(emptyLocation);
    setPhotoFiles([]);
    setFormVersion((v) => v + 1);
    creationId.current = null;
  }

  /*
   * START EDITING
   */
  function handleEdit(venue: MunicipalVenue) {
    setEditingVenue(venue);
    setLocation({
      address: venue.address ?? "",
      landmark: venue.landmark ?? "",
      maps_url: venue.maps_url ?? "",
      map_embed_url: venue.map_embed_url ?? "",
      google_place_id: venue.google_place_id ?? null,
      latitude: venue.latitude ?? null,
      longitude: venue.longitude ?? null,
    });
    setPhotoFiles([]);
    setFormVersion((v) => v + 1);

    setVenueName(venue.venue_name);

    setCapacity(venue.capacity ? String(venue.capacity) : "");

    setFeedback(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    resetForm();
    setFeedback(null);
  }

  /*
   * ADD / UPDATE VENUE
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setFeedback(null);

    const cleanVenueName = cleanVenueNameValue(venueName);

    const capacityNumber = Number(capacity);

    /*
     * Read the new Status field
     * directly from VenueForm.
     *
     * This means your existing page.tsx
     * does not need another prop/state.
     */
    const formData = new FormData(event.currentTarget);

    const selectedStatus = normalizeVenueStatus(
      String(formData.get("status") ?? "active"),
    );

    if (!cleanVenueName || Array.from(cleanVenueName).length > 150) {
      setFeedback({
        type: "error",
        message: "Enter a venue name of up to 150 characters.",
      });

      return;
    }

    if (
      !capacity ||
      Number.isNaN(capacityNumber) ||
      !Number.isInteger(capacityNumber) ||
      capacityNumber <= 0
    ) {
      setFeedback({
        type: "error",
        message:
          "Please enter a valid whole-number capacity greater than zero.",
      });

      return;
    }

    if (!municipality || !userId) {
      setFeedback({
        type: "error",
        message: "Municipality or user account information is missing.",
      });

      return;
    }

    /*
     * Existing client-side duplicate
     * venue-name validation.
     */
    const normalizedVenueName = normalizeValue(cleanVenueName);

    const duplicateVenue = venues.find((venue) => {
      const isCurrentEditingVenue = editingVenue?.id === venue.id;

      if (isCurrentEditingVenue) {
        return false;
      }

      return normalizeValue(venue.venue_name) === normalizedVenueName;
    });

    if (duplicateVenue) {
      setFeedback({
        type: "error",
        message: `A venue with this name already exists in ${municipality}.`,
      });

      return;
    }

    const details = cleanLocation(location);
    const invalidLocation = locationError(details);
    if (invalidLocation) {
      setFeedback({ type: "error", message: invalidLocation });
      return;
    }
    if (photoFiles.length + (editingVenue?.photo_paths.length ?? 0) > 3) {
      setFeedback({ type: "error", message: "Choose up to 3 photos." });
      return;
    }
    const invalidPhoto = photoFiles.map(photoError).find(Boolean);
    if (invalidPhoto) {
      setFeedback({ type: "error", message: invalidPhoto });
      return;
    }
    setSaving(true);

    try {
      const targetId =
        editingVenue?.id ?? (creationId.current ??= crypto.randomUUID());
      const payload = {
        venue_name: cleanVenueName,
        capacity: capacityNumber,
        status: selectedStatus,
        ...details,
        google_place_id: location.google_place_id,
        latitude: location.latitude,
        longitude: location.longitude,
      };
      if (editingVenue) {
        const { data, error } = await supabase
          .from("venues")
          .update(payload)
          .eq("id", targetId)
          .eq("municipality", municipality)
          .eq("location_revision", editingVenue.location_revision)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data)
          throw new Error(
            "This venue changed in another session. Refresh venues and reopen Edit before saving again.",
          );
      } else {
        const { error } = await supabase.from("venues").insert({
          id: targetId,
          ...payload,
          municipality,
          created_by: userId,
        });
        if (error) throw error;
      }
      let photoWarning = "";
      if (photoFiles.length) {
        const uploaded: string[] = [];
        try {
          const { data: current, error: readError } = await supabase
            .from("venues")
            .select("photo_paths,location_revision")
            .eq("id", targetId)
            .single();
          if (readError) throw readError;
          const currentPaths = (current.photo_paths ?? []) as string[];
          if (currentPaths.length + photoFiles.length > 3)
            throw new Error("Only 3 photos are allowed per venue.");
          for (const file of photoFiles) {
            const ext =
              file.type === "image/jpeg"
                ? "jpg"
                : file.type === "image/png"
                  ? "png"
                  : "webp";
            const path = `${targetId}/${crypto.randomUUID()}.${ext}`;
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
          const { data: attached, error: attachError } = await supabase
            .from("venues")
            .update({ photo_paths: [...currentPaths, ...uploaded] })
            .eq("id", targetId)
            .eq("location_revision", current.location_revision)
            .select("id")
            .maybeSingle();
          if (attachError) throw attachError;
          if (!attached)
            throw new Error("Venue photos changed in another session.");
        } catch (e) {
          if (uploaded.length) {
            try {
              await supabase.storage.from(VENUE_PHOTO_BUCKET).remove(uploaded);
            } catch {}
          }
          photoWarning = ` Venue saved, but photos could not be confirmed: ${getErrorMessage(e, "Upload unavailable.")} Open View Location to check photos before uploading again.`;
        }
      }
      const wasEditing = Boolean(editingVenue);
      resetForm();
      clearSearch();
      await fetchVenues(true);
      setFeedback({
        type: "success",
        action: wasEditing ? "updated" : "added",
        message: `Venue ${wasEditing ? "updated" : "saved"} successfully.${photoWarning}`,
      });
    } catch (error) {
      console.error("Save venue error:", error);

      const isDuplicateError = getDatabaseErrorCode(error) === "23505";

      setFeedback({
        type: "error",
        message: isDuplicateError
          ? `A venue with this name already exists in ${municipality}.`
          : getErrorMessage(error, "Unable to save the venue."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function requestVenueDeletion(venueId: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Please log in again.");
    const response = await fetch("/api/municipal/venues/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ venueId }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Unable to delete venue.");
    setPendingCleanupId(result.cleanupPending ? venueId : null);
    return result;
  }
  async function retryPhotoCleanup() {
    if (!pendingCleanupId || deletingVenueId) return;
    setDeletingVenueId(pendingCleanupId);
    try {
      const result = await requestVenueDeletion(pendingCleanupId);
      setFeedback({
        type: "success",
        action: "deleted",
        message: result.cleanupPending
          ? "Venue deleted. Photo cleanup is still pending; try again."
          : "Venue and photos deleted successfully.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(error, "Unable to clean up photos."),
      });
    } finally {
      setDeletingVenueId(null);
    }
  }
  async function handleDelete(venue: MunicipalVenue) {
    if (deletingVenueId !== null) return;
    if (
      !window.confirm(
        `Delete "${venue.venue_name}" and its photos? This cannot be undone.`,
      )
    )
      return;
    setDeletingVenueId(venue.id);
    setFeedback(null);
    try {
      const result = await requestVenueDeletion(venue.id);
      if (editingVenue?.id === venue.id) resetForm();
      await fetchVenues(true);
      setFeedback({
        type: "success",
        action: "deleted",
        message: result.cleanupPending
          ? "Venue deleted, but photo cleanup is pending. Click Retry photo cleanup."
          : "Venue and photos deleted successfully.",
      });
    } catch (error) {
      const message = getErrorMessage(error, "Unable to delete venue.");
      setFeedback({ type: "error", message });
      window.alert(`Cannot Delete Venue\n\n${message}`);
    } finally {
      setDeletingVenueId(null);
    }
  }

  function clearSearch() {
    setSearchTerm("");
    setCurrentPage(1);
  }

  function changePageSize(value: number) {
    setPageSize(value);
    setCurrentPage(1);
  }

  function goToPreviousPage() {
    setCurrentPage((previousPage) => Math.max(1, previousPage - 1));
  }

  function goToNextPage() {
    setCurrentPage((previousPage) => Math.min(totalPages, previousPage + 1));
  }

  async function refreshVenues(background = false) {
    if (!background) setFeedback(null);

    await fetchVenues(true);
  }

  return {
    venues,
    filteredVenues,
    paginatedVenues,

    municipality,
    editingVenue,

    venueName,
    capacity,
    location,
    photoFiles,
    formVersion,
    setLocation,
    setPhotoFiles,
    selectGoogleVenue,
    searchTerm,

    totalCapacity,
    totalPages,
    currentPage,
    pageSize,
    firstVisibleItem,
    lastVisibleItem,

    loading,
    refreshing,
    saving,
    deletingVenueId,
    errorMessage,
    feedback,
    hasActiveSearch,

    setVenueName,
    setCapacity,
    setSearchTerm,
    setFeedback,

    handleSubmit,
    handleEdit,
    handleDelete,
    pendingCleanupId,
    retryPhotoCleanup,
    cancelEdit,
    clearSearch,

    changePageSize,
    goToPreviousPage,
    goToNextPage,

    refreshVenues,
  };
}
