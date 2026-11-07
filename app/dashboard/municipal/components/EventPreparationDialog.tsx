"use client";

import { useEffect, useRef } from "react";
import useMunicipalDashboard from "../hooks/useMunicipalDashboard";
import PrepareEventModal from "./PrepareEventModal";
import MunicipalDeliveryToast from "./MunicipalDeliveryToast";

export default function EventPreparationDialog({
  assignmentId,
  onClose,
  onUpdated,
}: {
  assignmentId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const state = useMunicipalDashboard();
  const opened = useRef(false);
  const wasSelected = useRef(false);
  useEffect(() => {
    if (state.loading || opened.current) return;
    const item = state.receivedEvents.find(
      (event) => event.id === assignmentId,
    );
    if (item) {
      opened.current = true;
      state.openPrepareModal(item);
    }
  }, [assignmentId, state]);
  useEffect(() => {
    if (state.selectedEvent) wasSelected.current = true;
    if (wasSelected.current && !state.selectedEvent) {
      wasSelected.current = false;
      onUpdated();
      onClose();
    }
  }, [state.selectedEvent, onClose, onUpdated]);
  return (
    <>
      {!state.selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Load event preparation"
        >
          <div className="rounded-2xl bg-white p-6 text-center">
            <p role="status">
              {state.loading
                ? "Loading preparation…"
                : "Unable to load this event. Check your connection and try again."}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              {!state.loading && (
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2"
                  onClick={() => void state.refreshEvents()}
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                className="rounded-xl border px-4 py-2"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <PrepareEventModal
        selectedEvent={state.selectedEvent}
        preparationStatus={state.preparationStatus}
        localInstructions={state.localInstructions}
        registrationOpen={state.registrationOpen}
        saving={state.savingPreparation}
        venues={state.venues}
        venuesLoading={state.venuesLoading}
        selectedVenueId={state.selectedVenueId}
        venueError={state.venueError}
        onStatusChange={state.handlePreparationStatusChange}
        onVenueChange={state.handleVenueChange}
        onInstructionsChange={state.setLocalInstructions}
        onRegistrationChange={state.setRegistrationOpen}
        onClose={state.closePrepareModal}
        onSave={state.savePreparation}
      />
      <MunicipalDeliveryToast
        toast={state.deliveryToast}
        onClose={state.dismissDeliveryToast}
      />
    </>
  );
}
