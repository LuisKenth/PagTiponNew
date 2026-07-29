import {
  Ban,
  TriangleAlert,
} from "lucide-react";

import type {
  PreparationStatus,
  ReceivedEvent,
} from "../types/municipalDashboard";

type PrepareEventModalProps = {
  selectedEvent: ReceivedEvent | null;
  preparationStatus: PreparationStatus;
  localInstructions: string;
  registrationOpen: boolean;
  saving: boolean;
  onStatusChange: (value: PreparationStatus) => void;
  onInstructionsChange: (value: string) => void;
  onRegistrationChange: (value: boolean) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
};

export default function PrepareEventModal({
  selectedEvent,
  preparationStatus,
  localInstructions,
  registrationOpen,
  saving,
  onStatusChange,
  onInstructionsChange,
  onRegistrationChange,
  onClose,
  onSave,
}: PrepareEventModalProps) {
  if (!selectedEvent) {
    return null;
  }

  /*
   * A cancelled event may be identified from either:
   *
   * 1. event_municipalities.municipal_status
   * 2. events.status
   *
   * Both are checked so the modal remains protected
   * even if one record has not refreshed yet.
   */
  const municipalStatus = String(
    selectedEvent.municipal_status ?? "",
  )
    .trim()
    .toLowerCase();

  const provincialStatus = String(
    selectedEvent.event?.status ?? "",
  )
    .trim()
    .toLowerCase();

  const isCancelled =
    municipalStatus === "cancelled" ||
    provincialStatus === "cancelled";

  const preparationControlsDisabled =
    saving || isCancelled;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                isCancelled
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {isCancelled ? (
                <Ban className="h-5 w-5" />
              ) : (
                <span className="text-lg font-bold">
                  P
                </span>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isCancelled
                  ? "Cancelled Event"
                  : "Prepare Event"}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {isCancelled
                  ? "This event is available for viewing only. Its municipal preparation and participant registration have been stopped."
                  : "Add local instructions and choose whether participants can register for this municipal event."}
              </p>
            </div>
          </div>

          {/* CANCELLATION WARNING */}
          {isCancelled && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

              <div>
                <p className="text-sm font-bold text-red-900">
                  Preparation and registration stopped
                </p>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  The provincial administrator cancelled this
                  event. Preparation details can no longer be
                  changed, and participant registration is
                  closed.
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-4">
            {/* EVENT TITLE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Event
              </label>

              <input
                type="text"
                value={
                  selectedEvent.event?.title ||
                  "Untitled Event"
                }
                disabled
                className={`w-full rounded-lg border px-4 py-3 text-sm ${
                  isCancelled
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-slate-300 bg-slate-100 text-slate-600"
                }`}
              />
            </div>

            {/* PREPARATION STATUS */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Preparation Status
              </label>

              {isCancelled ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <Ban className="h-4 w-4 text-red-700" />

                  <span className="text-sm font-semibold text-red-700">
                    Cancelled — Preparation has been stopped
                  </span>
                </div>
              ) : (
                <select
                  value={preparationStatus}
                  disabled={preparationControlsDisabled}
                  onChange={(event) =>
                    onStatusChange(
                      event.target
                        .value as PreparationStatus,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                >
                  <option value="pending">
                    Pending — Preparation has not started
                  </option>

                  <option value="preparing">
                    Preparing — Municipality is working on it
                  </option>

                  <option value="prepared">
                    Prepared — Municipality is ready
                  </option>
                </select>
              )}

              <p
                className={`mt-1.5 text-xs ${
                  isCancelled
                    ? "text-red-600"
                    : "text-slate-500"
                }`}
              >
                {isCancelled
                  ? "The preparation status cannot be changed because this event has been cancelled."
                  : "Registration can only be opened after the event is marked as prepared."}
              </p>
            </div>

            {/* LOCAL INSTRUCTIONS */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Local Instructions
              </label>

              <textarea
                value={localInstructions}
                disabled={preparationControlsDisabled}
                onChange={(event) =>
                  onInstructionsChange(
                    event.target.value,
                  )
                }
                rows={5}
                placeholder={
                  isCancelled
                    ? "Local instructions are locked because the event has been cancelled."
                    : "Example: Participants must arrive 30 minutes before the event. Bring valid ID."
                }
                className={`w-full resize-none rounded-lg border px-4 py-3 text-sm outline-none ${
                  isCancelled
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                    : "border-slate-300 bg-white focus:border-slate-900"
                }`}
              />
            </div>

            {/* REGISTRATION CONTROL */}
            <label
              className={`flex items-start gap-3 rounded-lg border p-4 text-sm transition ${
                isCancelled
                  ? "cursor-not-allowed border-red-200 bg-red-50 opacity-80"
                  : preparationStatus === "prepared"
                    ? "cursor-pointer border-slate-200 bg-white"
                    : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={
                  isCancelled
                    ? false
                    : registrationOpen
                }
                disabled={
                  isCancelled ||
                  saving ||
                  preparationStatus !== "prepared"
                }
                onChange={(event) =>
                  onRegistrationChange(
                    event.target.checked,
                  )
                }
                className="mt-0.5 h-4 w-4"
              />

              <div>
                <p
                  className={`font-medium ${
                    isCancelled
                      ? "text-red-800"
                      : "text-slate-800"
                  }`}
                >
                  Open registration for participants
                </p>

                <p
                  className={`mt-1 text-xs ${
                    isCancelled
                      ? "text-red-600"
                      : "text-slate-500"
                  }`}
                >
                  {isCancelled
                    ? "Registration is closed because the event has been cancelled."
                    : preparationStatus === "prepared"
                      ? "Participants from this municipality can register when enabled."
                      : "Mark the event as prepared before opening registration."}
                </p>
              </div>
            </label>
          </div>

          {/* ACTIONS */}
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancelled ? "Close" : "Cancel"}
            </button>

            {!isCancelled && (
              <button
                type="button"
                onClick={() => void onSave()}
                disabled={saving}
                className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save Preparation"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}