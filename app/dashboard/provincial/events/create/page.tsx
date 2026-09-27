"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { MUNICIPALITIES } from "@/lib/municipalities";

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
  const router = useRouter();

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
    if (selectedMunicipalities.length === 0) {
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
    if (!audienceType) {
      alert("Please choose an event audience before saving.");
      return;
    }

    if (audienceType === "categories" && selectedCategories.length === 0) {
      alert("Please select at least one participant category.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter event title.");
      return;
    }

    if (statusToSave === "published") {
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

      if (memoFiles.length === 0) {
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

    setSubmitAction(statusToSave);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not found. Please login again.");
      }

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          start_at: convertToISO(startAt, "start date and time"),
          end_at: convertToISO(endAt, "end date and time"),
          memo_url: null,
          memo_filename: null,
          memo_uploaded_at: null,
          created_by: user.id,
          status: statusToSave,
          audience_type: audienceType,
          audience_categories:
            audienceType === "categories" ? selectedCategories : [],
          audience_category_other:
            audienceType === "categories" &&
            selectedCategories.includes("others") &&
            audienceCategoryOther.trim()
              ? audienceCategoryOther.trim()
              : null,
        })
        .select("id")
        .single();

      if (eventError) {
        throw eventError;
      }

      await Promise.all([
        processMemos(user.id, eventData.id),
        createMunicipalityAssignments(eventData.id),
      ]);

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
              sessionStorage.setItem(
                EMAIL_TRACKING_STORAGE_KEY,
                eventData.id,
              );

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
      setSubmitAction(null);
    }
  };

  const goBackToEvents = () => {
    router.push("/dashboard/provincial/events");
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-24">
      <CreateEventHeader onBack={goBackToEvents} />

      <form onSubmit={(event) => event.preventDefault()} className="space-y-5">
        <EventDetailsSection
          title={title}
          description={description}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
        />

        <EventAudienceSelector
          audienceType={audienceType}
          selectedCategories={selectedCategories}
          audienceCategoryOther={audienceCategoryOther}
          onAudienceTypeChange={changeAudienceType}
          onToggleCategory={toggleAudienceCategory}
          onAudienceCategoryOtherChange={setAudienceCategoryOther}
        />

        <EventScheduleSection
          startAt={startAt}
          endAt={endAt}
          onStartAtChange={setStartAt}
          onEndAtChange={setEndAt}
        />

        <MemoUploadSection
          memoFiles={memoFiles}
          onMemoFilesChange={setMemoFiles}
        />

        <MunicipalitySelector
          municipalities={MUNICIPALITIES}
          selectedMunicipalities={selectedMunicipalities}
          onToggleMunicipality={toggleMunicipality}
          onToggleAll={toggleAllMunicipalities}
        />

        <CreateEventActions
          submitAction={submitAction}
          title={title}
          description={description}
          startAt={startAt}
          endAt={endAt}
          memoCount={memoFiles.length}
          municipalityCount={selectedMunicipalities.length}
          onCancel={goBackToEvents}
          onSaveDraft={() => handleCreateEvent("draft")}
          onPublish={() => handleCreateEvent("published")}
        />
      </form>
    </div>
  );
}