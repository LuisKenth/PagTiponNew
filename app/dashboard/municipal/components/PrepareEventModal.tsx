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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900">
            Prepare Event
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add local instructions and choose whether
            participants can register for this municipal event.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Event
              </label>

              <input
                type="text"
                value={
                  selectedEvent.event?.title || "Untitled Event"
                }
                disabled
                className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Preparation Status
              </label>

              <select
                value={preparationStatus}
                onChange={(event) =>
                  onStatusChange(
                    event.target.value as PreparationStatus
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
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

              <p className="mt-1.5 text-xs text-slate-500">
                Registration can only be opened after the event
                is marked as prepared.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Local Instructions
              </label>

              <textarea
                value={localInstructions}
                onChange={(event) =>
                  onInstructionsChange(event.target.value)
                }
                rows={5}
                placeholder="Example: Participants must arrive 30 minutes before the event. Bring valid ID."
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <label
              className={`flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-sm transition ${
                preparationStatus === "prepared"
                  ? "cursor-pointer bg-white"
                  : "cursor-not-allowed bg-slate-50 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={registrationOpen}
                disabled={preparationStatus !== "prepared"}
                onChange={(event) =>
                  onRegistrationChange(event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />

              <div>
                <p className="font-medium text-slate-800">
                  Open registration for participants
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {preparationStatus === "prepared"
                    ? "Participants from this municipality can register when enabled."
                    : "Mark the event as prepared before opening registration."}
                </p>
              </div>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving}
              className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Preparation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
