"use client";

import { useEffect, useState, useMemo } from "react";

import EventPreparationDialog from "../components/EventPreparationDialog";

import useMunicipalDashboard from "../hooks/useMunicipalDashboard";

import MunicipalEventsFilters from "./components/MunicipalEventsFilters";
import MunicipalEventsHeader from "./components/MunicipalEventsHeader";
import MunicipalEventsList from "./components/MunicipalEventsList";
import MunicipalEventsPagination from "./components/MunicipalEventsPagination";

import useMunicipalEventsPage from "./hooks/useMunicipalEventsPage";

import {
  isCancelledEvent,
  isRegistrationOpen,
} from "./utils/municipalEventsUtils";

import type { ReceivedEvent } from "../types/municipalDashboard";

export default function MunicipalEventsPage() {
  const [preparationId, setPreparationId] = useState<string | null>(null);

  const {
    municipality,
    receivedEvents: allEvents,
    loading,
    venues,
    refreshEvents,
  } = useMunicipalDashboard();

  const receivedEvents = useMemo(
    () => allEvents.filter((item) => item.event?.event_origin === "provincial"),
    [allEvents],
  );

  const {
    searchTerm,
    statusFilter,
    eventStatusFilter,
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
    setEventStatusFilter,
    setRegistrationFilter,
    setSortOption,

    clearFilters,
    changePageSize,
    goToPreviousPage,
    goToNextPage,
  } = useMunicipalEventsPage(receivedEvents);

  const [refreshing, setRefreshing] = useState(false);

  /*
   * Periodically refresh received events so
   * database-side lifecycle updates from the
   * cron job can appear without a full page reload.
   */
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshEvents();
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshEvents]);

  /*
   * Registration summary count.
   *
   * The helper will be audited separately so
   * ongoing/completed/cancelled events are not
   * incorrectly counted as registration open.
   */
  const registrationOpenCount =
    receivedEvents.filter(isRegistrationOpen).length;

  const cancelledCount = receivedEvents.filter(isCancelledEvent).length;

  function openPreparationPage(item: ReceivedEvent) {
    if (item.id) setPreparationId(String(item.id));
  }

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await refreshEvents();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      {preparationId && (
        <EventPreparationDialog
          assignmentId={preparationId}
          onClose={() => setPreparationId(null)}
          onUpdated={() => void refreshEvents()}
        />
      )}
      <MunicipalEventsHeader
        municipality={municipality}
        totalReceived={receivedEvents.length}
        filteredCount={filteredEvents.length}
        registrationOpenCount={registrationOpenCount}
        cancelledCount={cancelledCount}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => void handleRefresh()}
      />

      <MunicipalEventsFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        eventStatusFilter={eventStatusFilter}
        registrationFilter={registrationFilter}
        sortOption={sortOption}
        resultCount={filteredEvents.length}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
        onEventStatusFilterChange={setEventStatusFilter}
        onRegistrationFilterChange={setRegistrationFilter}
        onSortChange={setSortOption}
        onClearFilters={clearFilters}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <MunicipalEventsList
          events={paginatedEvents}
          venues={venues}
          loading={loading}
          firstVisibleItem={firstVisibleItem}
          lastVisibleItem={lastVisibleItem}
          totalFilteredEvents={filteredEvents.length}
          hasActiveFilters={hasActiveFilters}
          onPrepare={openPreparationPage}
          onClearFilters={clearFilters}
        />

        {!loading && (
          <MunicipalEventsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredEvents.length}
            firstVisibleItem={firstVisibleItem}
            lastVisibleItem={lastVisibleItem}
            onPageSizeChange={changePageSize}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        )}
      </section>
    </div>
  );
}
