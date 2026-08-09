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
import ParticipantCategoryBreakdown from "./components/ParticipantCategoryBreakdown";
import PreparedPendingSummary from "./components/PreparedPendingSummary";
import PrintReportButton from "./components/PrintReportButton";
import ReportFilters from "./components/ReportFilters";
import ReportSummaryCards from "./components/ReportSummaryCards";
import ReportsHeader from "./components/ReportsHeader";
import TopParticipatingMunicipalities from "./components/TopParticipatingMunicipalities";
import useProvincialReports from "./hooks/useProvincialReports";

export default function ProvincialReportsPage() {
  const reports = useProvincialReports();

  const [generatedAt, setGeneratedAt] =
    useState("");

  useEffect(() => {
    setGeneratedAt(
      new Date().toLocaleString("en-PH")
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* =========================================
          NORMAL SCREEN HEADER
          ========================================= */}
      <div className="print:hidden">
        <ReportsHeader
          loading={reports.loading}
          onRefresh={reports.fetchReports}
        />
      </div>

      {/* =========================================
          ERROR MESSAGE
          ========================================= */}
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

      {/* =========================================
          FILTERS
          ========================================= */}
      <div className="print:hidden">
        <ReportFilters
          events={reports.events}
          municipalityOptions={
            reports.municipalityOptions
          }
          participantCategoryOptions={
            reports.participantCategoryOptions
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
          selectedParticipantCategory={
            reports.selectedParticipantCategory
          }
          onParticipantCategoryChange={
            reports.setSelectedParticipantCategory
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

      {/* =========================================
          REPORT ACTIONS
          ========================================= */}
      <div className="flex flex-wrap justify-end gap-3 print:hidden">
        <PrintReportButton />

        <ExportCSVButton
          eventReports={
            reports.filteredEventReports
          }
          municipalityReports={
            reports.filteredMunicipalityReports
          }
          participantCategoryBreakdown={
            reports.participantCategoryBreakdown
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
        {/* =======================================
            PRINT-ONLY HEADER
            ======================================= */}
        <div className="hidden print:block">
          <div className="border-b border-slate-300 pb-3">
            <h1 className="text-2xl font-bold text-slate-900 print:text-lg">
              PagTipon Provincial Report
            </h1>

            <p className="mt-1 text-sm text-slate-600 print:text-[10px]">
              Event Participation, Preparation, and
              Attendance Report
            </p>

            <p className="mt-2 text-xs text-slate-500 print:mt-1 print:text-[9px]">
              Generated:{" "}
              {generatedAt ||
                "Preparing report..."}
            </p>
          </div>
        </div>

        {/* =======================================
            SUMMARY CARDS
            ======================================= */}
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

        {/* =======================================
            EVENT STATUS
            ======================================= */}
        <EventStatusSummary
          summary={
            reports.eventStatusSummary
          }
          totalEvents={
            reports.filteredEvents.length
          }
        />

        {/* =======================================
            PREPARED VS PENDING
            ======================================= */}
        <PreparedPendingSummary
          summary={
            reports.preparedVsPendingSummary
          }
        />

        {/* =======================================
            TOP MUNICIPALITIES
            ======================================= */}
        <TopParticipatingMunicipalities
          reports={
            reports.filteredMunicipalityReports
          }
          loading={reports.loading}
        />

        {/* =======================================
            NEEDS ATTENTION
            ======================================= */}
        <NeedsAttention
          reports={
            reports.filteredMunicipalityReports
          }
          loading={reports.loading}
        />

        {/* =======================================
            EVENT PERFORMANCE
            ======================================= */}
        <EventPerformance
          reports={
            reports.filteredEventReports
          }
          loading={reports.loading}
        />

        {/* =======================================
            ATTENDANCE TREND
            ======================================= */}
        <AttendanceTrend
          reports={
            reports.filteredEventReports
          }
          loading={reports.loading}
        />

        {/* =======================================
            EVENT ATTENDANCE SUMMARY
            ======================================= */}
        <EventAttendanceTable
          reports={
            reports.filteredEventReports
          }
          loading={reports.loading}
        />

        {/* =======================================
            MUNICIPALITY PARTICIPATION
            ======================================= */}
        <MunicipalityParticipationTable
          reports={
            reports.filteredMunicipalityReports
          }
          loading={reports.loading}
        />

        {/* =======================================
            PARTICIPANT CATEGORY BREAKDOWN
            ======================================= */}
        <ParticipantCategoryBreakdown
          items={
            reports.participantCategoryBreakdown
          }
          loading={reports.loading}
        />

        {/* =======================================
            ATTENDANCE BREAKDOWN
            ======================================= */}
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

        {/* =======================================
            PRINT-ONLY FOOTER
            ======================================= */}
        <div className="hidden print:block">
          <div className="border-t border-slate-300 pt-3">
            <div className="flex items-center justify-between text-[9px] text-slate-500">
              <p>
                PagTipon — Provincial Event
                Report
              </p>

              <p>
                Province of Antique
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          GLOBAL PRINT STYLES
          ========================================= */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          html,
          body {
            background: #ffffff !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /*
           * PRINTABLE REPORT WIDTH
           */
          #printable-report {
            width: 100% !important;
            max-width: none !important;
          }

          /*
           * Replace normal space-y-6 spacing
           * with smaller print spacing.
           */
          #printable-report > * {
            margin-top: 0 !important;
          }

          #printable-report > * + * {
            margin-top: 10px !important;
          }

          /*
           * Remove unnecessary shadows.
           */
          #printable-report section {
            box-shadow: none !important;
          }

          /*
           * Prevent headings from being left
           * alone at the bottom of a page.
           */
          #printable-report h1,
          #printable-report h2,
          #printable-report h3 {
            break-after: avoid-page;
            page-break-after: avoid;
          }

          /*
           * Tables
           */
          #printable-report table {
            width: 100% !important;
            font-size: 9px !important;
          }

          #printable-report thead {
            display: table-header-group;
          }

          #printable-report tfoot {
            display: table-footer-group;
          }

          /*
           * Do not split a single table row
           * between two pages.
           */
          #printable-report tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /*
           * Avoid splitting common small items.
           */
          #printable-report li {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /*
           * Keep progress bars/colors visible.
           */
          #printable-report * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}