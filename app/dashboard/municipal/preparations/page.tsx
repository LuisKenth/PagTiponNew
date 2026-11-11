"use client";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";

import { useEffect, useRef, useState } from "react";

import { ClipboardList, RefreshCw, TriangleAlert, X } from "lucide-react";

import MunicipalDeliveryToast from "../components/MunicipalDeliveryToast";
import PrepareEventModal from "../components/PrepareEventModal";
import ReceivedEventsSection from "../components/ReceivedEventsSection";
import MunicipalEventsFilters from "../events/components/MunicipalEventsFilters";
import useMunicipalEventsPage from "../events/hooks/useMunicipalEventsPage";
import useMunicipalDashboard from "../hooks/useMunicipalDashboard";

import type { ReceivedEvent } from "../types/municipalDashboard";

function normalizeId(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export default function MunicipalPreparationsPage() {
  /*
   * Prevent a query-linked event from opening
   * repeatedly during normal re-renders.
   */
  const targetEventHandled = useRef(false);

  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(
    null,
  );

  const [targetError, setTargetError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const {
    receivedEvents,
    loading,
    deliveryToast,
    dismissDeliveryToast,

    /*
     * Municipal venue assignment
     */
    venues,
    venuesLoading,
    selectedVenueId,
    venueError,

    selectedEvent,
    localInstructions,
    registrationOpen,
    savingPreparation,
    preparationStatus,

    setLocalInstructions,
    setRegistrationOpen,

    handleVenueChange,

    openPrepareModal,
    closePrepareModal,
    handlePreparationStatusChange,
    savePreparation,

    refreshEvents,
  } = useMunicipalDashboard();

  const {
    searchTerm,
    statusFilter,
    eventStatusFilter,
    registrationFilter,
    sortOption,
    filteredEvents,
    hasActiveFilters,
    setSearchTerm,
    setStatusFilter,
    setEventStatusFilter,
    setRegistrationFilter,
    setSortOption,
    clearFilters,
  } = useMunicipalEventsPage(receivedEvents);

  /*
   * OPEN EVENT FROM DASHBOARD / EVENTS /
   * NOTIFICATIONS
   *
   * Supported URLs:
   *
   * /dashboard/municipal/preparations
   * ?assignmentId=...
   *
   * Fallback support:
   *
   * /dashboard/municipal/preparations
   * ?eventId=...
   *
   * assignmentId is preferred because it points
   * directly to the municipality-specific
   * event_municipalities record.
   */
  useEffect(() => {
    if (loading || targetEventHandled.current) {
      return;
    }

    const searchParameters = new URLSearchParams(window.location.search);

    const assignmentId = normalizeId(searchParameters.get("assignmentId"));

    const eventId = normalizeId(searchParameters.get("eventId"));

    /*
     * Normal direct visit to the Preparation
     * page. Nothing needs to be opened.
     */
    if (!assignmentId && !eventId) {
      return;
    }

    /*
     * First use the exact municipal assignment.
     */
    let targetEvent = assignmentId
      ? receivedEvents.find((item) => normalizeId(item.id) === assignmentId)
      : undefined;

    /*
     * Provincial event ID fallback.
     */
    if (!targetEvent && eventId) {
      targetEvent = receivedEvents.find(
        (item) =>
          normalizeId(item.event_id) === eventId ||
          normalizeId(item.event?.id) === eventId,
      );
    }

    /*
     * Keep the query parameters when the event
     * cannot be found yet. This allows another
     * refresh to retry the lookup.
     */
    if (!targetEvent) {
      setTargetError(
        "The requested municipal event could not be found. It may no longer be assigned to your municipality, or the event data may not have loaded correctly.",
      );

      return;
    }

    targetEventHandled.current = true;

    setTargetError(null);

    const targetAssignmentId = normalizeId(targetEvent.id);

    setHighlightedEventId(targetAssignmentId || null);

    /*
     * Open the authoritative preparation modal.
     *
     * Lifecycle rules inside the shared hook
     * and modal determine whether the event is
     * editable or view-only.
     */
    openPrepareModal(targetEvent);

    /*
     * Clean the URL after the correct assignment
     * has been resolved. Closing the modal will
     * therefore not immediately reopen it.
     */
    window.history.replaceState({}, "", "/dashboard/municipal/preparations");
  }, [loading, receivedEvents, openPrepareModal]);

  /*
   * Open an event selected directly from this
   * page.
   */
  function handleOpenPreparation(item: ReceivedEvent) {
    setTargetError(null);

    setHighlightedEventId(normalizeId(item.id) || null);

    openPrepareModal(item);
  }

  /*
   * Clear the card highlight together with the
   * modal.
   */
  function handleClosePreparation() {
    closePrepareModal();

    setHighlightedEventId(null);
  }

  /*
   * Refresh without reloading the entire page.
   */
  async function handleRefresh() {
    if (loading || refreshing) {
      return;
    }

    setRefreshing(true);
    setTargetError(null);

    try {
      await refreshEvents();
    } finally {
      setRefreshing(false);
    }
  }

  /*
   * Close an unresolved target warning and clean
   * the query URL.
   */
  function dismissTargetError() {
    setTargetError(null);

    targetEventHandled.current = true;

    window.history.replaceState({}, "", "/dashboard/municipal/preparations");
  }

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
        <MunicipalPageHeader
          icon={<ClipboardList className="h-6 w-6" />}
          eyebrow="Municipal Event Operations"
          title="Event Preparation"
          description="Assign venues, provide participant instructions, and manage event registration before events begin."
          footer="Ongoing, completed, and cancelled events remain available for reference but cannot be modified."
          actions={null}
        />

        {/* QUERY TARGET ERROR */}
        {targetError && (
          <section className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
            <div className="h-1 bg-amber-500" />

            <div className="flex items-start gap-3 p-4 pr-12 sm:p-5 sm:pr-14">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <TriangleAlert className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-amber-900">
                  Event Not Found
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-700">
                  {targetError}
                </p>

                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={loading || refreshing}
                  className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      refreshing ? "animate-spin" : ""
                    }`}
                  />
                  Try Again
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissTargetError}
              aria-label="Close event lookup warning"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-amber-600 transition hover:bg-amber-100 hover:text-amber-800 sm:right-4 sm:top-5"
            >
              <X className="h-4 w-4" />
            </button>
          </section>
        )}

        {/* PREPARATION STATUS INFORMATION */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
              Pending
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Municipal preparation has not yet started.
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Preparing
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Municipal preparation is currently underway.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Prepared
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Municipal requirements have been completed and the event is ready
              locally.
            </p>
          </div>
        </section>

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

        {/* RECEIVED EVENTS */}
        <ReceivedEventsSection
          events={filteredEvents}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          venues={venues}
          loading={loading}
          highlightedEventId={highlightedEventId}
          onPrepare={handleOpenPreparation}
        />
      </div>

      {/* AUTHORITATIVE PREPARATION MODAL */}
      <PrepareEventModal
        selectedEvent={selectedEvent}
        preparationStatus={preparationStatus}
        localInstructions={localInstructions}
        registrationOpen={registrationOpen}
        saving={savingPreparation}
        /*
         * Municipal venue assignment
         */
        venues={venues}
        venuesLoading={venuesLoading}
        selectedVenueId={selectedVenueId}
        venueError={venueError}
        onStatusChange={handlePreparationStatusChange}
        onVenueChange={handleVenueChange}
        onInstructionsChange={setLocalInstructions}
        onRegistrationChange={setRegistrationOpen}
        onClose={handleClosePreparation}
        onSave={savePreparation}
      />
      <MunicipalDeliveryToast
        toast={deliveryToast}
        onClose={dismissDeliveryToast}
      />
    </>
  );
}
