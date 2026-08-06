"use client";

import {
  CircleAlert,
  TriangleAlert,
} from "lucide-react";

import AttendanceBreakdown from "./components/AttendanceBreakdown";
import EventPerformanceTable from "./components/EventPerformanceTable";
import MunicipalReportsHeader from "./components/MunicipalReportsHeader";
import ReportFilters from "./components/ReportFilters";
import ReportSummaryCards from "./components/ReportSummaryCards";
import ReportsPagination from "./components/ReportsPagination";

import useMunicipalReports from "./hooks/useMunicipalReports";

import {
  exportMunicipalReportCsv,
} from "./utils/exportMunicipalReportCsv";

export default function MunicipalReportsPage() {
  const {
    filteredEvents,
    paginatedEvents,
    eventOptions,
    municipality,
    summary,

    loading,
    refreshing,
    errorMessage,
    warningMessage,

    searchTerm,
    selectedEventId,
    statusFilter,
    dateFrom,
    dateTo,
    currentPage,
    pageSize,
    totalPages,
    firstVisibleItem,
    lastVisibleItem,
    hasActiveFilters,

    setSearchTerm,
    changeSelectedEvent,
    setStatusFilter,
    setDateFrom,
    setDateTo,
    clearFilters,

    changePageSize,
    goToPreviousPage,
    goToNextPage,

    refreshReports,
  } = useMunicipalReports();

  function handleExport() {
    exportMunicipalReportCsv({
      events: filteredEvents,
      municipality,
    });
  }

  return (
    <div className="space-y-6">
      <MunicipalReportsHeader
        municipality={municipality}
        loading={loading}
        refreshing={refreshing}
        exportDisabled={
          loading ||
          filteredEvents.length ===
            0
        }
        onExport={handleExport}
        onRefresh={() =>
          void refreshReports()
        }
      />

      {warningMessage && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <TriangleAlert className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-bold text-amber-900">
              Partial Report Data
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-700">
              {warningMessage}
            </p>
          </div>
        </section>
      )}

      {errorMessage && !loading && (
        <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
            <CircleAlert className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-bold text-red-900">
              Report Loading Failed
            </p>

            <p className="mt-1 text-sm leading-6 text-red-700">
              {errorMessage}
            </p>
          </div>
        </section>
      )}

      <ReportFilters
        searchTerm={searchTerm}
        selectedEventId={
          selectedEventId
        }
        statusFilter={statusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        eventOptions={eventOptions}
        resultCount={
          filteredEvents.length
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
        onDateFromChange={
          setDateFrom
        }
        onDateToChange={setDateTo}
        onClearFilters={clearFilters}
      />

      <ReportSummaryCards
        summary={summary}
      />

      <AttendanceBreakdown
        summary={summary}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Event Performance
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Compare registrations,
              attendance outcomes, and
              check-in methods for each
              assigned event.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {filteredEvents.length}{" "}
            {filteredEvents.length === 1
              ? "event"
              : "events"}
          </span>
        </div>

        <EventPerformanceTable
          events={paginatedEvents}
          loading={loading}
          errorMessage={errorMessage}
        />

        {!loading &&
          !errorMessage && (
            <ReportsPagination
              currentPage={
                currentPage
              }
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
  );
}
