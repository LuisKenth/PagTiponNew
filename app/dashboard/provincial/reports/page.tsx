"use client";
import { useEffect, useState } from "react";

import AttendanceBreakdown from "./components/AttendanceBreakdown";
import AttendanceTrend from "./components/AttendanceTrend";
import EventAttendanceTable from "./components/EventAttendanceTable";
import EventPerformance from "./components/EventPerformance";
import EventStatusSummary from "./components/EventStatusSummary";
import ExportCSVButton from "./components/ExportCSVButton";
import MunicipalityParticipationTable from "./components/MunicipalityParticipationTable";
import NeedsAttention from "./components/NeedsAttention";
import PreparedPendingSummary from "./components/PreparedPendingSummary";
import PrintReportButton from "./components/PrintReportButton";
import ReportFilters from "./components/ReportFilters";
import ReportSummaryCards from "./components/ReportSummaryCards";
import ReportsHeader from "./components/ReportsHeader";
import TopParticipatingMunicipalities from "./components/TopParticipatingMunicipalities";
import useProvincialReports from "./hooks/useProvincialReports";

export default function ProvincialReportsPage() {
  const reports = useProvincialReports();
  const [generatedAt, setGeneratedAt] = useState("");

  useEffect(() => {
    setGeneratedAt(
      new Date().toLocaleString("en-PH")
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Normal Screen Header - Hidden when printing */}
      <div className="print:hidden">
        <ReportsHeader
          loading={reports.loading}
          onRefresh={reports.fetchReports}
        />
      </div>

      {/* Error Message - Hidden when printing */}
      {reports.errorMessage && (
        <div className="print:hidden">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">
              Unable to load reports
            </p>

            <p className="mt-1">
              {reports.errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Filters - Hidden when printing */}
      <div className="print:hidden">
        <ReportFilters
          events={reports.events}
          municipalityOptions={
            reports.municipalityOptions
          }
          selectedEventId={
            reports.selectedEventId
          }
          onEventChange={
            reports.setSelectedEventId
          }
          selectedMunicipality={
            reports.selectedMunicipality
          }
          onMunicipalityChange={
            reports.setSelectedMunicipality
          }
          dateFrom={reports.dateFrom}
          onDateFromChange={
            reports.setDateFrom
          }
          dateTo={reports.dateTo}
          onDateToChange={
            reports.setDateTo
          }
          hasActiveFilters={
            reports.hasActiveFilters
          }
          onReset={reports.resetFilters}
        />
      </div>

      {/* Report Actions - Hidden when printing */}
      <div className="flex flex-wrap justify-end gap-3 print:hidden">
        <PrintReportButton />

        <ExportCSVButton
          eventReports={
            reports.filteredEventReports
          }
          municipalityReports={
            reports.filteredMunicipalityReports
          }
        />
      </div>

      {/* =========================================
          PRINTABLE REPORT
          ========================================= */}
      <div
        id="printable-report"
        className="space-y-6"
      >
        {/* Print-only Header */}
        <div className="hidden print:block">
          <div className="border-b border-slate-300 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              PagTipon Provincial Report
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Event Participation, Preparation, and
              Attendance Report
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Generated:{" "}
              {generatedAt || "Preparing report..."}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <ReportSummaryCards
          eventCount={
            reports.filteredEvents.length
          }
          totalRegistrations={
            reports.totalRegistrations
          }
          totalPresent={
            reports.totalPresent
          }
          overallAttendanceRate={
            reports.overallAttendanceRate
          }
          municipalityPreparationRate={
            reports.municipalityPreparationRate
          }
          totalPreparedAssignments={
            reports.totalPreparedAssignments
          }
          totalMunicipalityAssignments={
            reports.totalMunicipalityAssignments
          }
        />

        {/* Step 3 */}
        <EventStatusSummary
          summary={reports.eventStatusSummary}
          totalEvents={
            reports.filteredEvents.length
          }
        />

        {/* Step 4 */}
        <PreparedPendingSummary
          summary={
            reports.preparedVsPendingSummary
          }
        />

        {/* Step 5 */}
        <TopParticipatingMunicipalities
          reports={
            reports.filteredMunicipalityReports
          }
          loading={reports.loading}
        />

        {/* Step 6 */}
        <NeedsAttention
          reports={
            reports.filteredMunicipalityReports
          }
          loading={reports.loading}
        />

        {/* Step 7 */}
        <EventPerformance
          reports={
            reports.filteredEventReports
          }
          loading={reports.loading}
        />

        {/* Step 8 */}
        <AttendanceTrend
          reports={
            reports.filteredEventReports
          }
          loading={reports.loading}
        />

        {/* Event Attendance */}
        <EventAttendanceTable
          reports={
            reports.filteredEventReports
          }
          loading={reports.loading}
        />

        {/* Municipality Participation */}
        <MunicipalityParticipationTable
          reports={
            reports.filteredMunicipalityReports
          }
          loading={reports.loading}
        />

        {/* Attendance Breakdown */}
        {!reports.loading && (
          <AttendanceBreakdown
            totalRegistrations={
              reports.totalRegistrations
            }
            totalPresent={
              reports.totalPresent
            }
            totalAbsent={
              reports.totalAbsent
            }
          />
        )}

        {/* Print-only Footer */}
        <div className="hidden border-t border-slate-300 pt-4 print:block">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>
              PagTipon — Provincial Event Report
            </p>

            <p>
              Province of Antique
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}