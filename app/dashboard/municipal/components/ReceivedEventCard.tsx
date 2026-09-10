import Link from "next/link";

import {
  ArrowUpRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  ListChecks,
  LockKeyhole,
  MapPin,
  Settings2,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

import type {
  MunicipalVenue,
  ReceivedEvent,
} from "../types/municipalDashboard";

import {
  formatDateTime,
  getPreparationStatusClass,
  getPreparationStatusLabel,
  normalizePreparationStatus,
} from "../utils/municipalDashboardUtils";

type ReceivedEventCardProps = {
  item: ReceivedEvent;
  venues?: MunicipalVenue[];
  onPrepare: (item: ReceivedEvent) => void;
  showActions?: boolean;
};

export default function ReceivedEventCard({
  item,
  venues,
  onPrepare,
  showActions = true,
}: ReceivedEventCardProps) {
  const municipalStatus = String(
    item.municipal_status ?? "",
  )
    .trim()
    .toLowerCase();

  const provincialStatus = String(
    item.event?.status ?? "",
  )
    .trim()
    .toLowerCase();

  /*
   * EVENT LIFECYCLE
   *
   * Municipal preparation is editable only
   * while the provincial event is upcoming.
   */
  const isCancelled =
    municipalStatus === "cancelled" ||
    provincialStatus === "cancelled";

  const isOngoing =
    provincialStatus === "ongoing";

  const isCompleted =
    provincialStatus === "completed";

  const isUpcoming =
    provincialStatus === "upcoming";

  const isPreparationEditable =
    isUpcoming &&
    !isCancelled;

  const isPreparationLocked =
    !isPreparationEditable;

  const getEventStatusLabel = () => {
    switch (provincialStatus) {
      case "upcoming":
        return "Upcoming";

      case "ongoing":
        return "Ongoing";

      case "completed":
        return "Completed";

      case "cancelled":
        return "Cancelled";

      case "draft":
        return "Draft";

      default:
        return "Unknown";
    }
  };

  const getEventStatusClass = () => {
    switch (provincialStatus) {
      case "upcoming":
        return "border-blue-200 bg-blue-50 text-blue-700";

      case "ongoing":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";

      case "completed":
        return "border-slate-300 bg-slate-100 text-slate-700";

      case "cancelled":
        return "border-red-200 bg-red-50 text-red-700";

      case "draft":
        return "border-amber-200 bg-amber-50 text-amber-700";

      default:
        return "border-slate-200 bg-slate-50 text-slate-600";
    }
  };

  const normalizedPreparationStatus =
    normalizePreparationStatus(
      item.municipal_status,
    );

  const isPrepared =
    normalizedPreparationStatus ===
    "prepared";

  /*
   * Registration may only appear open while:
   * - the provincial event is upcoming
   * - municipal preparation is Prepared
   * - registration_open is true
   */
  const isRegistrationOpen =
    isPreparationEditable &&
    isPrepared &&
    item.registration_open === true;

  const registeredParticipants =
    item.registered_participants ?? 0;

  /*
   * Match the venue assigned to this specific
   * event_municipalities record.
   */
  const safeVenues =
    Array.isArray(venues)
      ? venues
      : [];

  const assignedVenue =
    safeVenues.find(
      (venue) =>
        venue.id === item.local_venue_id,
    ) ?? null;

  const accentClass =
    isCancelled
      ? "bg-red-500"
      : isOngoing
        ? "bg-emerald-500"
        : isCompleted
          ? "bg-slate-500"
          : isPrepared
            ? "bg-emerald-500"
            : normalizedPreparationStatus ===
                "preparing"
              ? "bg-blue-500"
              : "bg-amber-500";

  const preparationActionLabel =
    isCancelled
      ? "View Cancellation"
      : isPreparationEditable
        ? "Manage Preparation"
        : "View Preparation";

  const preparationActionDescription =
    isCancelled
      ? "Preparation and registration controls are locked because this event was cancelled."
      : isOngoing
        ? "The event is already ongoing. Preparation details are available for reference only."
        : isCompleted
          ? "The event has been completed. Preparation details are available for historical reference."
          : isPreparationEditable
            ? "Update municipal preparation and registration settings."
            : "Preparation changes are not available for this event.";

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 ${
        isCancelled
          ? "border-red-200"
          : isOngoing
            ? "border-emerald-200"
            : isCompleted
              ? "border-slate-300"
              : "border-slate-200 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      {/* Left status accent */}
      <div
        className={`absolute inset-y-0 left-0 w-1 ${accentClass}`}
      />

      {/* Cancelled-event notice */}
      {isCancelled && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <TriangleAlert className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-red-900">
                Provincial Event Cancelled
              </p>

              <p className="mt-1 text-sm leading-6 text-red-700">
                Municipal preparation and participant
                registration have been stopped. Event
                information remains available for reference.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ongoing-event notice */}
      {!isCancelled && isOngoing && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Clock3 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-900">
                Event Already Ongoing
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-700">
                Municipal preparation is now locked.
                Existing preparation information remains
                available for reference.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completed-event notice */}
      {!isCancelled && isCompleted && (
        <div className="border-b border-slate-300 bg-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Event Completed
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Municipal preparation is complete and
                locked. Existing information is retained
                for historical reference.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div
          className={`grid gap-6 ${
            showActions
              ? "xl:grid-cols-[minmax(0,1fr)_220px]"
              : "grid-cols-1"
          }`}
        >
          {/* Main event information */}
          <div className="min-w-0">
            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Provincial Event
              </span>

              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getEventStatusClass()}`}
              >
                {getEventStatusLabel()}
              </span>

              {isCancelled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  <Ban className="h-3.5 w-3.5" />
                  Cancelled
                </span>
              ) : (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getPreparationStatusClass(
                    item.municipal_status,
                  )}`}
                >
                  {getPreparationStatusLabel(
                    normalizedPreparationStatus,
                  )}
                </span>
              )}

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  isRegistrationOpen
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : isCancelled
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {isRegistrationOpen ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <LockKeyhole className="h-3.5 w-3.5" />
                )}

                {isRegistrationOpen
                  ? "Registration Open"
                  : "Registration Closed"}
              </span>

              {isPreparationLocked &&
                !isCancelled && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Preparation Locked
                  </span>
                )}
            </div>

            {/* Title and description */}
            <h3
              className={`mt-3 text-xl font-bold tracking-tight sm:text-2xl ${
                isCancelled
                  ? "text-red-950"
                  : "text-slate-950"
              }`}
            >
              {item.event?.title ||
                "Untitled Event"}
            </h3>

            <p
              className={`mt-2 max-w-3xl text-sm leading-6 ${
                isCancelled
                  ? "text-red-800"
                  : "text-slate-600"
              }`}
            >
              {item.event?.description ||
                "No description provided."}
            </p>

            {/* Event schedule + venue */}
            <div
              className={`mt-5 grid gap-3 rounded-xl border p-4 md:grid-cols-3 ${
                isCancelled
                  ? "border-red-200 bg-red-50/60"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              {/* Start */}
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isCancelled
                      ? "bg-red-100 text-red-700"
                      : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                  }`}
                >
                  <CalendarClock className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-[11px] font-bold uppercase tracking-wide ${
                      isCancelled
                        ? "text-red-500"
                        : "text-slate-400"
                    }`}
                  >
                    Start Date and Time
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      isCancelled
                        ? "text-red-900"
                        : "text-slate-800"
                    }`}
                  >
                    {formatDateTime(
                      item.event?.start_at,
                    )}
                  </p>
                </div>
              </div>

              {/* End */}
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isCancelled
                      ? "bg-red-100 text-red-700"
                      : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                  }`}
                >
                  <Clock3 className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-[11px] font-bold uppercase tracking-wide ${
                      isCancelled
                        ? "text-red-500"
                        : "text-slate-400"
                    }`}
                  >
                    End Date and Time
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      isCancelled
                        ? "text-red-900"
                        : "text-slate-800"
                    }`}
                  >
                    {formatDateTime(
                      item.event?.end_at,
                    )}
                  </p>
                </div>
              </div>

              {/* Local venue */}
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isCancelled
                      ? "bg-red-100 text-red-700"
                      : assignedVenue
                        ? "bg-violet-50 text-violet-700 ring-1 ring-violet-100"
                        : "bg-white text-slate-400 shadow-sm ring-1 ring-slate-200"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-[11px] font-bold uppercase tracking-wide ${
                      isCancelled
                        ? "text-red-500"
                        : "text-slate-400"
                    }`}
                  >
                    Local Venue
                  </p>

                  <p
                    className={`mt-1 break-words text-sm font-semibold ${
                      isCancelled
                        ? "text-red-900"
                        : assignedVenue
                          ? "text-slate-800"
                          : "text-slate-500"
                    }`}
                  >
                    {assignedVenue?.venue_name ||
                      "Not assigned yet"}
                  </p>

                  {assignedVenue &&
                    typeof assignedVenue.capacity ===
                      "number" && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Capacity:{" "}
                        {assignedVenue.capacity.toLocaleString()}
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* Registered participants */}
            <Link
              href={`/dashboard/municipal/registrations?eventMunicipalityId=${encodeURIComponent(
                String(item.id),
              )}`}
              aria-label={`View registered participants for ${
                item.event?.title ||
                "this event"
              }`}
              className={`group mt-4 flex items-center gap-3 rounded-xl border p-4 transition ${
                isCancelled
                  ? "border-red-200 bg-red-50/50 hover:bg-red-100/60"
                  : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isCancelled
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <UsersRound className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-[11px] font-bold uppercase tracking-wide ${
                    isCancelled
                      ? "text-red-500"
                      : "text-slate-400"
                  }`}
                >
                  Registered Participants
                </p>

                <p
                  className={`mt-1 text-sm font-semibold ${
                    isCancelled
                      ? "text-red-900"
                      : "text-slate-800"
                  }`}
                >
                  {registeredParticipants}{" "}
                  {registeredParticipants === 1
                    ? "participant"
                    : "participants"}
                </p>
              </div>

              <div
                className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${
                  isCancelled
                    ? "text-red-600"
                    : "text-emerald-700"
                }`}
              >
                <span className="hidden sm:inline">
                  View records
                </span>

                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </Link>
          </div>

          {/* Right-side actions */}
          {showActions && (
            <aside
              className={`flex flex-col rounded-xl border p-4 ${
                isCancelled
                  ? "border-red-200 bg-red-50/50"
                  : isPreparationLocked
                    ? "border-slate-200 bg-slate-50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    isCancelled
                      ? "bg-red-100 text-red-700"
                      : isPreparationLocked
                        ? "bg-slate-200 text-slate-700"
                        : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                  }`}
                >
                  <ListChecks className="h-4 w-4" />
                </div>

                <div>
                  <p
                    className={`text-xs font-bold ${
                      isCancelled
                        ? "text-red-900"
                        : "text-slate-900"
                    }`}
                  >
                    Event Actions
                  </p>

                  <p
                    className={`mt-0.5 text-xs ${
                      isCancelled
                        ? "text-red-600"
                        : "text-slate-500"
                    }`}
                  >
                    {isPreparationEditable
                      ? "Review or manage"
                      : "Review event details"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {item.event?.memo_url && (
                  <a
                    href={item.event.memo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                      isCancelled
                        ? "bg-red-800 hover:bg-red-700"
                        : "bg-slate-950 hover:bg-slate-800"
                    }`}
                  >
                    <FileText className="h-4 w-4" />

                    View Memo

                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onPrepare(item)
                  }
                  className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold transition ${
                    isCancelled
                      ? "border-red-300 text-red-700 hover:bg-red-100"
                      : isPreparationLocked
                        ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                        : "border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {isCancelled ? (
                    <Ban className="h-4 w-4" />
                  ) : isPreparationLocked ? (
                    <LockKeyhole className="h-4 w-4" />
                  ) : (
                    <Settings2 className="h-4 w-4" />
                  )}

                  {preparationActionLabel}
                </button>
              </div>

              <p
                className={`mt-4 border-t pt-3 text-xs leading-5 ${
                  isCancelled
                    ? "border-red-200 text-red-600"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                {preparationActionDescription}
              </p>
            </aside>
          )}
        </div>
      </div>
    </article>
  );
}