"use client";

import { useState } from "react";

import PrepareEventModal from "../components/PrepareEventModal";
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

export default function MunicipalEventsPage() {
  const {
    municipality,
    receivedEvents,
    loading,
    selectedEvent,
    localInstructions,
    registrationOpen,
    savingPreparation,
    preparationStatus,
    setLocalInstructions,
    setRegistrationOpen,
    openPrepareModal,
    closePrepareModal,
    handlePreparationStatusChange,
    savePreparation,
    refreshEvents,
  } = useMunicipalDashboard();

  const {
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
  } = useMunicipalEventsPage(
    receivedEvents,
  );

  const [refreshing, setRefreshing] =
    useState(false);

  const registrationOpenCount =
    receivedEvents.filter(
      isRegistrationOpen,
    ).length;

  const cancelledCount =
    receivedEvents.filter(
      isCancelledEvent,
    ).length;

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
    <>
      <div className="space-y-6">
        <MunicipalEventsHeader
          municipality={municipality}
          totalReceived={
            receivedEvents.length
          }
          filteredCount={
            filteredEvents.length
          }
          registrationOpenCount={
            registrationOpenCount
          }
          cancelledCount={
            cancelledCount
          }
          loading={loading}
          refreshing={refreshing}
          onRefresh={() =>
            void handleRefresh()
          }
        />

        <MunicipalEventsFilters
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          registrationFilter={
            registrationFilter
          }
          sortOption={sortOption}
          resultCount={
            filteredEvents.length
          }
          hasActiveFilters={
            hasActiveFilters
          }
          onSearchChange={
            setSearchTerm
          }
          onStatusFilterChange={
            setStatusFilter
          }
          onRegistrationFilterChange={
            setRegistrationFilter
          }
          onSortChange={setSortOption}
          onClearFilters={clearFilters}
        />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <MunicipalEventsList
            events={paginatedEvents}
            loading={loading}
            firstVisibleItem={
              firstVisibleItem
            }
            lastVisibleItem={
              lastVisibleItem
            }
            totalFilteredEvents={
              filteredEvents.length
            }
            hasActiveFilters={
              hasActiveFilters
            }
            onPrepare={
              openPrepareModal
            }
            onClearFilters={
              clearFilters
            }
          />

          {!loading && (
            <MunicipalEventsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={
                filteredEvents.length
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

      <PrepareEventModal
        selectedEvent={selectedEvent}
        preparationStatus={
          preparationStatus
        }
        localInstructions={
          localInstructions
        }
        registrationOpen={
          registrationOpen
        }
        saving={savingPreparation}
        onStatusChange={
          handlePreparationStatusChange
        }
        onInstructionsChange={
          setLocalInstructions
        }
        onRegistrationChange={
          setRegistrationOpen
        }
        onClose={closePrepareModal}
        onSave={savePreparation}
      />
    </>
  );
}
