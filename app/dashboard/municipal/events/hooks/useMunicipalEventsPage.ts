"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ReceivedEvent } from "../../types/municipalDashboard";

import type {
  RegistrationFilter,
  SortOption,
  StatusFilter,
} from "../types/municipalEvents";

import {
  filterAndSortEvents,
} from "../utils/municipalEventsUtils";

const DEFAULT_PAGE_SIZE = 5;

export default function useMunicipalEventsPage(
  receivedEvents: ReceivedEvent[],
) {
  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>("all");

  const [
    registrationFilter,
    setRegistrationFilter,
  ] =
    useState<RegistrationFilter>("all");

  const [sortOption, setSortOption] =
    useState<SortOption>(
      "newest_received",
    );

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(DEFAULT_PAGE_SIZE);

  const filteredEvents = useMemo(
    () =>
      filterAndSortEvents({
        events: receivedEvents,
        searchTerm,
        statusFilter,
        registrationFilter,
        sortOption,
      }),
    [
      receivedEvents,
      registrationFilter,
      searchTerm,
      sortOption,
      statusFilter,
    ],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredEvents.length / pageSize,
    ),
  );

  const paginatedEvents =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) * pageSize;

      return filteredEvents.slice(
        startIndex,
        startIndex + pageSize,
      );
    }, [
      currentPage,
      filteredEvents,
      pageSize,
    ]);

  const firstVisibleItem =
    filteredEvents.length === 0
      ? 0
      : (currentPage - 1) *
          pageSize +
        1;

  const lastVisibleItem = Math.min(
    currentPage * pageSize,
    filteredEvents.length,
  );

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    statusFilter !== "all" ||
    registrationFilter !== "all";

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    registrationFilter,
    sortOption,
    pageSize,
  ]);

  useEffect(() => {
    setCurrentPage((previousPage) =>
      Math.min(previousPage, totalPages),
    );
  }, [totalPages]);

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setRegistrationFilter("all");
    setCurrentPage(1);
  }

  function changePageSize(
    newPageSize: number,
  ) {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }

  function goToPreviousPage() {
    setCurrentPage((previousPage) =>
      Math.max(1, previousPage - 1),
    );
  }

  function goToNextPage() {
    setCurrentPage((previousPage) =>
      Math.min(
        totalPages,
        previousPage + 1,
      ),
    );
  }

  return {
    searchTerm,
    statusFilter,
    registrationFilter,
    sortOption,
    currentPage,
    pageSize,
    filteredEvents,
    paginatedEvents,
    totalPages,
    firstVisibleItem,
    lastVisibleItem,
    hasActiveFilters,
    setSearchTerm,
    setStatusFilter,
    setRegistrationFilter,
    setSortOption,
    clearFilters,
    changePageSize,
    goToPreviousPage,
    goToNextPage,
  };
}
