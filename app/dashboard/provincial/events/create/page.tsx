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

type SubmitAction = "draft" | "published" | null;

type UploadedMemo = {
  file_name: string;
  file_url: string;
  file_path: string;
  file_size: number;
  file_type: string | null;
};

export default function CreateProvincialEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [memoFiles, setMemoFiles] = useState<File[]>([]);

  const [selectedMunicipalities, setSelectedMunicipalities] =
    useState<string[]>([]);

  const [submitAction, setSubmitAction] =
    useState<SubmitAction>(null);

  const toggleMunicipality = (municipality: string) => {
    setSelectedMunicipalities((prev) =>
      prev.includes(municipality)
        ? prev.filter((item) => item !== municipality)
        : [...prev, municipality]
    );
  };

  const toggleAllMunicipalities = () => {
    if (
      selectedMunicipalities.length === MUNICIPALITIES.length
    ) {
      setSelectedMunicipalities([]);
    } else {
      setSelectedMunicipalities(MUNICIPALITIES);
    }
  };

  /*
   * Upload all memo files after the event has been created.
   */
  const uploadMemos = async (
    userId: string,
    eventId: string
  ): Promise<UploadedMemo[]> => {
    const uploadedMemos: UploadedMemo[] = [];

    for (let index = 0; index < memoFiles.length; index++) {
      const file = memoFiles[index];

      const safeFileName = file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      );

      const filePath =
        `${userId}/${eventId}/` +
        `${Date.now()}-${index}-${safeFileName}`;

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

      uploadedMemos.push({
        file_name: file.name,
        file_url: publicUrlData.publicUrl,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type || null,
      });
    }

    return uploadedMemos;
  };

  const convertToISO = (value: string, fieldName: string) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid ${fieldName}. Please select the date and time again.`);
    }

    return date.toISOString();
  };

  const handleCreateEvent = async (
    statusToSave: "draft" | "published"
  ) => {
    /*
     * Basic validation
     */
    if (!title.trim()) {
      alert("Please enter event title.");
      return;
    }

    /*
     * Additional requirements before publishing.
     */
    if (statusToSave === "published") {
      if (!description.trim()) {
        alert(
          "Please enter event description before publishing."
        );
        return;
      }

      if (!startAt) {
        alert(
          "Please select start date and time before publishing."
        );
        return;
      }

      if (!endAt) {
        alert(
          "Please select end date and time before publishing."
        );
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
        alert(
          "Event start date and time must be later than the current time."
        );
        return;
      }

      if (endDate <= startDate) {
        alert(
          "End date and time must be after start date and time."
        );
        return;
      }

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        alert("Please select valid start and end date/time.");
        return;
      }

      if (endDate <= startDate) {
        alert(
          "End date and time must be after start date and time."
        );
        return;
      }

      if (memoFiles.length === 0) {
        alert(
          "Please upload at least one official memo before publishing."
        );
        return;
      }

      if (selectedMunicipalities.length === 0) {
        alert(
          "Please select at least one municipality before publishing."
        );
        return;
      }
    }

    /*
     * Also validate schedule when saving a draft if both
     * dates were entered.
     */
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
        alert(
          "End date and time must be after start date and time."
        );
        return;
      }
    }

    setSubmitAction(statusToSave);

    try {
      /*
       * Get logged-in provincial user.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "User not found. Please login again."
        );
      }

      /*
       * STEP 1:
       * Create the event first.
       *
       * Legacy memo_url and memo_filename are initially null.
       * We will later store the first memo there so old pages
       * that still use those columns continue working.
       */
      const { data: eventData, error: eventError } =
        await supabase
          .from("events")
          .insert({
            title: title.trim(),
            description: description.trim() || null,

            start_at: convertToISO(
              startAt,
              "start date and time"
            ),

            end_at: convertToISO(
              endAt,
              "end date and time"
            ),

            memo_url: null,
            memo_filename: null,

            created_by: user.id,
            status: statusToSave,
          })
          .select("id")
          .single();

      if (eventError) {
        throw eventError;
      }

      /*
       * STEP 2:
       * Upload all selected memo files.
       */
      if (memoFiles.length > 0) {
        const uploadedMemos = await uploadMemos(
          user.id,
          eventData.id
        );

        /*
         * STEP 3:
         * Save every uploaded memo into event_memos.
         */
        const memoRows = uploadedMemos.map((memo) => ({
          event_id: eventData.id,
          file_name: memo.file_name,
          file_url: memo.file_url,
          file_path: memo.file_path,
          file_size: memo.file_size,
          file_type: memo.file_type,
        }));

        const { error: memoInsertError } = await supabase
          .from("event_memos")
          .insert(memoRows);

        if (memoInsertError) {
          throw memoInsertError;
        }

        /*
         * Temporary backward compatibility:
         *
         * Keep the FIRST memo inside events.memo_url and
         * events.memo_filename because existing pages may
         * still be using these old columns.
         */
        const firstMemo = uploadedMemos[0];

        const { error: legacyMemoError } = await supabase
          .from("events")
          .update({
            memo_url: firstMemo.file_url,
            memo_filename: firstMemo.file_name,
          })
          .eq("id", eventData.id);

        if (legacyMemoError) {
          console.warn(
            "Legacy memo fields were not updated:",
            legacyMemoError.message
          );
        }
      }

      /*
       * STEP 4:
       * Create municipality assignments.
       */
      if (selectedMunicipalities.length > 0) {
        const municipalityRows =
          selectedMunicipalities.map((municipality) => ({
            event_id: eventData.id,
            municipality,
            municipal_status: "pending",
          }));

        const { error: municipalityError } =
          await supabase
            .from("event_municipalities")
            .insert(municipalityRows);

        if (municipalityError) {
          throw municipalityError;
        }
      }

      /*
       * Success
       */
      alert(
        statusToSave === "draft"
          ? "Event saved as draft."
          : "Event published successfully."
      );

      router.push("/dashboard/provincial/events");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save event.";

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

      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-5"
      >
        <EventDetailsSection
          title={title}
          description={description}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
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
          selectedMunicipalities={
            selectedMunicipalities
          }
          onToggleMunicipality={
            toggleMunicipality
          }
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
          onSaveDraft={() =>
            handleCreateEvent("draft")
          }
          onPublish={() =>
            handleCreateEvent("published")
          }
        />
      </form>
    </div>
  );
}