"use client";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarPlus,
  MapPin,
  FileText,
  FilePenLine,
} from "lucide-react";
import EventDetailsSection from "@/app/dashboard/provincial/events/create/components/EventDetailsSection";
import EventScheduleSection from "@/app/dashboard/provincial/events/create/components/EventScheduleSection";
import CreateEventActions from "@/app/dashboard/provincial/events/create/components/CreateEventActions";
import EventAudienceSelector from "@/app/dashboard/provincial/events/create/components/EventAudienceSelector";
import VenueLocationButton from "@/app/components/VenueLocationButton";
import {
  municipalEventRequest,
  phInput,
  phISO,
} from "@/lib/municipal-events/client";
import type {
  MunicipalEvent,
  EventVenue,
  EventPayload,
} from "@/lib/municipal-events/types";
const field =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 text-sm outline-none focus-visible:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200";
export default function MunicipalEventForm({
  draftId,
  onClose,
  onSaved,
}: { draftId?: string; onClose?: () => void; onSaved?: () => void } = {}) {
  const router = useRouter();
  const [submitAction, setSubmitAction] = useState<
    "draft" | "published" | null
  >(null);
  const query = useSearchParams();
  const requestedId = draftId ?? query.get("id");
  const id = useRef<string | null>(requestedId);
  const loadGeneration = useRef(0);
  const [record, setRecord] = useState<MunicipalEvent | null>(null),
    [venues, setVenues] = useState<EventVenue[]>([]),
    [municipality, setMunicipality] = useState("");
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [venueId, setVenueId] = useState(""),
    [instructions, setInstructions] = useState("");
  const [audience, setAudience] = useState<"all" | "categories" | null>(null),
    [categories, setCategories] = useState<string[]>([]),
    [other, setOther] = useState("");
  const [document, setDocument] = useState<File | null>(null),
    [approved, setApproved] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const successDialog = useRef<HTMLDialogElement>(null),
    saving = useRef(false);
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    id.current = requestedId;
    setRecord(null);
    setMunicipality("");
    setTitle("");
    setDescription("");
    setStart("");
    setEnd("");
    setVenueId("");
    setInstructions("");
    setAudience(null);
    setCategories([]);
    setOther("");
    setDocument(null);
    setApproved(false);
    setLoading(true);
    setError("");
    try {
      const result = await municipalEventRequest(
        "/api/municipal/events" +
          (requestedId ? `?id=${encodeURIComponent(requestedId)}` : ""),
      );
      if (generation !== loadGeneration.current) return;
      setMunicipality(result.municipality);
      setVenues(result.venues);
      if (requestedId) {
        const e = result.events[0] as MunicipalEvent | undefined;
        if (!e) throw new Error("Event is unavailable in your municipality.");
        setRecord(e);
        setTitle(e.title);
        setDescription(e.description || "");
        setStart(phInput(e.start_at));
        setEnd(phInput(e.end_at));
        setVenueId(e.event_municipalities[0]?.local_venue_id || "");
        setInstructions(e.event_municipalities[0]?.local_instructions || "");
        setAudience(e.audience_type);
        setCategories(e.audience_categories);
        setOther(e.audience_category_other || "");
      }
    } catch (e) {
      if (generation === loadGeneration.current)
        setError(e instanceof Error ? e.message : "Unable to load event.");
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [requestedId]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(timer);
      ++loadGeneration.current;
    };
  }, [load]);
  const readOnly = Boolean(record && record.status !== "draft");
  async function save(action: "draft" | "published") {
    if (saving.current || loading || readOnly || (requestedId && !record))
      return;
    if (!title.trim()) {
      setError("Enter the event title before saving.");
      return;
    }
    if (
      action === "published" &&
      (!description.trim() ||
        !start ||
        !end ||
        !venueId ||
        !audience ||
        !approved ||
        (!document && !record?.memo_url))
    ) {
      setError(
        "Complete the description, audience, schedule, venue, approved document and confirmation before publishing.",
      );
      return;
    }
    saving.current = true;
    setBusy(true);
    setSubmitAction(action);
    setError("");
    try {
      id.current ??= crypto.randomUUID();
      const payload: EventPayload = {
        action,
        title: title.trim().toUpperCase(),
        description,
        start_at: phISO(start),
        end_at: phISO(end),
        audience_type: audience,
        audience_categories: audience === "categories" ? categories : [],
        audience_category_other: other,
        venue_id: venueId,
        local_instructions: instructions,
        approval_confirmed: approved,
      };
      const form = new FormData();
      form.set("id", id.current);
      form.set("payload", JSON.stringify(payload));
      if (record) form.set("expected", record.updated_at);
      if (document) form.set("document", document);
      const result = await municipalEventRequest("/api/municipal/events", {
        method: "POST",
        body: form,
      });
      // Keep the server revision for the next save; selected venue remains in form state.
      const event = result.event as MunicipalEvent;
      setRecord({
        ...event,
        event_municipalities: record?.event_municipalities ?? [],
      });
      setDocument(null);
      setSuccess(
        action === "draft"
          ? "Draft saved successfully. You can continue editing now or return to Municipal Events later."
          : "Event published successfully. Next, confirm its preparation as Ready, then assign Event Staff for attendance.",
      );
      if (onSaved) onSaved();
      else successDialog.current?.showModal();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save event. Check the event list before retrying.",
      );
    } finally {
      setBusy(false);
      setSubmitAction(null);
      saving.current = false;
    }
  }
  return (
    <div className="space-y-6">
      <MunicipalPageHeader
        icon={<CalendarPlus size={22} />}
        eyebrow="Municipal event management"
        title={requestedId ? "Edit Municipal Event" : "Create Municipal Event"}
        description={`Plan an event for ${municipality || "your municipality"}. Municipal approval is recorded through the uploaded document.`}
        footer={
          <>
            <FilePenLine className="h-4 w-4 shrink-0" aria-hidden="true" />{" "}
            Complete the sections below, then review your event before
            publishing.
          </>
        }
        actions={
          onClose ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={busy}
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <Link
              href="/dashboard/municipal/local-events"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back to Events
            </Link>
          )
        }
      />
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
        >
          {error}{" "}
          {loading
            ? null
            : !municipality && (
                <button
                  type="button"
                  onClick={() => void load()}
                  className="ml-3 underline"
                >
                  Try again
                </button>
              )}
        </div>
      )}
      {loading ? (
        <p role="status">Loading event details…</p>
      ) : (
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <fieldset
            disabled={
              busy ||
              readOnly ||
              !municipality ||
              Boolean(requestedId && !record)
            }
            className="space-y-6 disabled:opacity-75"
          >
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-6">
                <EventDetailsSection
                  scope="municipal"
                  title={title}
                  description={description}
                  onTitleChange={setTitle}
                  onDescriptionChange={setDescription}
                />
                <EventScheduleSection
                  scope="municipal"
                  startAt={start}
                  endAt={end}
                  onStartAtChange={setStart}
                  onEndAtChange={setEnd}
                />
                <EventAudienceSelector
                  audienceType={audience}
                  selectedCategories={categories}
                  audienceCategoryOther={other}
                  onAudienceTypeChange={(value) => {
                    setAudience(value);
                    if (value !== "categories") {
                      setCategories([]);
                      setOther("");
                    }
                  }}
                  onToggleCategory={(category) => {
                    setCategories((old) =>
                      old.includes(category)
                        ? old.filter((c) => c !== category)
                        : [...old, category],
                    );
                    if (category === "others") setOther("");
                  }}
                  onAudienceCategoryOtherChange={setOther}
                />
                <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <MapPin size={19} />
                    </span>
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        Venue & Local Instructions
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Choose a venue in {municipality} and add participant
                        reminders.
                      </p>
                    </div>
                  </div>
                  <label htmlFor="municipal-venue">
                    Venue in {municipality}
                    <select
                      id="municipal-venue"
                      className={field}
                      value={venueId}
                      onChange={(e) => setVenueId(e.target.value)}
                    >
                      <option value="">Select a venue</option>
                      {venues
                        .filter(
                          (v) => v.status === "active" || v.id === venueId,
                        )
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.venue_name} · {v.capacity} capacity
                            {v.status !== "active" ? " (inactive)" : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                  {venueId && (
                    <VenueLocationButton
                      venueId={venueId}
                      label="View venue map & photos"
                    />
                  )}
                  {!venues.some((v) => v.status === "active") && (
                    <p className="text-sm text-amber-800">
                      Add an active venue with capacity in Venues before
                      publishing.
                    </p>
                  )}
                  <label className="block" htmlFor="municipal-instructions">
                    Local instructions (optional)
                    <textarea
                      id="municipal-instructions"
                      rows={3}
                      maxLength={2000}
                      className={field}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                  </label>
                  <p className="text-right text-xs text-slate-400">
                    {instructions.length} / 2,000 characters
                  </p>
                </section>
                <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <FileText size={19} />
                    </span>
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        Approved Municipal Memo / Activity Design
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Required before publishing · PDF up to 3 MB
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Upload a PDF approved through your municipality’s process.
                    This upload records your confirmation; PagTipon does not
                    verify signatures or grant municipal approval.
                  </p>
                  {record?.memo_url && (
                    <a
                      href={record.memo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-indigo-700 underline"
                    >
                      Saved document: {record.memo_filename}
                    </a>
                  )}
                  <label className="block" htmlFor="municipal-document">
                    Approval document · PDF, up to 3 MB
                    <input
                      id="municipal-document"
                      type="file"
                      accept="application/pdf,.pdf"
                      className={field}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (
                          file &&
                          (file.type !== "application/pdf" ||
                            file.size > 3 * 1024 * 1024)
                        ) {
                          setError("Choose a PDF no larger than 3 MB.");
                          e.target.value = "";
                          setDocument(null);
                        } else {
                          setDocument(file ?? null);
                          setError("");
                        }
                      }}
                    />
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      id="municipal-approval"
                      type="checkbox"
                      checked={approved}
                      onChange={(e) => setApproved(e.target.checked)}
                      className="mt-1"
                    />
                    I confirm that the uploaded memo or activity design has been
                    approved through our municipality’s process.
                  </label>
                </section>
              </div>
              <aside className="min-w-0 xl:sticky xl:top-6">
                <CreateEventActions
                  submitAction={submitAction}
                  title={title}
                  description={description}
                  startAt={start}
                  endAt={end}
                  memoCount={document || record?.memo_url ? 1 : 0}
                  municipalityCount={1}
                  audienceComplete={Boolean(audience)}
                  onCancel={() =>
                    onClose
                      ? onClose()
                      : router.push("/dashboard/municipal/local-events")
                  }
                  onSaveDraft={() => void save("draft")}
                  onPublish={() => void save("published")}
                  footerText={`Publishing makes this event available in ${municipality}. Registration remains closed until you open it using Manage Preparation.`}
                  requirementsOverride={[
                    { label: "Event title", complete: Boolean(title.trim()) },
                    {
                      label: "Event description",
                      complete: Boolean(description.trim()),
                    },
                    {
                      label: "Participant audience",
                      complete:
                        audience === "all" ||
                        (audience === "categories" &&
                          categories.length > 0 &&
                          (!categories.includes("others") ||
                            Boolean(other.trim()))),
                    },
                    {
                      label: "Event schedule",
                      complete: Boolean(start && end && end > start),
                    },
                    {
                      label: "Active municipal venue",
                      complete: venues.some(
                        (v) =>
                          v.id === venueId &&
                          v.status === "active" &&
                          v.capacity > 0,
                      ),
                    },
                    {
                      label: "Approved PDF document",
                      complete: Boolean(document || record?.memo_url),
                    },
                    {
                      label: "Municipal approval confirmation",
                      complete: approved,
                    },
                  ]}
                />
              </aside>
            </div>
          </fieldset>
          {readOnly && (
            <p className="rounded-xl bg-blue-50 p-4 text-blue-900">
              This event is {record?.status}. Use Manage Preparation on the
              event card to manage registration and local operations.
            </p>
          )}
        </form>
      )}
      <dialog
        ref={successDialog}
        className="m-auto max-w-md rounded-2xl p-6 shadow-xl backdrop:bg-slate-950/50"
        style={{ width: "calc(100% - 2rem)" }}
        aria-labelledby="municipal-save-success"
      >
        <h2 id="municipal-save-success" className="text-xl font-bold">
          {record?.status === "draft" ? "Draft saved" : "Event published"}
        </h2>
        <p role="status" className="my-4 text-slate-600">
          {success}
        </p>
        <div className="flex flex-wrap gap-3">
          {record?.status !== "draft" && record?.id && <Link className="rounded-xl bg-indigo-600 px-4 py-2 text-white" href={`/dashboard/municipal/local-events?prepareEvent=${encodeURIComponent(record.id)}`}>Continue to Preparation</Link>}
          <button
            type="button"
            autoFocus
            className="rounded-xl border px-4 py-2"
            onClick={() => successDialog.current?.close()}
          >
            OK
          </button>
          <Link
            className="rounded-xl bg-indigo-600 px-4 py-2 text-white"
            href="/dashboard/municipal/local-events"
          >
            View Municipal Events
          </Link>
        </div>
      </dialog>
    </div>
  );
}
