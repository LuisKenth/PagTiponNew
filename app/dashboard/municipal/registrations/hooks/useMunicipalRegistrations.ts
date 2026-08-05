"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
  MunicipalRegistration,
  RegistrationStatusFilter,
} from "../types/municipalRegistrations";

import {
  buildEventOptions,
  filterRegistrations,
  isCancelledRegistration,
} from "../utils/municipalRegistrationsUtils";

const DEFAULT_PAGE_SIZE = 10;

export default function useMunicipalRegistrations() {
  const [
    registrations,
    setRegistrations,
  ] = useState<
    MunicipalRegistration[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    selectedEventId,
    setSelectedEventId,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<RegistrationStatusFilter>(
      "all",
    );

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(DEFAULT_PAGE_SIZE);

  const fetchRegistrations =
    useCallback(
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
            data,
            error,
          } = await supabase.rpc(
            "get_municipal_registrations",
            {
              p_event_municipality_id:
                null,
            },
          );

          if (error) {
            throw error;
          }

          setRegistrations(
            (data ??
              []) as MunicipalRegistration[],
          );
        } catch (error) {
          console.error(
            "Municipal registrations error:",
            error,
          );

          setRegistrations([]);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load municipal registrations.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void fetchRegistrations();
  }, [fetchRegistrations]);

  /*
   * Support:
   * /dashboard/municipal/registrations
   * ?eventMunicipalityId=...
   */
  useEffect(() => {
    const searchParameters =
      new URLSearchParams(
        window.location.search,
      );

    const targetEventId =
      searchParameters
        .get(
          "eventMunicipalityId",
        )
        ?.trim();

    if (targetEventId) {
      setSelectedEventId(
        targetEventId,
      );
    }
  }, []);

  const eventOptions = useMemo(
    () =>
      buildEventOptions(
        registrations,
      ),
    [registrations],
  );

  const filteredRegistrations =
    useMemo(
      () =>
        filterRegistrations({
          registrations,
          searchTerm,
          selectedEventId,
          statusFilter,
        }),
      [
        registrations,
        searchTerm,
        selectedEventId,
        statusFilter,
      ],
    );

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRegistrations.length /
      pageSize,
    ),
  );

  const paginatedRegistrations =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        pageSize;

      return filteredRegistrations.slice(
        startIndex,
        startIndex + pageSize,
      );
    }, [
      currentPage,
      filteredRegistrations,
      pageSize,
    ]);

  const firstVisibleItem =
    filteredRegistrations.length === 0
      ? 0
      : (currentPage - 1) *
      pageSize +
      1;

  const lastVisibleItem = Math.min(
    currentPage * pageSize,
    filteredRegistrations.length,
  );

  const qrReadyCount =
    filteredRegistrations.filter(
      (registration) =>
        registration.qr_available &&
        !isCancelledRegistration(
          registration,
        ),
    ).length;

  const selectedEvent =
    selectedEventId === "all"
      ? null
      : eventOptions.find(
        (eventOption) =>
          eventOption.event_municipality_id ===
          selectedEventId,
      ) ?? null;

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedEventId !== "all" ||
    statusFilter !== "all";

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedEventId,
    statusFilter,
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

  function clearFilters() {
    setSearchTerm("");
    setSelectedEventId("all");
    setStatusFilter("all");
    setCurrentPage(1);

    window.history.replaceState(
      {},
      "",
      "/dashboard/municipal/registrations",
    );
  }

  function changeSelectedEvent(
    value: string,
  ) {
    setSelectedEventId(value);

    const nextUrl =
      value === "all"
        ? "/dashboard/municipal/registrations"
        : `/dashboard/municipal/registrations?eventMunicipalityId=${encodeURIComponent(
          value,
        )}`;

    window.history.replaceState(
      {},
      "",
      nextUrl,
    );
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

  return {
    registrations,
    filteredRegistrations,
    paginatedRegistrations,
    eventOptions,
    selectedEvent,
    loading,
    refreshing,
    errorMessage,
    searchTerm,
    selectedEventId,
    statusFilter,
    currentPage,
    pageSize,
    totalPages,
    firstVisibleItem,
    lastVisibleItem,
    qrReadyCount,
    hasActiveFilters,
    setSearchTerm,
    changeSelectedEvent,
    setStatusFilter,
    clearFilters,
    changePageSize,
    goToPreviousPage,
    goToNextPage,
    refreshRegistrations: () =>
      fetchRegistrations(true),
  };
}
