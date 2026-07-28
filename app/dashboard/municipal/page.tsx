"use client";

import MunicipalDashboardHeader from "./components/MunicipalDashboardHeader";
import MunicipalDashboardSummary from "./components/MunicipalDashboardSummary";
import PrepareEventModal from "./components/PrepareEventModal";
import ReceivedEventsSection from "./components/ReceivedEventsSection";
import useMunicipalDashboard from "./hooks/useMunicipalDashboard";

export default function MunicipalDashboardPage() {
  const {
    municipality,
    receivedEvents,
    summary,
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
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <MunicipalDashboardHeader municipality={municipality} />

        <MunicipalDashboardSummary summary={summary} />

        <ReceivedEventsSection
          events={receivedEvents}
          loading={loading}
          onPrepare={openPrepareModal}
        />
      </div>

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
    </main>
  );
}
