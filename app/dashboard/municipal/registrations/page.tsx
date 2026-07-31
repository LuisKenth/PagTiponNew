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
    refreshRegistrations,
  } = useMunicipalRegistrations();

  function handleExport() {
    exportRegistrationsCsv({
      /*
       * Export all currently filtered records,
       * not only the visible pagination page.
       */
      registrations:
        filteredRegistrations,

      /*
       * When a specific event is selected,
       * its title is included in the filename.
       */
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
            Registration Records
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Participant names and contact
            details are visible only to the
            authorized municipal administrator.
          </p>
        </div>

        <RegistrationsTable
          registrations={
            paginatedRegistrations
          }
          loading={loading}
          errorMessage={errorMessage}
        />

        {!loading &&
          !errorMessage && (
            <RegistrationsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={
                filteredRegistrations.length
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