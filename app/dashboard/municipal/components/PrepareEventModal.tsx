"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  MapPin,
  X,
} from "lucide-react";
import type {
  MunicipalVenue,
  PreparationStatus,
  ReceivedEvent,
} from "../types/municipalDashboard";
import EventStaffManager from "./EventStaffManager";
import {
  formatStaffDate,
  staffButton,
  staffPrimaryButton,
} from "./eventStaffData";
import {
  preparationIssue,
  preparationLabels,
  preparationLock,
  type PreparationSaveOptions,
} from "./preparationWizard";

type Props = {
  selectedEvent: ReceivedEvent | null;
  preparationStatus: PreparationStatus;
  localInstructions: string;
  registrationOpen: boolean;
  saving: boolean;
  venues: MunicipalVenue[];
  venuesLoading: boolean;
  selectedVenueId: string;
  venueError: string | null;
  onStatusChange: (value: PreparationStatus) => void;
  onVenueChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
  onRegistrationChange: (value: boolean) => void;
  onClose: () => void;
  onSave: (
    options?: PreparationSaveOptions,
  ) => void | boolean | Promise<void | boolean>;
};

export default function PrepareEventModal(props: Props) {
  return props.selectedEvent ? (
    <PreparationWizard
      key={props.selectedEvent.id}
      {...props}
      selectedEvent={props.selectedEvent}
    />
  ) : null;
}

function PreparationWizard({
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
}: Props & { selectedEvent: ReceivedEvent }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [completion, setCompletion] = useState<{
    ready: boolean;
    count: number;
    warning: string;
  } | null>(null);
  const [issue, setIssue] = useState("");
  const [staffBusy, setStaffBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const saveInFlight = useRef(false);
  const snapshot = () =>
    JSON.stringify([
      preparationStatus,
      selectedVenueId,
      localInstructions,
      registrationOpen,
    ]);
  const savedSnapshot = useRef(snapshot());
  const municipal = selectedEvent.event?.event_origin === "municipal";
  const lock = preparationLock(selectedEvent, now);
  const busy = saving || staffBusy || submitting;
  const venue = venues.find((v) => v.id === selectedVenueId) ?? null;
  const ready = preparationStatus === "prepared";
  const effectiveOpen = ready && registrationOpen && !lock;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow,
      htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const node = dialog.current;
    node?.showModal();
    const clock = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.clearInterval(clock);
      node?.close();
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    content.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [step, completion]);

  function close() {
    if (busy) return;
    if (
      !lock &&
      !completion &&
      savedSnapshot.current !== snapshot() &&
      !window.confirm("Discard unsaved preparation changes?")
    )
      return;
    onClose();
  }
  function next() {
    setIssue("");
    setStep(2);
  }
  async function save() {
    if (busy || saveInFlight.current || lock) return;
    const invalid = preparationIssue({
      status: preparationStatus,
      venue,
      instructions: localInstructions,
      municipal,
      venueError,
      event: selectedEvent,
    });
    if (invalid) {
      setIssue(invalid.message);
      setStep(invalid.step);
      return;
    }
    saveInFlight.current = true;
    setSubmitting(true);
    setIssue("");
    try {
      const success = await onSave({ keepOpen: true, skipStaffPrompt: true });
      if (success !== true) {
        setIssue(
          "Preparation was not saved. Review the validation message and try again.",
        );
        return;
      }
      savedSnapshot.current = snapshot();
      if (ready) setStep(3);
      else setCompletion({ ready: false, count: 0, warning: "" });
    } catch (e) {
      setIssue(
        e instanceof Error
          ? e.message
          : "Unable to save preparation. Please try again.",
      );
    } finally {
      saveInFlight.current = false;
      setSubmitting(false);
    }
  }
  const field =
    "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 sm:text-sm";
  const returnHref =
    selectedEvent.event?.event_origin === "municipal"
      ? "/dashboard/municipal/local-events"
      : "/dashboard/municipal/events";
  return (
    <dialog
      ref={dialog}
      aria-labelledby="prepare-event-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="m-auto h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col overflow-hidden border-0 bg-white p-0 text-slate-900 shadow-2xl open:flex sm:h-[min(46rem,90dvh)] sm:max-h-[90dvh] sm:w-[calc(100%_-_2rem)] sm:max-w-2xl sm:rounded-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm"
    >
      <header className="shrink-0 border-b p-4 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                ref={heading}
                tabIndex={-1}
                id="prepare-event-title"
                className="text-xl font-bold outline-none"
              >
                {lock
                  ? "Event Preparation · View Only"
                  : completion
                    ? "Preparation Saved"
                    : "Prepare Event"}
              </h2>
              <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                {selectedEvent.event?.title || "Untitled event"}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close event preparation"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            disabled={busy}
            onClick={close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {formatStaffDate(selectedEvent.event?.start_at || null)} –{" "}
          {formatStaffDate(selectedEvent.event?.end_at || null)} (PH)
        </p>
        {!lock && !completion && (
          <ol
            aria-label="Preparation steps"
            className="mt-3 grid grid-cols-3 gap-2"
          >
            {["Venue", "Readiness", "Staff"].map((label, index) => (
              <li
                key={label}
                aria-current={step === index + 1 ? "step" : undefined}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold ${step === index + 1 ? "bg-indigo-600 text-white" : step > index + 1 ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}
              >
                <span aria-hidden="true">
                  {step > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>
        )}
      </header>

      {lock ? (
        <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
            <p
              role="status"
              className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
            >
              This event is {lock}. Preparation and staff assignment are
              read-only.
            </p>
            <Summary
              venue={venue?.venue_name || "Not selected"}
              status={preparationLabels[preparationStatus]}
              registration="Closed"
            />
            <h3 className="text-sm font-bold">Participant instructions</h3>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-600">
              {localInstructions || "No instructions recorded."}
            </p>
          </div>
          <footer className="shrink-0 border-t p-4">
            <button type="button" className={staffButton} onClick={onClose}>
              Close
            </button>
          </footer>
        </>
      ) : completion ? (
        <>
          <div
            ref={content}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5"
          >
            <div className="rounded-2xl bg-emerald-50 p-5 text-center">
              <CheckCircle2
                aria-hidden="true"
                className="mx-auto h-10 w-10 text-emerald-600"
              />
              <h3 className="mt-3 text-lg font-bold text-emerald-950">
                {completion.ready
                  ? "Event is ready"
                  : "Preparation progress saved"}
              </h3>
              <p className="mt-2 text-sm text-emerald-800">
                {completion.ready
                  ? completion.count
                    ? `${completion.count} staff assigned.`
                    : "Staff assignment can be completed later from the event list."
                  : "Return to this event when you are ready to continue."}
              </p>
            </div>
            <Summary
              venue={venue?.venue_name || "Not selected"}
              status={preparationLabels[preparationStatus]}
              registration={effectiveOpen ? "Open" : "Closed"}
            />
            {completion.ready && completion.count === 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                No staff assigned yet. Use Assign Staff on this event before
                attendance processing.
              </p>
            )}
            {completion.warning && (
              <p
                role="status"
                className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
              >
                {completion.warning}
              </p>
            )}
          </div>
          <footer className="flex shrink-0 justify-end gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Link href={returnHref} className={staffButton} onClick={onClose}>
              View Events
            </Link>
            <button
              type="button"
              className={staffPrimaryButton}
              onClick={onClose}
            >
              Done
            </button>
          </footer>
        </>
      ) : step === 3 ? (
        <EventStaffManager
          assignmentId={selectedEvent.id}
          wizard
          onClose={onClose}
          onBack={() => {
            setIssue("");
            setStep(2);
          }}
          onBusyChange={setStaffBusy}
          onComplete={(count, warning) =>
            setCompletion({ ready: true, count, warning })
          }
        />
      ) : (
        <>
          <div
            ref={content}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5"
          >
            {selectedEvent.event?.description && (
              <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  Event description
                </summary>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                  {selectedEvent.event.description}
                </p>
              </details>
            )}
            {issue && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {issue}
              </p>
            )}
            {step === 1 ? (
              <>
                <section>
                  <label
                    htmlFor="municipal-local-venue"
                    className="flex items-center gap-2 text-sm font-bold"
                  >
                    <MapPin
                      className="h-4 w-4 text-indigo-600"
                      aria-hidden="true"
                    />
                    Local venue
                  </label>
                  <select
                    id="municipal-local-venue"
                    className={field}
                    value={selectedVenueId}
                    disabled={busy || venuesLoading}
                    aria-invalid={Boolean(venueError)}
                    aria-describedby="preparation-venue-help"
                    onChange={(e) => {
                      setIssue("");
                      onVenueChange(e.target.value);
                    }}
                  >
                    <option value="">
                      {venuesLoading
                        ? "Loading venues…"
                        : "Select a local venue"}
                    </option>
                    {venues.map((v) => (
                      <option
                        key={v.id}
                        value={v.id}
                        disabled={v.status?.trim().toLowerCase() !== "active"}
                      >
                        {v.venue_name}
                        {v.status?.trim().toLowerCase() !== "active"
                          ? " (Inactive)"
                          : ""}
                        {v.capacity != null ? ` · Capacity: ${v.capacity}` : ""}
                      </option>
                    ))}
                  </select>
                  <p
                    id="preparation-venue-help"
                    className="mt-2 text-xs leading-5 text-slate-500"
                  >
                    Required for Ready. Availability is checked when selecting a
                    venue and again when saving.
                  </p>
                  {venueError && (
                    <p
                      role="alert"
                      className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"
                    >
                      <AlertTriangle className="mr-1 inline h-4 w-4" />
                      {venueError}
                    </p>
                  )}
                  {venue && !venueError && (
                    <p className="mt-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">
                      {venue.venue_name}
                      {venue.capacity != null
                        ? ` · ${venue.capacity} capacity`
                        : ""}
                    </p>
                  )}
                  {!venuesLoading &&
                    !venues.some(
                      (v) => v.status?.trim().toLowerCase() === "active",
                    ) && (
                      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                        No active venues available. Add or activate a venue from
                        Municipal Venues before marking this event Ready.
                      </p>
                    )}
                </section>
                <section>
                  <label
                    htmlFor="municipal-local-instructions"
                    className="text-sm font-bold"
                  >
                    Participant instructions
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {municipal
                      ? "These instructions were set when the municipal event was created. Update them from Municipal Events."
                      : "Explain arrival time, requirements or what participants should bring."}
                  </p>
                  <textarea
                    id="municipal-local-instructions"
                    className={`${field} resize-none leading-6`}
                    rows={4}
                    value={localInstructions}
                    maxLength={2000}
                    readOnly={municipal}
                    disabled={busy}
                    onChange={(e) => {
                      setIssue("");
                      onInstructionsChange(e.target.value);
                    }}
                    placeholder="Example: Arrive 30 minutes early and bring a valid ID."
                    aria-describedby="preparation-instruction-count"
                  />
                  <p
                    id="preparation-instruction-count"
                    className="mt-1 text-right text-xs text-slate-500"
                  >
                    {localInstructions.length} / 2,000
                  </p>
                </section>
              </>
            ) : (
              <>
                <fieldset disabled={busy}>
                  <legend className="text-sm font-bold">
                    Preparation status
                  </legend>
                  <div className="mt-3 grid gap-2">
                    {(
                      [
                        "pending",
                        "preparing",
                        "prepared",
                      ] as PreparationStatus[]
                    ).map((value) => (
                      <label
                        key={value}
                        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm ${preparationStatus === value ? "border-indigo-500 bg-indigo-50 text-indigo-950" : "border-slate-200 text-slate-700"}`}
                      >
                        <input
                          className="h-5 w-5 accent-indigo-600"
                          type="radio"
                          name="preparation-status"
                          value={value}
                          checked={preparationStatus === value}
                          onChange={() => {
                            setIssue("");
                            onStatusChange(value);
                            if (value !== "prepared")
                              onRegistrationChange(false);
                          }}
                        />
                        <span className="flex-1 font-semibold">
                          {preparationLabels[value]}
                        </span>
                        {preparationStatus === value && (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset disabled={busy || !ready}>
                  <legend className="text-sm font-bold">
                    Participant registration
                  </legend>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {ready
                      ? "Choose whether participants can register for this event."
                      : "Registration stays closed until the event is Ready."}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[false, true].map((open) => (
                      <label
                        key={String(open)}
                        className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-3 text-sm ${registrationOpen === open && (ready || !open) ? "border-indigo-500 bg-indigo-50" : "border-slate-200"} ${!ready ? "opacity-60" : "cursor-pointer"}`}
                      >
                        <input
                          type="radio"
                          name="preparation-registration"
                          className="h-5 w-5 accent-indigo-600"
                          checked={ready ? registrationOpen === open : !open}
                          onChange={() => onRegistrationChange(open)}
                        />
                        {open ? "Open" : "Closed"}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Summary
                  venue={venue?.venue_name || "Not selected"}
                  status={preparationLabels[preparationStatus]}
                  registration={effectiveOpen ? "Open" : "Closed"}
                />
                {ready && (
                  <p className="text-xs leading-5 text-slate-500">
                    Save & Continue saves preparation first, then opens staff
                    selection. Participant notifications use the existing save
                    process.
                  </p>
                )}
              </>
            )}
          </div>
          <footer className="shrink-0 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className={staffButton}
                disabled={busy}
                onClick={
                  step === 1
                    ? close
                    : () => {
                        setIssue("");
                        setStep(1);
                      }
                }
              >
                {step === 1 ? (
                  "Cancel"
                ) : (
                  <>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </>
                )}
              </button>
              <button
                type="button"
                className={staffPrimaryButton}
                disabled={busy || venuesLoading}
                onClick={step === 1 ? next : () => void save()}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : step === 1 ? (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : ready ? (
                  "Save & Continue"
                ) : (
                  "Save Progress"
                )}
              </button>
            </div>
          </footer>
        </>
      )}
    </dialog>
  );
}
function Summary({
  venue,
  status,
  registration,
}: {
  venue: string;
  status: string;
  registration: string;
}) {
  return (
    <dl className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-slate-500">Venue</dt>
        <dd className="min-w-0 break-words text-right font-semibold">
          {venue}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-slate-500">Status</dt>
        <dd className="font-semibold">{status}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-slate-500">Registration</dt>
        <dd className="font-semibold">{registration}</dd>
      </div>
    </dl>
  );
}
