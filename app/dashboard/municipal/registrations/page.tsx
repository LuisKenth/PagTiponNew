"use client";

import EventRegistrationSummary from "./components/EventRegistrationSummary";
import RegistrationFilters from "./components/RegistrationFilters";
import RegistrationsHeader from "./components/RegistrationsHeader";
import RegistrationsPagination from "./components/RegistrationsPagination";
import RegistrationsTable from "./components/RegistrationsTable";

import useMunicipalRegistrations from "./hooks/useMunicipalRegistrations";

import {
  exportRegistrationsCsv,
} from "./utils/exportRegistrationsCsv";

export default function MunicipalRegistrationsPage() {
  const {
    registrations,
    filteredRegistrations,
    groupedRegistrations,
    paginatedEventGroups,
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
    refreshRegistrations,
  } = useMunicipalRegistrations();

  function handleExport() {
    exportRegistrationsCsv({
      /*
       * Export all filtered participant
       * registrations, not only the event
       * groups visible on the current page.
       */
      registrations:
        filteredRegistrations,

      eventTitle:
        selectedEvent?.event_title ??
        null,
    });
  }

  return (
    <div className="space-y-6">
      <RegistrationsHeader
        totalRegistrations={
          registrations.length
        }
        filteredRegistrations={
          filteredRegistrations.length
        }
        qrReadyCount={qrReadyCount}
        eventCount={eventOptions.length}
        loading={loading}
        refreshing={refreshing}
        exportDisabled={
          loading ||
          filteredRegistrations.length ===
            0
        }
        onExport={handleExport}
        onRefresh={() =>
          void refreshRegistrations()
        }
      />

      <RegistrationFilters
        searchTerm={searchTerm}
        selectedEventId={
          selectedEventId
        }
        statusFilter={statusFilter}
        eventOptions={eventOptions}
        resultCount={
          filteredRegistrations.length
        }
        hasActiveFilters={
          hasActiveFilters
        }
        onSearchChange={
          setSearchTerm
        }
        onEventChange={
          changeSelectedEvent
        }
        onStatusChange={
          setStatusFilter
        }
        onClearFilters={clearFilters}
      />

      <EventRegistrationSummary
        selectedEvent={selectedEvent}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2 className="text-lg font-bold text-slate-900">
            Registration Records by Event
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Participant registrations are
            grouped according to their assigned
            provincial event. Select an event to
            view its participant records.
          </p>
        </div>

        <RegistrationsTable
          eventGroups={
            paginatedEventGroups
          }
          loading={loading}
          errorMessage={errorMessage}
        />

        {!loading &&
          !errorMessage &&
          groupedRegistrations.length >
            0 && (
            <RegistrationsPagination
              currentPage={
                currentPage
              }
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={
                groupedRegistrations.length
              }
              firstVisibleItem={
                firstVisibleItem
              }
              lastVisibleItem={
                lastVisibleItem
              }
              onPageSizeChange={
                changePageSize
              }
              onPreviousPage={
                goToPreviousPage
              }
              onNextPage={
                goToNextPage
              }
            />
          )}
      </section>
    </div>
  );
}