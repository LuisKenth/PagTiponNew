"use client";

import { useEffect } from "react";

import {
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Save,
  TriangleAlert,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import type {
  MunicipalVenue,
  PreparationStatus,
  ReceivedEvent,
} from "../types/municipalDashboard";

type PrepareEventModalProps = {
  selectedEvent: ReceivedEvent | null;
  preparationStatus: PreparationStatus;
  localInstructions: string;
  registrationOpen: boolean;
  saving: boolean;

  venues: MunicipalVenue[];
  venuesLoading: boolean;
  selectedVenueId: string;
  venueError: string | null;

  onStatusChange: (
    value: PreparationStatus,
  ) => void;

  onVenueChange: (
    value: string,
  ) => void;

  onInstructionsChange: (
    value: string,
  ) => void;

  onRegistrationChange: (
    value: boolean,
  ) => void;

  onClose: () => void;

  onSave: () =>
    | void
    | Promise<void>;
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

function formatEventDateTime(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "Schedule not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Schedule not available";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function formatCapacity(
  capacity: number | null,
) {
  if (
    capacity === null ||
    !Number.isFinite(capacity)
  ) {
    return "Capacity not set";
  }

  return `${capacity.toLocaleString()} capacity`;
}

function normalizeVenueStatus(
  value:
    | string
    | null
    | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isVenueActive(
  venue: MunicipalVenue,
) {
  return (
    normalizeVenueStatus(
      venue.status,
    ) === "active"
  );
}

export default function PrepareEventModal({
  selectedEvent,
  preparationStatus,
  localInstructions,
  registrationOpen,
  saving,

  venues,
  venuesLoading,
  selectedVenueId,
  venueError,

  onStatusChange,
  onVenueChange,
  onInstructionsChange,
  onRegistrationChange,
  onClose,
  onSave,
}: PrepareEventModalProps) {
  const municipalStatus =
    String(
      selectedEvent
        ?.municipal_status ??
        "",
    )
      .trim()
      .toLowerCase();

  const provincialStatus =
    String(
      selectedEvent
        ?.event
        ?.status ??
        "",
    )
      .trim()
      .toLowerCase();

  /*
   * EVENT LIFECYCLE
   *
   * Only upcoming events remain editable.
   * Ongoing, completed, and cancelled events
   * are view-only.
   */
  const isCancelled =
    municipalStatus ===
      "cancelled" ||
    provincialStatus ===
      "cancelled";

  const isOngoing =
    provincialStatus ===
    "ongoing";

  const isCompleted =
    provincialStatus ===
    "completed";

  const isLocked =
    isCancelled ||
    isOngoing ||
    isCompleted;

  const controlsDisabled =
    saving ||
    isLocked;

  const isPrepared =
    preparationStatus ===
    "prepared";

  const selectedVenue =
    venues.find(
      (venue) =>
        venue.id ===
        selectedVenueId,
    ) ?? null;

  const selectedVenueIsInactive =
    selectedVenue
      ? !isVenueActive(
          selectedVenue,
        )
      : false;

  const activeVenueCount =
    venues.filter(
      isVenueActive,
    ).length;

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
          "Escape" &&
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

    if (
      value !== "prepared" &&
      registrationOpen
    ) {
      onRegistrationChange(
        false,
      );
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
      onMouseDown={
        handleOverlayClick
      }
    >
      <div className="flex min-h-full items-center justify-center py-4">
        <div
          className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >
          {/* HEADER */}
          <div
            className={`relative border-b px-5 py-5 sm:px-6 ${
              isCancelled
                ? "border-red-200 bg-red-50"
                : isOngoing
                  ? "border-amber-200 bg-amber-50"
                  : isCompleted
                    ? "border-slate-300 bg-slate-100"
                    : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-4 pr-10">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  isCancelled
                    ? "bg-red-100 text-red-700"
                    : isOngoing
                      ? "bg-amber-100 text-amber-700"
                      : isCompleted
                        ? "bg-slate-200 text-slate-700"
                        : "bg-slate-950 text-white"
                }`}
              >
                {isCancelled ? (
                  <Ban className="h-6 w-6" />
                ) : isLocked ? (
                  <LockKeyhole className="h-6 w-6" />
                ) : (
                  <ClipboardList className="h-6 w-6" />
                )}
              </div>

              <div className="min-w-0">
                <p
                  className={`text-xs font-bold uppercase tracking-[0.14em] ${
                    isCancelled
                      ? "text-red-500"
                      : isOngoing
                        ? "text-amber-600"
                        : isCompleted
                          ? "text-slate-500"
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
                      : isOngoing
                        ? "text-amber-950"
                        : "text-slate-950"
                  }`}
                >
                  {isCancelled
                    ? "Cancelled Event"
                    : isOngoing
                      ? "Ongoing Event — View Only"
                      : isCompleted
                        ? "Completed Event — View Only"
                        : "Manage Event Preparation"}
                </h2>

                <p
                  className={`mt-1 text-sm leading-6 ${
                    isCancelled
                      ? "text-red-700"
                      : isOngoing
                        ? "text-amber-700"
                        : "text-slate-500"
                  }`}
                >
                  {isCancelled
                    ? "This event was cancelled. Existing municipal preparation information is retained for reference only."
                    : isOngoing
                      ? "This event is already ongoing. Municipal preparation details are now read-only."
                      : isCompleted
                        ? "This event has been completed. Municipal preparation details are retained for reference only."
                        : "Assign a local venue, update the preparation status, add instructions, and control participant registration."}
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
                  : isOngoing
                    ? "text-amber-600 hover:bg-amber-100 hover:text-amber-800"
                    : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-5 py-5 sm:px-6">
            {/* EVENT INFORMATION */}
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
                    {selectedEvent
                      .event
                      ?.title ||
                      "Untitled Event"}
                  </p>

                  {selectedEvent
                    .event
                    ?.description && (
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {
                        selectedEvent
                          .event
                          .description
                      }
                    </p>
                  )}

                  <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />

                    <div>
                      <p>
                        <span className="font-semibold text-slate-700">
                          Starts:
                        </span>{" "}
                        {formatEventDateTime(
                          selectedEvent
                            .event
                            ?.start_at,
                        )}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-700">
                          Ends:
                        </span>{" "}
                        {formatEventDateTime(
                          selectedEvent
                            .event
                            ?.end_at,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* EVENT LIFECYCLE WARNING */}
            {isLocked && (
              <section
                className={`mt-4 flex items-start gap-3 rounded-xl border p-4 ${
                  isCancelled
                    ? "border-red-200 bg-red-50"
                    : isOngoing
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-300 bg-slate-100"
                }`}
              >
                <TriangleAlert
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    isCancelled
                      ? "text-red-700"
                      : isOngoing
                        ? "text-amber-700"
                        : "text-slate-600"
                  }`}
                />

                <div>
                  <p
                    className={`text-sm font-bold ${
                      isCancelled
                        ? "text-red-900"
                        : isOngoing
                          ? "text-amber-900"
                          : "text-slate-900"
                    }`}
                  >
                    {isCancelled
                      ? "Event cancelled"
                      : isOngoing
                        ? "Event already ongoing"
                        : "Event completed"}
                  </p>

                  <p
                    className={`mt-1 text-sm leading-6 ${
                      isCancelled
                        ? "text-red-700"
                        : isOngoing
                          ? "text-amber-700"
                          : "text-slate-600"
                    }`}
                  >
                    {isCancelled
                      ? "Municipal preparation and participant registration have been stopped. Existing preparation details are retained for reference."
                      : isOngoing
                        ? "The event has already started. Venue assignment, preparation status, local instructions, and registration controls can no longer be changed."
                        : "The event has already ended. Existing municipal preparation details are retained for historical reference."}
                  </p>
                </div>
              </section>
            )}

            {/* LOCAL VENUE */}
            <section className="mt-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <MapPin className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    Local Venue
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {isLocked
                      ? "Review the venue previously assigned to this municipal event."
                      : "Assign a venue from your municipality. The system automatically prevents overlapping bookings."}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <label
                  htmlFor="municipal-local-venue"
                  className="sr-only"
                >
                  Local venue
                </label>

                <select
                  id="municipal-local-venue"
                  value={
                    selectedVenueId
                  }
                  disabled={
                    controlsDisabled ||
                    venuesLoading
                  }
                  onChange={(event) =>
                    onVenueChange(
                      event.target.value,
                    )
                  }
                  className={`min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition ${
                    venueError
                      ? "border-red-300 text-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      : "border-slate-300 text-slate-700 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  } disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}
                >
                  <option value="">
                    {venuesLoading
                      ? "Loading municipal venues..."
                      : "Select a local venue"}
                  </option>

                  {venues.map(
                    (venue) => {
                      const venueIsActive =
                        isVenueActive(
                          venue,
                        );

                      return (
                        <option
                          key={venue.id}
                          value={venue.id}
                          disabled={
                            !venueIsActive
                          }
                        >
                          {venue.venue_name}

                          {!venueIsActive
                            ? " (Inactive)"
                            : ""}

                          {typeof venue.capacity ===
                          "number"
                            ? ` — Capacity: ${venue.capacity.toLocaleString()}`
                            : ""}
                        </option>
                      );
                    },
                  )}
                </select>
              </div>

              {/* NO ACTIVE VENUES */}
              {!venuesLoading &&
                activeVenueCount ===
                  0 &&
                !isLocked && (
                  <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                    <div>
                      <p className="text-sm font-bold text-amber-900">
                        No active municipal
                        venues available
                      </p>

                      <p className="mt-1 text-xs leading-5 text-amber-700">
                        Add or activate a
                        venue in the Municipal
                        Venues page before
                        marking this event as
                        Prepared.
                      </p>
                    </div>
                  </div>
                )}

              {/* SELECTED VENUE INFO */}
              {selectedVenue && (
                <div
                  className={`mt-3 rounded-xl border p-4 ${
                    selectedVenueIsInactive
                      ? "border-red-200 bg-red-50"
                      : "border-violet-200 bg-violet-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {selectedVenueIsInactive ? (
                      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                    ) : (
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm font-bold ${
                            selectedVenueIsInactive
                              ? "text-red-950"
                              : "text-violet-950"
                          }`}
                        >
                          {
                            selectedVenue
                              .venue_name
                          }
                        </p>

                        {selectedVenueIsInactive && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700">
                            Inactive
                          </span>
                        )}
                      </div>

                      <p
                        className={`mt-1 text-xs ${
                          selectedVenueIsInactive
                            ? "text-red-700"
                            : "text-violet-700"
                        }`}
                      >
                        {formatCapacity(
                          selectedVenue
                            .capacity,
                        )}
                      </p>

                      {selectedVenueIsInactive && (
                        <p className="mt-2 text-xs leading-5 text-red-700">
                          {isLocked
                            ? "This venue is currently inactive. The previous venue assignment is retained for reference."
                            : "This venue can no longer be assigned. Please select an active venue before saving."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VENUE ERROR */}
              {venueError && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

                  <div>
                    <p className="text-sm font-bold text-red-900">
                      {venueError
                        .toLowerCase()
                        .includes(
                          "venue schedule conflict",
                        )
                        ? "Venue Schedule Conflict"
                        : venueError
                              .toLowerCase()
                              .includes(
                                "venue unavailable",
                              ) ||
                            venueError
                              .toLowerCase()
                              .includes(
                                "inactive",
                              )
                          ? "Venue Unavailable"
                          : "Venue Required"}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-700">
                      {venueError.replace(
                        /^(Venue Schedule Conflict|Venue Unavailable):\s*/i,
                        "",
                      )}
                    </p>
                  </div>
                </div>
              )}

              <p className="mt-2 text-xs leading-5 text-slate-400">
                {isLocked
                  ? "The assigned venue is retained for reference and can no longer be changed."
                  : "Venue selection is required before the event can be marked as Prepared. Inactive venues are shown for reference but cannot be selected."}
              </p>
            </section>

            {/* PREPARATION STATUS */}
            <section className="mt-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Preparation Status
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {isLocked
                    ? "Review the final recorded municipal preparation progress."
                    : "Select the municipality's current preparation progress."}
                </p>
              </div>

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
                        key={
                          option.value
                        }
                        type="button"
                        role="radio"
                        aria-checked={
                          active
                        }
                        disabled={
                          controlsDisabled
                        }
                        onClick={() =>
                          handleStatusSelection(
                            option.value,
                          )
                        }
                        className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed ${
                          active
                            ? option.activeClass
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        } ${
                          isLocked
                            ? "disabled:opacity-80"
                            : "disabled:opacity-60"
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
                              active &&
                              !isLocked
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

              {isLocked && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  This preparation status is
                  retained for reference and
                  can no longer be changed.
                </p>
              )}
            </section>

            {/* LOCAL INSTRUCTIONS */}
            <section className="mt-5">
              <label
                htmlFor="municipal-local-instructions"
                className="text-sm font-bold text-slate-900"
              >
                Local Instructions
              </label>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {isLocked
                  ? "Review the municipal instructions recorded before the event was locked."
                  : "Add municipal reminders, requirements, or arrival instructions for participants."}
              </p>

              <textarea
                id="municipal-local-instructions"
                value={
                  localInstructions
                }
                disabled={
                  controlsDisabled
                }
                onChange={(event) =>
                  onInstructionsChange(
                    event.target.value,
                  )
                }
                rows={5}
                placeholder={
                  isLocked
                    ? "Local instructions are locked because this event is no longer available for preparation changes."
                    : "Example: Participants must arrive 30 minutes before the event and bring a valid ID."
                }
                className={`mt-3 w-full resize-none rounded-xl border px-4 py-3 text-sm leading-6 outline-none transition ${
                  isLocked
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                    : "border-slate-300 bg-white text-slate-700 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                }`}
              />

              <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
                <span
                  className={
                    isCancelled
                      ? "text-red-600"
                      : isLocked
                        ? "text-slate-500"
                        : "text-slate-400"
                  }
                >
                  {isLocked
                    ? "Instructions are retained for reference only."
                    : "Keep the instructions clear and specific."}
                </span>

                <span className="shrink-0 text-slate-400">
                  {
                    localInstructions.length
                  }{" "}
                  characters
                </span>
              </div>
            </section>

            {/* REGISTRATION CONTROL */}
            <section className="mt-5">
              <div
                className={`rounded-xl border p-4 transition ${
                  isCancelled
                    ? "border-red-200 bg-red-50"
                    : isLocked
                      ? "border-slate-300 bg-slate-100"
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
                        : isLocked
                          ? "bg-slate-200 text-slate-700"
                          : registrationOpen &&
                              isPrepared
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isLocked ||
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
                        : isOngoing
                          ? "Registration is closed because the event is already ongoing."
                          : isCompleted
                            ? "Registration is closed because the event has already been completed."
                            : isPrepared
                              ? "Allow participants from this municipality to register for the event."
                              : "The event must be marked as Prepared before registration can be opened."}
                    </p>
                  </div>

                  <label
                    className={`relative inline-flex shrink-0 items-center ${
                      isLocked ||
                      saving ||
                      !isPrepared
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        !isLocked &&
                        isPrepared &&
                        registrationOpen
                      }
                      disabled={
                        isLocked ||
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

          {/* FOOTER */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLocked
                ? "Close"
                : "Cancel"}
            </button>

            {!isLocked && (
              <button
                type="button"
                onClick={() =>
                  void onSave()
                }
                disabled={
                  saving ||
                  selectedVenueIsInactive
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving Preparation...
                  </>
                ) : selectedVenueIsInactive ? (
                  <>
                    <TriangleAlert className="h-4 w-4" />
                    Choose an Active Venue
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