"use client";

import {
  ClipboardList,
  RefreshCw,
} from "lucide-react";

import PrepareEventModal from "../components/PrepareEventModal";
import ReceivedEventsSection from "../components/ReceivedEventsSection";
import useMunicipalDashboard from "../hooks/useMunicipalDashboard";

export default function MunicipalPreparationsPage() {
  const {
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
  } = useMunicipalDashboard();

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
        {/* Page heading */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1 bg-slate-950" />

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                <ClipboardList className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Event Operations
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Event Preparation
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review provincial events, update municipal
                  preparation progress, provide local instructions,
                  and control participant registration.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />

              Refresh
            </button>
          </div>
        </section>

        {/* Preparation information */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
              Pending
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Preparation has not yet started.
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              In Progress
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Municipal preparation is currently underway.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Ready
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Municipal requirements have been completed.
            </p>
          </div>
        </section>

        {/* Received events */}
        <ReceivedEventsSection
          events={receivedEvents}
          loading={loading}
          highlightedEventId={null}
          onPrepare={openPrepareModal}
        />
      </div>

      {/* Existing preparation modal */}
      <PrepareEventModal
        selectedEvent={selectedEvent}
        preparationStatus={preparationStatus}
        localInstructions={localInstructions}
        registrationOpen={registrationOpen}
        saving={savingPreparation}
        onStatusChange={handlePreparationStatusChange}
        onInstructionsChange={setLocalInstructions}
        onRegistrationChange={setRegistrationOpen}
        onClose={closePrepareModal}
        onSave={savePreparation}
      />
    </>
  );
}