"use client";

import { useEffect } from "react";

import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Save,
  TriangleAlert,
  UsersRound,
  X,
  type LucideIcon,
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
  onStatusChange: (
    value: PreparationStatus,
  ) => void;
  onInstructionsChange: (
    value: string,
  ) => void;
  onRegistrationChange: (
    value: boolean,
  ) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
};

type StatusOption = {
  value: PreparationStatus;
  label: string;
  description: string;
  icon: LucideIcon;
  activeClass: string;
  iconClass: string;
};

const statusOptions: StatusOption[] = [
  {
    value: "pending",
    label: "Pending",
    description:
      "Local preparation has not started.",
    icon: Clock3,
    activeClass:
      "border-amber-300 bg-amber-50 ring-2 ring-amber-100",
    iconClass:
      "bg-amber-100 text-amber-700",
  },
  {
    value: "preparing",
    label: "Preparing",
    description:
      "Municipal preparation is in progress.",
    icon: LoaderCircle,
    activeClass:
      "border-blue-300 bg-blue-50 ring-2 ring-blue-100",
    iconClass:
      "bg-blue-100 text-blue-700",
  },
  {
    value: "prepared",
    label: "Prepared",
    description:
      "The municipality is ready for the event.",
    icon: CheckCircle2,
    activeClass:
      "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100",
    iconClass:
      "bg-emerald-100 text-emerald-700",
  },
];

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
  const municipalStatus = String(
    selectedEvent?.municipal_status ?? "",
  )
    .trim()
    .toLowerCase();

  const provincialStatus = String(
    selectedEvent?.event?.status ?? "",
  )
    .trim()
    .toLowerCase();

  const isCancelled =
    municipalStatus === "cancelled" ||
    provincialStatus === "cancelled";

  const controlsDisabled =
    saving || isCancelled;

  const isPrepared =
    preparationStatus === "prepared";

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !saving
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    selectedEvent,
    saving,
    onClose,
  ]);

  if (!selectedEvent) {
    return null;
  }

  function handleStatusSelection(
    value: PreparationStatus,
  ) {
    if (controlsDisabled) {
      return;
    }

    onStatusChange(value);

    /*
     * Registration cannot remain open if the event
     * is moved back from Prepared.
     */
    if (
      value !== "prepared" &&
      registrationOpen
    ) {
      onRegistrationChange(false);
    }
  }

  function handleOverlayClick() {
    if (!saving) {
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prepare-event-title"
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={handleOverlayClick}
    >
      <div className="flex min-h-full items-center justify-center py-4">
        <div
          className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >
          {/* Header */}
          <div
            className={`relative border-b px-5 py-5 sm:px-6 ${
              isCancelled
                ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-4 pr-10">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  isCancelled
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-950 text-white"
                }`}
              >
                {isCancelled ? (
                  <Ban className="h-6 w-6" />
                ) : (
                  <ClipboardList className="h-6 w-6" />
                )}
              </div>

              <div className="min-w-0">
                <p
                  className={`text-xs font-bold uppercase tracking-[0.14em] ${
                    isCancelled
                      ? "text-red-500"
                      : "text-slate-400"
                  }`}
                >
                  Municipal Event Assignment
                </p>

                <h2
                  id="prepare-event-title"
                  className={`mt-1 text-xl font-bold sm:text-2xl ${
                    isCancelled
                      ? "text-red-950"
                      : "text-slate-950"
                  }`}
                >
                  {isCancelled
                    ? "Cancelled Event"
                    : "Manage Event Preparation"}
                </h2>

                <p
                  className={`mt-1 text-sm leading-6 ${
                    isCancelled
                      ? "text-red-700"
                      : "text-slate-500"
                  }`}
                >
                  {isCancelled
                    ? "This event is available for reference only. Preparation and registration controls are locked."
                    : "Update the local preparation status, add instructions, and control participant registration."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Close event preparation modal"
              className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isCancelled
                  ? "text-red-500 hover:bg-red-100 hover:text-red-700"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-5 py-5 sm:px-6">
            {/* Event information */}
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
                  <FileText className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Provincial Event
                  </p>

                  <p className="mt-1 break-words text-base font-bold text-slate-900">
                    {selectedEvent.event
                      ?.title ||
                      "Untitled Event"}
                  </p>

                  {selectedEvent.event
                    ?.description && (
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {
                        selectedEvent.event
                          .description
                      }
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Cancellation warning */}
            {isCancelled && (
              <section className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

                <div>
                  <p className="text-sm font-bold text-red-900">
                    Preparation and registration stopped
                  </p>

                  <p className="mt-1 text-sm leading-6 text-red-700">
                    The provincial administrator
                    cancelled this event. Existing
                    preparation details are retained
                    for reference and cannot be
                    changed.
                  </p>
                </div>
              </section>
            )}

            {/* Preparation status */}
            <section className="mt-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Preparation Status
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Select the municipality&apos;s
                  current preparation progress.
                </p>
              </div>

              {isCancelled ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700">
                    <Ban className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-red-800">
                      Cancelled
                    </p>

                    <p className="mt-0.5 text-xs text-red-600">
                      Municipal preparation has
                      been stopped.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Preparation status"
                  className="mt-3 grid gap-3 sm:grid-cols-3"
                >
                  {statusOptions.map(
                    (option) => {
                      const Icon =
                        option.icon;

                      const active =
                        preparationStatus ===
                        option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={
                            controlsDisabled
                          }
                          onClick={() =>
                            handleStatusSelection(
                              option.value,
                            )
                          }
                          className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            active
                              ? option.activeClass
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                              active
                                ? option.iconClass
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Icon
                              className={`h-4 w-4 ${
                                option.value ===
                                  "preparing" &&
                                active
                                  ? "animate-spin"
                                  : ""
                              }`}
                            />
                          </div>

                          <p className="mt-3 text-sm font-bold text-slate-900">
                            {option.label}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {
                              option.description
                            }
                          </p>
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </section>

            {/* Local instructions */}
            <section className="mt-5">
              <label
                htmlFor="municipal-local-instructions"
                className="text-sm font-bold text-slate-900"
              >
                Local Instructions
              </label>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Add municipal reminders,
                requirements, or arrival
                instructions for participants.
              </p>

              <textarea
                id="municipal-local-instructions"
                value={localInstructions}
                disabled={controlsDisabled}
                onChange={(event) =>
                  onInstructionsChange(
                    event.target.value,
                  )
                }
                rows={5}
                placeholder={
                  isCancelled
                    ? "Local instructions are locked because this event has been cancelled."
                    : "Example: Participants must arrive 30 minutes before the event and bring a valid ID."
                }
                className={`mt-3 w-full resize-none rounded-xl border px-4 py-3 text-sm leading-6 outline-none transition ${
                  isCancelled
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                    : "border-slate-300 bg-white text-slate-700 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                }`}
              />

              <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
                <span
                  className={
                    isCancelled
                      ? "text-red-600"
                      : "text-slate-400"
                  }
                >
                  {isCancelled
                    ? "Instructions are retained for reference only."
                    : "Keep the instructions clear and specific."}
                </span>

                <span className="shrink-0 text-slate-400">
                  {localInstructions.length}{" "}
                  characters
                </span>
              </div>
            </section>

            {/* Registration control */}
            <section className="mt-5">
              <div
                className={`rounded-xl border p-4 transition ${
                  isCancelled
                    ? "border-red-200 bg-red-50"
                    : isPrepared
                      ? registrationOpen
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isCancelled
                        ? "bg-red-100 text-red-700"
                        : registrationOpen &&
                            isPrepared
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isCancelled ||
                    !registrationOpen ? (
                      <LockKeyhole className="h-5 w-5" />
                    ) : (
                      <UsersRound className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-bold ${
                        isCancelled
                          ? "text-red-900"
                          : "text-slate-900"
                      }`}
                    >
                      Participant Registration
                    </p>

                    <p
                      className={`mt-1 text-xs leading-5 ${
                        isCancelled
                          ? "text-red-600"
                          : "text-slate-500"
                      }`}
                    >
                      {isCancelled
                        ? "Registration is permanently closed for this cancelled event."
                        : isPrepared
                          ? "Allow participants from this municipality to register for the event."
                          : "The event must be marked as Prepared before registration can be opened."}
                    </p>
                  </div>

                  <label
                    className={`relative inline-flex shrink-0 items-center ${
                      isCancelled ||
                      saving ||
                      !isPrepared
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        !isCancelled &&
                        isPrepared &&
                        registrationOpen
                      }
                      disabled={
                        isCancelled ||
                        saving ||
                        !isPrepared
                      }
                      onChange={(event) =>
                        onRegistrationChange(
                          event.target
                            .checked,
                        )
                      }
                      className="peer sr-only"
                    />

                    <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-300 peer-disabled:cursor-not-allowed after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
                  </label>
                </div>
              </div>
            </section>
          </div>

          {/* Footer actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancelled
                ? "Close"
                : "Cancel"}
            </button>

            {!isCancelled && (
              <button
                type="button"
                onClick={() =>
                  void onSave()
                }
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving Preparation...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Preparation
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}