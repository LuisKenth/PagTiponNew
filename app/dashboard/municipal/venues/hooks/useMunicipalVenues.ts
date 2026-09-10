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
  VenueStatus,
} from "../types/municipalVenues";

const DEFAULT_PAGE_SIZE = 5;

type VenueDatabaseRow = {
  id: string;
  venue_name: string;
  municipality: string;
  capacity: number | null;
  status: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeValue(
  value:
    | string
    | number
    | null
    | undefined,
) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeVenueStatus(
  value:
    | string
    | null
    | undefined,
): VenueStatus {
  return normalizeValue(value) ===
    "inactive"
    ? "inactive"
    : "active";
}

function cleanVenueNameValue(
  value: string,
) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function getDatabaseErrorCode(
  error: unknown,
) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return null;
  }

  const code = (
    error as {
      code?: unknown;
    }
  ).code;

  return typeof code === "string"
    ? code
    : null;
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
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
    useState<VenueFeedback | null>(
      null,
    );

  /*
   * LOAD MUNICIPAL VENUES
   */
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
          .select(
            "role, municipality",
          )
          .eq("id", user.id)
          .single<MunicipalVenueProfile>();

        if (
          profileError ||
          !profile
        ) {
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

        /*
         * status is now included.
         */
        const {
          data,
          error,
        } = await supabase
          .from("venues")
          .select(
            `
              id,
              venue_name,
              municipality,
              capacity,
              status,
              created_by,
              created_at,
              updated_at
            `,
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

        const venueRows =
          (data ??
            []) as VenueDatabaseRow[];

        /*
         * Normalize DB status defensively.
         *
         * Anything other than explicit
         * "inactive" is treated as active.
         */
        const mappedVenues =
          venueRows.map<MunicipalVenue>(
            (venue) => ({
              id: venue.id,

              venue_name:
                venue.venue_name,

              municipality:
                venue.municipality,

              capacity:
                venue.capacity,

              status:
                normalizeVenueStatus(
                  venue.status,
                ),

              created_by:
                venue.created_by,

              created_at:
                venue.created_at,

              updated_at:
                venue.updated_at,
            }),
          );

        setVenues(mappedVenues);
      } catch (error) {
        console.error(
          "Municipal venues error:",
          error,
        );

        setVenues([]);

        setErrorMessage(
          getErrorMessage(
            error,
            "Unable to load municipal venues.",
          ),
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

  /*
   * SEARCH
   *
   * Status can now also be searched:
   * active / inactive.
   */
  const filteredVenues = useMemo(
    () => {
      const normalizedSearch =
        normalizeValue(searchTerm);

      if (!normalizedSearch) {
        return venues;
      }

      return venues.filter(
        (venue) => {
          return [
            venue.venue_name,
            venue.municipality,
            venue.capacity,
            venue.status,
          ].some((value) =>
            normalizeValue(
              value,
            ).includes(
              normalizedSearch,
            ),
          );
        },
      );
    },
    [
      searchTerm,
      venues,
    ],
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
  }, [
    searchTerm,
    pageSize,
  ]);

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

  /*
   * START EDITING
   */
  function handleEdit(
    venue: MunicipalVenue,
  ) {
    setEditingVenue(venue);

    setVenueName(
      venue.venue_name,
    );

    setCapacity(
      venue.capacity
        ? String(
          venue.capacity,
        )
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

  /*
   * ADD / UPDATE VENUE
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setFeedback(null);

    const cleanVenueName =
      cleanVenueNameValue(
        venueName,
      );

    const capacityNumber =
      Number(capacity);

    /*
     * Read the new Status field
     * directly from VenueForm.
     *
     * This means your existing page.tsx
     * does not need another prop/state.
     */
    const formData =
      new FormData(
        event.currentTarget,
      );

    const selectedStatus =
      normalizeVenueStatus(
        String(
          formData.get(
            "status",
          ) ?? "active",
        ),
      );

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
      Number.isNaN(
        capacityNumber,
      ) ||
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

    if (
      !municipality ||
      !userId
    ) {
      setFeedback({
        type: "error",
        message:
          "Municipality or user account information is missing.",
      });

      return;
    }

    /*
     * Existing client-side duplicate
     * venue-name validation.
     */
    const normalizedVenueName =
      normalizeValue(
        cleanVenueName,
      );

    const duplicateVenue =
      venues.find((venue) => {
        const isCurrentEditingVenue =
          editingVenue?.id ===
          venue.id;

        if (
          isCurrentEditingVenue
        ) {
          return false;
        }

        return (
          normalizeValue(
            venue.venue_name,
          ) ===
          normalizedVenueName
        );
      });

    if (duplicateVenue) {
      setFeedback({
        type: "error",
        message:
          `A venue with this name already exists in ${municipality}.`,
      });

      return;
    }

    setSaving(true);

    try {
      if (editingVenue) {
        /*
         * UPDATE VENUE
         *
         * Status is saved together with
         * venue name and capacity.
         */
        const { error } =
          await supabase
            .from("venues")
            .update({
              venue_name:
                cleanVenueName,

              capacity:
                capacityNumber,

              status:
                selectedStatus,

              updated_at:
                new Date()
                  .toISOString(),
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

        const statusText =
          selectedStatus ===
            "active"
            ? "active"
            : "inactive";

        resetForm();

        await fetchVenues(
          true,
        );

        setFeedback({
          type: "success",
          action: "updated",
          message:
            `Venue updated successfully and is now ${statusText}.`,
        });
      } else {
        /*
         * ADD VENUE
         *
         * New venue normally defaults
         * to Active, but we also save
         * the selected form value.
         */
        const { error } =
          await supabase
            .from("venues")
            .insert({
              venue_name:
                cleanVenueName,

              municipality,

              capacity:
                capacityNumber,

              status:
                selectedStatus,

              created_by:
                userId,
            });

        if (error) {
          throw error;
        }

        resetForm();

        await fetchVenues(
          true,
        );

        setFeedback({
          type: "success",
          action: "added",
          message:
            "Venue added successfully.",
        });
      }
    } catch (error) {
      console.error(
        "Save venue error:",
        error,
      );

      const isDuplicateError =
        getDatabaseErrorCode(
          error,
        ) === "23505";

      setFeedback({
        type: "error",
        message:
          isDuplicateError
            ? `A venue with this name already exists in ${municipality}.`
            : getErrorMessage(
              error,
              "Unable to save the venue.",
            ),
      });
    } finally {
      setSaving(false);
    }
  }

  /*
   * DELETE
   *
   * Safe-delete protection will be
   * added/tested separately afterward.
   */
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
          .eq(
            "id",
            venue.id,
          )
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

      await fetchVenues(
        true,
      );

      setFeedback({
        type: "success",
        action: "deleted",
        message:
          "Venue deleted successfully.",
      });
    } catch (error) {
      const errorCode =
        getDatabaseErrorCode(error);

      const errorMessage =
        getErrorMessage(
          error,
          "Unable to delete the venue.",
        );

      const normalizedMessage =
        normalizeValue(
          errorMessage,
        );

      if (
        errorCode === "P0001" &&
        normalizedMessage.includes(
          "venue deletion blocked",
        )
      ) {
        const friendlyMessage =
          `"${venue.venue_name}" cannot be deleted because it is currently assigned to an upcoming or ongoing event. Assign another venue to that event or wait until the event has ended.`;

        console.warn(
          "Venue deletion prevented:",
          errorMessage,
        );

        setFeedback({
          type: "error",
          message: friendlyMessage,
        });

        window.alert(
          `Cannot Delete Venue\n\n${friendlyMessage}`,
        );

        return;
      }

      console.error(
        "Delete venue error:",
        error,
      );

      setFeedback({
        type: "error",
        message:
          getErrorMessage(
            error,
            "Unable to delete the venue.",
          ),
      });
    } finally {
      setDeletingVenueId(
        null,
      );
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

    await fetchVenues(
      true,
    );
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