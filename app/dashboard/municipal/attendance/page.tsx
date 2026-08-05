"use client";

import AttendanceEventSummary from "./components/AttendanceEventSummary";
import AttendanceFilters from "./components/AttendanceFilters";
import AttendanceHeader from "./components/AttendanceHeader";
import AttendancePagination from "./components/AttendancePagination";
import AttendanceSummaryCards from "./components/AttendanceSummaryCards";
import AttendanceTable from "./components/AttendanceTable";

import useMunicipalAttendance from "./hooks/useMunicipalAttendance";

import {
  exportAttendanceCsv,
} from "./utils/exportAttendanceCsv";

export default function MunicipalAttendancePage() {
  const {
    attendanceRecords,
    filteredAttendanceRecords,

    groupedAttendanceRecords,
    paginatedEventGroups,

    eventOptions,
    selectedEvent,
    attendanceSummary,

    loading,
    refreshing,
    errorMessage,

    searchTerm,
    selectedEventId,
    statusFilter,
    methodFilter,

    currentPage,
    pageSize,
    totalPages,
    firstVisibleItem,
    lastVisibleItem,

    hasActiveFilters,

    setSearchTerm,
    changeSelectedEvent,
    setStatusFilter,
    setMethodFilter,
    clearFilters,

    changePageSize,
    goToPreviousPage,
    goToNextPage,

    refreshAttendance,
  } = useMunicipalAttendance();

  function handleExport() {
    exportAttendanceCsv({
      /*
       * Export all filtered participant
       * records, not only the event groups
       * displayed on the current page.
       */
      records:
        filteredAttendanceRecords,

      eventTitle:
        selectedEvent?.event_title ??
        null,
    });
  }

  return (
    <div className="space-y-6">
      <AttendanceHeader
        totalRecords={
          attendanceRecords.length
        }
        filteredRecords={
          filteredAttendanceRecords.length
        }
        loading={loading}
        refreshing={refreshing}
        exportDisabled={
          loading ||
          filteredAttendanceRecords.length ===
            0
        }
        onExport={handleExport}
        onRefresh={() =>
          void refreshAttendance()
        }
      />

      <AttendanceFilters
        searchTerm={searchTerm}
        selectedEventId={
          selectedEventId
        }
        statusFilter={statusFilter}
        methodFilter={methodFilter}
        eventOptions={eventOptions}
        resultCount={
          filteredAttendanceRecords.length
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
        onMethodChange={
          setMethodFilter
        }
        onClearFilters={clearFilters}
      />

      <AttendanceEventSummary
        selectedEvent={selectedEvent}
      />

      <AttendanceSummaryCards
        summary={attendanceSummary}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2 className="text-lg font-bold text-slate-900">
            Attendance Records by Event
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Attendance records are grouped
            according to their provincial event.
            This page is for municipal monitoring;
            QR scanning and manual check-in remain
            under the authorized Event Staff
            workflow.
          </p>
        </div>

        <AttendanceTable
          eventGroups={
            paginatedEventGroups
          }
          loading={loading}
          errorMessage={errorMessage}
        />

        {!loading &&
          !errorMessage &&
          groupedAttendanceRecords.length >
            0 && (
            <AttendancePagination
              currentPage={
                currentPage
              }
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={
                groupedAttendanceRecords.length
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