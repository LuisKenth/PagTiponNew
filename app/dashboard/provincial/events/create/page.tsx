"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { MUNICIPALITIES } from "@/lib/municipalities";

import CertificateOption from "@/app/components/certificates/CertificateOption";
import CreateEventHeader from "./components/CreateEventHeader";
import EventDetailsSection from "./components/EventDetailsSection";
import EventScheduleSection from "./components/EventScheduleSection";
import MemoUploadSection from "./components/MemoUploadSection";
import MunicipalitySelector from "./components/MunicipalitySelector";
import CreateEventActions from "./components/CreateEventActions";
import EventAudienceSelector from "./components/EventAudienceSelector";

type SubmitAction = "draft" | "published" | null;
type AudienceType = "all" | "categories" | null;

type UploadedMemo = {
  file_name: string;
  file_url: string;
  file_path: string;
  file_size: number;
  file_type: string | null;
};

type EventEmailResult = {
  message?: string;
  eventId?: string;
  eventTitle?: string;
  municipalities?: string[];
  totalRecipients?: number;
  sent?: number;
  failed?: string[];
  queued?: number;
  background?: boolean;
  tracking?: boolean;
  provider?: string;
  error?: string;
};

const EMAIL_TRACKING_STORAGE_KEY = "pagtipon_pending_event_email_id";
const EMAIL_TRACKING_EVENT = "pagtipon:event-email-tracking";

export default function CreateProvincialEventPage() {
  return (
    <Suspense fallback={<p role="status">Loading event form…</p>}>
      <CreateEventRoute />
    </Suspense>
  );
}
function CreateEventRoute() {
  const requested = useSearchParams().get("id");
  return <CreateEventForm key={requested ?? ""} requested={requested} />;
}
function CreateEventForm({ requested }: { requested: string | null }) {
  const router = useRouter();
  const [draftId, setDraftId] = useState<string | null>(requested);
  const [draftLoading, setDraftLoading] = useState(Boolean(requested));
  const [draftError, setDraftError] = useState("");
  const [savedMemos, setSavedMemos] = useState<
    { file_name: string; file_url: string }[]
  >([]);
  const revision = useRef<string | null>(null);
  const saving = useRef(false);

  const [certificatesEnabled, setCertificatesEnabled] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [memoFiles, setMemoFiles] = useState<File[]>([]);
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<
    string[]
  >([]);
  const [audienceType, setAudienceType] = useState<AudienceType>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [audienceCategoryOther, setAudienceCategoryOther] = useState("");
  const [submitAction, setSubmitAction] = useState<SubmitAction>(null);

  useEffect(() => {
    let active = true;
    if (!requested) return;
    void (async () => {
      try {
        const [eventResult, assignments, memos] = await Promise.all([
          supabase
            .from("events")
            .select("*")
            .eq("id", requested)
            .eq("event_origin", "provincial")
            .eq("status", "draft")
            .single(),
          supabase
            .from("event_municipalities")
            .select("municipality")
            .eq("event_id", requested),
          supabase
            .from("event_memos")
            .select("file_name,file_url")
            .eq("event_id", requested),
        ]);
        if (eventResult.error || assignments.error || memos.error)
          throw new Error(
            "Unable to load this draft. Check your connection and access, then try again.",
          );
        if (!active) return;
        const e = eventResult.data;
        const local = (value: string | null) => {
          if (!value) return "";
          const date = new Date(value);
          return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        };
        setCertificatesEnabled(e.certificates_enabled === true);
        setTitle(e.title || "");
        setDescription(e.description || "");
        setStartAt(local(e.start_at));
        setEndAt(local(e.end_at));
        setAudienceType(e.audience_type);
        setSelectedCategories(e.audience_categories || []);
        setAudienceCategoryOther(e.audience_category_other || "");
        setSelectedMunicipalities(
          (assignments.data || []).map((a) => a.municipality),
        );
        setSavedMemos(
          memos.data?.length
            ? memos.data
            : e.memo_url
              ? [
                  {
                    file_name: e.memo_filename || "Official memo",
                    file_url: e.memo_url,
                  },
                ]
              : [],
        );
        revision.current = e.updated_at;
      } catch (e) {
        if (active)
          setDraftError(
            e instanceof Error ? e.message : "Unable to load draft.",
          );
      } finally {
        if (active) setDraftLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [requested]);

  const toggleMunicipality = (municipality: string) => {
    setSelectedMunicipalities((previous) =>
      previous.includes(municipality)
        ? previous.filter((item) => item !== municipality)
        : [...previous, municipality],
    );
  };

  const toggleAllMunicipalities = () => {
    if (selectedMunicipalities.length === MUNICIPALITIES.length) {
      setSelectedMunicipalities([]);
    } else {
      setSelectedMunicipalities(MUNICIPALITIES);
    }
  };

  const changeAudienceType = (value: AudienceType) => {
    setAudienceType(value);

    if (value !== "categories") {
      setSelectedCategories([]);
      setAudienceCategoryOther("");
    }
  };

  const toggleAudienceCategory = (category: string) => {
    const wasSelected = selectedCategories.includes(category);

    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );

    if (category === "others" && wasSelected) {
      setAudienceCategoryOther("");
    }
  };

  const uploadMemos = async (
    userId: string,
    eventId: string,
  ): Promise<UploadedMemo[]> => {
    const uploadTimestamp = Date.now();

    return Promise.all(
      memoFiles.map(async (file, index) => {
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath =
          `provincial-memos/${userId}/${eventId}/` +
          `${uploadTimestamp}-${index}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("official-memos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("official-memos")
          .getPublicUrl(filePath);

        return {
          file_name: file.name,
          file_url: publicUrlData.publicUrl,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type || null,
        };
      }),
    );
  };

  const processMemos = async (userId: string, eventId: string) => {
    if (memoFiles.length === 0) {
      return;
    }

    const uploadedMemos = await uploadMemos(userId, eventId);

    const memoRows = uploadedMemos.map((memo) => ({
      event_id: eventId,
      file_name: memo.file_name,
      file_url: memo.file_url,
      file_path: memo.file_path,
      file_size: memo.file_size,
      file_type: memo.file_type,
    }));

    const firstMemo = uploadedMemos[0];

    const [memoInsertResult, legacyMemoResult] = await Promise.all([
      supabase.from("event_memos").insert(memoRows),
      supabase
        .from("events")
        .update({
          memo_url: firstMemo.file_url,
          memo_filename: firstMemo.file_name,
          memo_uploaded_at: new Date().toISOString(),
        })
        .eq("id", eventId),
    ]);

    if (memoInsertResult.error) {
      throw memoInsertResult.error;
    }

    if (legacyMemoResult.error) {
      console.warn(
        "Legacy memo fields were not updated:",
        legacyMemoResult.error.message,
      );
    }
  };

  const createMunicipalityAssignments = async (eventId: string) => {
    if (selectedMunicipalities.length === 0 && !draftId) {
      return;
    }

    if (draftId) {
      const { data: existing, error } = await supabase
        .from("event_municipalities")
        .select("id,municipality")
        .eq("event_id", eventId);
      if (error) throw error;
      const removed = (existing || [])
        .filter((a) => !selectedMunicipalities.includes(a.municipality))
        .map((a) => a.id);
      if (removed.length) {
        const { error } = await supabase
          .from("event_municipalities")
          .delete()
          .in("id", removed)
          .eq("event_id", eventId);
        if (error) throw error;
      }
      const added = selectedMunicipalities.filter(
        (m) => !(existing || []).some((a) => a.municipality === m),
      );
      if (added.length) {
        const { error } = await supabase.from("event_municipalities").insert(
          added.map((municipality) => ({
            event_id: eventId,
            municipality,
            municipal_status: "pending",
            preparation_status: "pending",
          })),
        );
        if (error) throw error;
      }
      return;
    }
    const municipalityRows = selectedMunicipalities.map((municipality) => ({
      event_id: eventId,
      municipality,
      municipal_status: "pending",
      preparation_status: "pending",
    }));

    const { error: municipalityError } = await supabase
      .from("event_municipalities")
      .insert(municipalityRows);

    if (municipalityError) {
      throw municipalityError;
    }
  };

  const convertToISO = (value: string, fieldName: string) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        `Invalid ${fieldName}. Please select the date and time again.`,
      );
    }

    return date.toISOString();
  };

  const handleCreateEvent = async (statusToSave: "draft" | "published") => {
    if (saving.current || submitAction !== null || draftLoading || draftError)
      return;

    if (!title.trim()) {
      alert("Please enter event title.");
      return;
    }

    if (statusToSave === "published") {
      if (!audienceType) {
        alert("Please choose an event audience before publishing.");
        return;
      }

      if (audienceType === "categories" && selectedCategories.length === 0) {
        alert("Please select at least one participant category.");
        return;
      }

      if (!description.trim()) {
        alert("Please enter event description before publishing.");
        return;
      }

      if (!startAt) {
        alert("Please select start date and time before publishing.");
        return;
      }

      if (!endAt) {
        alert("Please select end date and time before publishing.");
        return;
      }

      const startDate = new Date(startAt);
      const endDate = new Date(endAt);
      const currentDate = new Date();

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        alert("Please select a valid event schedule.");
        return;
      }

      if (startDate <= currentDate) {
        alert("Event start date and time must be later than the current time.");
        return;
      }

      if (endDate <= startDate) {
        alert("End date and time must be after start date and time.");
        return;
      }

      if (memoFiles.length + savedMemos.length === 0) {
        alert("Please upload at least one official memo before publishing.");
        return;
      }

      if (selectedMunicipalities.length === 0) {
        alert("Please select at least one municipality before publishing.");
        return;
      }
    }

    if (startAt && endAt) {
      const startDate = new Date(startAt);
      const endDate = new Date(endAt);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        alert("Please select valid start and end date/time.");
        return;
      }

      if (endDate <= startDate) {
        alert("End date and time must be after start date and time.");
        return;
      }
    }

    saving.current = true;
    setSubmitAction(statusToSave);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not found. Please login again.");
      }

      const payload = {
        certificates_enabled: certificatesEnabled,
        title: title.trim(),
        description: description.trim() || null,
        start_at: convertToISO(startAt, "start date and time"),
        end_at: convertToISO(endAt, "end date and time"),
        status: "draft",
        audience_type: audienceType,
        audience_categories:
          audienceType === "categories" ? selectedCategories : [],
        audience_category_other:
          audienceType === "categories" &&
          selectedCategories.includes("others") &&
          audienceCategoryOther.trim()
            ? audienceCategoryOther.trim()
            : null,
      };
      let query;
      if (draftId) {
        query = supabase
          .from("events")
          .update(payload)
          .eq("id", draftId)
          .eq("status", "draft")
          .eq("event_origin", "provincial");
        if (revision.current) query = query.eq("updated_at", revision.current);
      } else {
        query = supabase
          .from("events")
          .insert({ ...payload, created_by: user.id });
      }
      const { data: eventData, error: eventError } = await query
        .select("id,updated_at")
        .single();
      if (eventError) {
        throw eventError;
      }

      setDraftId(eventData.id);
      revision.current = eventData.updated_at;
      await Promise.all([
        processMemos(user.id, eventData.id),
        createMunicipalityAssignments(eventData.id),
      ]);

      if (statusToSave === "published") {
        const { error } = await supabase
          .from("events")
          .update({ status: "published" })
          .eq("id", eventData.id)
          .eq("status", "draft")
          .select("id")
          .single();
        if (error) throw error;
      }

      let emailResult: EventEmailResult | null = null;
      let emailNotificationFailed = false;

      if (statusToSave === "published") {
        try {
          const { data, error: emailError } =
            await supabase.functions.invoke<EventEmailResult>(
              "send-event-email",
              {
                body: {
                  eventId: eventData.id,
                  notificationType: "event_published",
                },
              },
            );

          if (emailError) {
            emailNotificationFailed = true;
            console.warn(
              "Event published, but email notification request failed:",
              emailError.message,
            );
          } else {
            emailResult = data ?? null;

            if (
              emailResult?.background === true &&
              emailResult?.tracking === true
            ) {
              sessionStorage.setItem(EMAIL_TRACKING_STORAGE_KEY, eventData.id);

              window.dispatchEvent(
                new CustomEvent(EMAIL_TRACKING_EVENT, {
                  detail: {
                    eventId: eventData.id,
                  },
                }),
              );
            }

            if (
              Array.isArray(emailResult?.failed) &&
              emailResult.failed.length > 0
            ) {
              console.warn("Some event emails failed:", emailResult.failed);
            }
          }
        } catch (emailError) {
          emailNotificationFailed = true;
          console.warn(
            "Event published, but email notification request failed:",
            emailError,
          );
        }
      }

      if (statusToSave === "draft") {
        alert("Event saved as draft.");
        router.push("/dashboard/provincial/events");
        router.refresh();
        return;
      }

      if (emailNotificationFailed) {
        console.warn(
          "Event published successfully, but email notification could not be started.",
        );
      } else if (emailResult?.background === true) {
        console.info(
          `Event published successfully. ${
            emailResult.queued ?? 0
          } email notification(s) queued for background delivery.`,
        );
      }

      router.push("/dashboard/provincial/events");
      router.refresh();
      return;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save event.";

      console.error("Create event error:", message);
      alert(message);
    } finally {
      saving.current = false;
      setSubmitAction(null);
    }
  };

  const goBackToEvents = () => {
    router.push("/dashboard/provincial/events");
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-8">
      <CreateEventHeader
        editing={Boolean(draftId)}
        onBack={goBackToEvents}
        disabled={submitAction !== null}
      />
      {draftLoading ? (
        <p role="status">Loading event form…</p>
      ) : draftError ? (
        <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">
          {draftError}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <fieldset
              disabled={submitAction !== null}
              className="min-w-0 space-y-5 disabled:opacity-70"
            >
              <legend className="sr-only">Event information</legend>
              <EventDetailsSection
                title={title}
                description={description}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
              />
              <CertificateOption
                enabled={certificatesEnabled}
                onChange={setCertificatesEnabled}
                disabled={Boolean(submitAction)}
              />
              <EventScheduleSection
                startAt={startAt}
                endAt={endAt}
                onStartAtChange={setStartAt}
                onEndAtChange={setEndAt}
              />
              <EventAudienceSelector
                audienceType={audienceType}
                selectedCategories={selectedCategories}
                audienceCategoryOther={audienceCategoryOther}
                onAudienceTypeChange={changeAudienceType}
                onToggleCategory={toggleAudienceCategory}
                onAudienceCategoryOtherChange={setAudienceCategoryOther}
              />
              <MunicipalitySelector
                municipalities={MUNICIPALITIES}
                selectedMunicipalities={selectedMunicipalities}
                onToggleMunicipality={toggleMunicipality}
                onToggleAll={toggleAllMunicipalities}
              />
              {savedMemos.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="font-semibold">Saved Official Memos</h2>
                  <ul className="mt-3 space-y-2">
                    {savedMemos.map((memo, index) => (
                      <li key={index}>
                        <a
                          className="text-sm text-indigo-700 underline"
                          href={memo.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {memo.file_name}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-slate-500">
                    Saved memos are retained. You can add more below.
                  </p>
                </section>
              )}
              <MemoUploadSection
                memoFiles={memoFiles}
                onMemoFilesChange={setMemoFiles}
              />
            </fieldset>
            <aside
              aria-label="Event review"
              className="min-w-0 space-y-4 xl:sticky xl:top-6"
            >
              <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Event at a glance
                </p>
                <h2 className="mt-3 break-words text-lg font-bold text-slate-900">
                  {title.trim() || "Your new event"}
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Audience</dt>
                    <dd className="mt-1 break-words text-slate-800">
                      {audienceType === "all"
                        ? "Open to all participants"
                        : audienceType === "categories"
                          ? selectedCategories.length
                            ? selectedCategories.join(", ")
                            : "Select participant categories"
                          : "Not selected"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Municipalities</dt>
                    <dd className="font-semibold text-slate-800">
                      {selectedMunicipalities.length} / {MUNICIPALITIES.length}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Official memos</dt>
                    <dd className="font-semibold text-slate-800">
                      {memoFiles.length + savedMemos.length}
                    </dd>
                  </div>
                </dl>
              </section>
              <CreateEventActions
                draftSaveLabel={
                  draftId ? "Save Draft Changes" : "Save as Draft"
                }
                submitAction={submitAction}
                title={title}
                description={description}
                startAt={startAt}
                endAt={endAt}
                memoCount={memoFiles.length + savedMemos.length}
                municipalityCount={selectedMunicipalities.length}
                audienceComplete={
                  audienceType === "all" ||
                  (audienceType === "categories" &&
                    selectedCategories.length > 0)
                }
                onCancel={goBackToEvents}
                onSaveDraft={() => handleCreateEvent("draft")}
                onPublish={() => handleCreateEvent("published")}
              />
            </aside>
          </div>
        </form>
      )}
    </div>
  );
}
