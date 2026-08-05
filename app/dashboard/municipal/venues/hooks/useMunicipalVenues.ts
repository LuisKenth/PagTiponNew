"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
  MunicipalVenue,
  MunicipalVenueProfile,
  VenueFeedback,
} from "../types/municipalVenues";

const DEFAULT_PAGE_SIZE = 5;

function normalizeValue(
  value: string | number | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export default function useMunicipalVenues() {
  const [venues, setVenues] =
    useState<MunicipalVenue[]>([]);

  const [municipality, setMunicipality] =
    useState<string | null>(null);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [
    editingVenue,
    setEditingVenue,
  ] = useState<MunicipalVenue | null>(
    null,
  );

  const [venueName, setVenueName] =
    useState("");

  const [capacity, setCapacity] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(DEFAULT_PAGE_SIZE);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    deletingVenueId,
    setDeletingVenueId,
  ] = useState<string | null>(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [feedback, setFeedback] =
    useState<VenueFeedback | null>(null);

  const fetchVenues = useCallback(
    async (
      showRefreshingState = false,
    ) => {
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
        } =
          await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(
            "You must be logged in first.",
          );
        }

        setUserId(user.id);

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role, municipality")
          .eq("id", user.id)
          .single<MunicipalVenueProfile>();

        if (profileError || !profile) {
          throw new Error(
            profileError?.message ||
              "Profile not found.",
          );
        }

        if (
          profile.role !==
          "municipal_admin"
        ) {
          throw new Error(
            "Only municipal admins can manage venues.",
          );
        }

        if (!profile.municipality) {
          throw new Error(
            "Your account has no assigned municipality.",
          );
        }

        setMunicipality(
          profile.municipality,
        );

        const {
          data,
          error,
        } = await supabase
          .from("venues")
          .select(
            "id, venue_name, municipality, capacity, created_by, created_at, updated_at",
          )
          .eq(
            "municipality",
            profile.municipality,
          )
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        setVenues(
          (data ??
            []) as MunicipalVenue[],
        );
      } catch (error) {
        console.error(
          "Municipal venues error:",
          error,
        );

        setVenues([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load municipal venues.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchVenues();
  }, [fetchVenues]);

  const filteredVenues = useMemo(
    () => {
      const normalizedSearch =
        normalizeValue(searchTerm);

      if (!normalizedSearch) {
        return venues;
      }

      return venues.filter((venue) => {
        return [
          venue.venue_name,
          venue.municipality,
          venue.capacity,
        ].some((value) =>
          normalizeValue(value).includes(
            normalizedSearch,
          ),
        );
      });
    },
    [searchTerm, venues],
  );

  const totalCapacity = useMemo(
    () =>
      venues.reduce(
        (total, venue) =>
          total +
          (venue.capacity ?? 0),
        0,
      ),
    [venues],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredVenues.length /
        pageSize,
    ),
  );

  const paginatedVenues =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        pageSize;

      return filteredVenues.slice(
        startIndex,
        startIndex + pageSize,
      );
    }, [
      currentPage,
      filteredVenues,
      pageSize,
    ]);

  const firstVisibleItem =
    filteredVenues.length === 0
      ? 0
      : (currentPage - 1) *
          pageSize +
        1;

  const lastVisibleItem = Math.min(
    currentPage * pageSize,
    filteredVenues.length,
  );

  const hasActiveSearch =
    searchTerm.trim().length > 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    setCurrentPage(
      (previousPage) =>
        Math.min(
          previousPage,
          totalPages,
        ),
    );
  }, [totalPages]);

  function resetForm() {
    setVenueName("");
    setCapacity("");
    setEditingVenue(null);
  }

  function handleEdit(
    venue: MunicipalVenue,
  ) {
    setEditingVenue(venue);

    setVenueName(
      venue.venue_name,
    );

    setCapacity(
      venue.capacity
        ? String(venue.capacity)
        : "",
    );

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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setFeedback(null);

    const cleanVenueName =
      venueName.trim();

    const capacityNumber =
      Number(capacity);

    if (!cleanVenueName) {
      setFeedback({
        type: "error",
        message:
          "Please enter a venue name.",
      });

      return;
    }

    if (
      !capacity ||
      Number.isNaN(capacityNumber) ||
      !Number.isInteger(
        capacityNumber,
      ) ||
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
        message:
          "Municipality or user account information is missing.",
      });

      return;
    }

    setSaving(true);

    try {
      if (editingVenue) {
        const { error } =
          await supabase
            .from("venues")
            .update({
              venue_name:
                cleanVenueName,
              capacity:
                capacityNumber,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              editingVenue.id,
            )
            .eq(
              "municipality",
              municipality,
            );

        if (error) {
          throw error;
        }

        resetForm();

        await fetchVenues(true);

        setFeedback({
          type: "success",
          message:
            "Venue updated successfully.",
        });
      } else {
        const { error } =
          await supabase
            .from("venues")
            .insert({
              venue_name:
                cleanVenueName,
              municipality,
              capacity:
                capacityNumber,
              created_by: userId,
            });

        if (error) {
          throw error;
        }

        resetForm();

        await fetchVenues(true);

        setFeedback({
          type: "success",
          message:
            "Venue added successfully.",
        });
      }
    } catch (error) {
      console.error(
        "Save venue error:",
        error,
      );

      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save the venue.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    venue: MunicipalVenue,
  ) {
    if (
      deletingVenueId !== null
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${venue.venue_name}" from the venue list?`,
      );

    if (!confirmed) {
      return;
    }

    if (!municipality) {
      setFeedback({
        type: "error",
        message:
          "Municipality information is missing.",
      });

      return;
    }

    setDeletingVenueId(
      venue.id,
    );

    setFeedback(null);

    try {
      const { error } =
        await supabase
          .from("venues")
          .delete()
          .eq("id", venue.id)
          .eq(
            "municipality",
            municipality,
          );

      if (error) {
        throw error;
      }

      if (
        editingVenue?.id ===
        venue.id
      ) {
        resetForm();
      }

      await fetchVenues(true);

      setFeedback({
        type: "success",
        message:
          "Venue deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete venue error:",
        error,
      );

      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete the venue.",
      });
    } finally {
      setDeletingVenueId(null);
    }
  }

  function clearSearch() {
    setSearchTerm("");
    setCurrentPage(1);
  }

  function changePageSize(
    value: number,
  ) {
    setPageSize(value);
    setCurrentPage(1);
  }

  function goToPreviousPage() {
    setCurrentPage(
      (previousPage) =>
        Math.max(
          1,
          previousPage - 1,
        ),
    );
  }

  function goToNextPage() {
    setCurrentPage(
      (previousPage) =>
        Math.min(
          totalPages,
          previousPage + 1,
        ),
    );
  }

  async function refreshVenues() {
    setFeedback(null);
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
    cancelEdit,
    clearSearch,

    changePageSize,
    goToPreviousPage,
    goToNextPage,

    refreshVenues,
  };
}
