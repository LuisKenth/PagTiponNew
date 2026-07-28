"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  getAutomaticEventStatus,
  getStatusClass,
} from "../../utils";

const municipalitiesList = [
  "Anini-y",
  "Barbaza",
  "Belison",
  "Bugasong",
  "Caluya",
  "Culasi",
  "Hamtic",
  "Laua-an",
  "Libertad",
  "Pandan",
  "Patnongon",
  "San Jose de Buenavista",
  "San Remigio",
  "Sebaste",
  "Sibalom",
  "Tibiao",
  "Tobias Fornier",
  "Valderrama",
];

const MEMO_BUCKET = "official-memos";

/*
 * Converts an existing public Storage URL back
 * into the path inside the official-memos bucket.
 *
 * Used as a fallback for older/legacy memo records.
 */
function getStoragePathFromPublicUrl(
  url: string | null
) {
  if (!url) {
    return null;
  }

  const marker =
    `/storage/v1/object/public/${MEMO_BUCKET}/`;

  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(
    url.slice(markerIndex + marker.length)
  );
}

type EventItem = {
  id: string;
  title: string | null;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  memo_url: string | null;
  memo_filename: string | null;
  status: string | null;
};

type EventMunicipality = {
  id: string;
  event_id: string;
  municipality: string;
  preparation_status?: string | null;
};

function toDatetimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return localDate
    .toISOString()
    .slice(0, 16);
}

export default function EditProvincialEventPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = params.id as string;

  /*
   * EVENT DETAILS
   */
  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [startAt, setStartAt] =
    useState("");

  const [endAt, setEndAt] =
    useState("");

  /*
   * EVENT STATUS
   */
  const [status, setStatus] =
    useState("draft");

  /*
   * MEMO
   */
  const [memoUrl, setMemoUrl] =
    useState<string | null>(null);

  const [
    memoFilename,
    setMemoFilename,
  ] = useState<string | null>(null);

  const [
    newMemoFile,
    setNewMemoFile,
  ] = useState<File | null>(null);

  /*
   * MUNICIPALITIES
   */
  const [
    selectedMunicipalities,
    setSelectedMunicipalities,
  ] = useState<string[]>([]);

  /*
   * PAGE STATES
   */
  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  /*
   * When this has a value, editing is completely blocked.
   *
   * ongoing
   * completed
   * cancelled
   */
  const [
    lockedStatus,
    setLockedStatus,
  ] = useState<string | null>(null);

  /*
   * FETCH EVENT
   */
  const fetchEvent = async () => {
    setLoading(true);

    const {
      data: eventData,
      error: eventError,
    } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError) {
      console.error(
        "Event fetch error:",
        eventError.message
      );

      alert("Failed to load event.");

      setLoading(false);

      router.push(
        "/dashboard/provincial/events"
      );

      return;
    }

    const event =
      eventData as EventItem;

    /*
     * Calculate the real event status based on:
     *
     * draft / cancelled
     * start_at
     * end_at
     */
    const automaticStatus =
      getAutomaticEventStatus(
        event,
        Date.now()
      );

    /*
     * LOCK RULE
     *
     * Ongoing   → cannot edit
     * Completed → cannot edit
     * Cancelled → cannot edit
     *
     * Draft     → editable
     * Upcoming  → editable
     */
    if (
      automaticStatus === "ongoing" ||
      automaticStatus === "completed" ||
      automaticStatus === "cancelled"
    ) {
      setLockedStatus(
        automaticStatus
      );
    } else {
      setLockedStatus(null);
    }

    setTitle(
      event.title || ""
    );

    setDescription(
      event.description || ""
    );

    setStartAt(
      toDatetimeLocal(
        event.start_at
      )
    );

    setEndAt(
      toDatetimeLocal(
        event.end_at
      )
    );

    setStatus(
      automaticStatus
    );

    setMemoUrl(
      event.memo_url
    );

    setMemoFilename(
      event.memo_filename
    );

    /*
     * FETCH MUNICIPALITY ASSIGNMENTS
     */
    const {
      data: municipalityData,
      error: municipalityError,
    } = await supabase
      .from(
        "event_municipalities"
      )
      .select("*")
      .eq(
        "event_id",
        eventId
      );

    if (municipalityError) {
      console.error(
        "Municipality fetch error:",
        municipalityError.message
      );

      setSelectedMunicipalities(
        []
      );
    } else {
      const selected = (
        municipalityData as EventMunicipality[]
      ).map(
        (item) =>
          item.municipality
      );

      setSelectedMunicipalities(
        selected
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  /*
   * MUNICIPALITY SELECTION
   */
  const toggleMunicipality = (
    municipality: string
  ) => {
    setSelectedMunicipalities(
      (previous) =>
        previous.includes(
          municipality
        )
          ? previous.filter(
              (item) =>
                item !==
                municipality
            )
          : [
              ...previous,
              municipality,
            ]
    );
  };

  const handleSelectAll = () => {
    if (
      selectedMunicipalities.length ===
      municipalitiesList.length
    ) {
      setSelectedMunicipalities(
        []
      );
    } else {
      setSelectedMunicipalities(
        municipalitiesList
      );
    }
  };

  /*
   * MEMO UPLOAD
   */
  const uploadMemoIfNeeded =
    async () => {
      if (!newMemoFile) {
        return {
          url: memoUrl,
          filename:
            memoFilename,
          filePath: null,
          fileSize: null,
          fileType: null,
          isNew: false,
        };
      }

      /*
       * Keep the original filename readable
       * inside Supabase Storage.
       */
      const safeFileName =
        newMemoFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

      const filePath =
        `provincial-memos/${eventId}/` +
        `${Date.now()}-${safeFileName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from(MEMO_BUCKET)
        .upload(
          filePath,
          newMemoFile,
          {
            cacheControl:
              "3600",
            upsert: false,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const { data } =
        supabase.storage
          .from(MEMO_BUCKET)
          .getPublicUrl(
            filePath
          );

      return {
        url:
          data.publicUrl,

        filename:
          newMemoFile.name,

        filePath,

        fileSize:
          newMemoFile.size,

        fileType:
          newMemoFile.type ||
          null,

        isNew: true,
      };
    };

  /*
   * UPDATE EVENT
   */
  const handleUpdateEvent =
    async (
      statusToSave:
        | "draft"
        | "published"
    ) => {
      /*
       * IMPORTANT:
       *
       * Re-read the event before saving.
       *
       * Example:
       * User opened edit page at 7:59 PM
       * Event starts at 8:00 PM
       * User clicks Save at 8:01 PM
       *
       * The save must be rejected because
       * the event is already ongoing.
       */
      const {
        data: latestEventData,
        error:
          latestEventError,
      } = await supabase
        .from("events")
        .select(
          "id, status, start_at, end_at"
        )
        .eq(
          "id",
          eventId
        )
        .single();

      if (
        latestEventError
      ) {
        console.error(
          "Latest event status error:",
          latestEventError.message
        );

        alert(
          "Unable to verify the current event status."
        );

        return;
      }

      const latestStatus =
        getAutomaticEventStatus(
          latestEventData,
          Date.now()
        );

      /*
       * HARD EDIT LOCK
       */
      if (
        latestStatus ===
          "ongoing" ||
        latestStatus ===
          "completed" ||
        latestStatus ===
          "cancelled"
      ) {
        alert(
          `This event is already ${latestStatus} and can no longer be edited.`
        );

        router.replace(
          `/dashboard/provincial/events/${eventId}`
        );

        return;
      }

      /*
       * UPCOMING EVENTS CANNOT RETURN TO DRAFT
       */
      if (
        latestStatus ===
          "upcoming" &&
        statusToSave ===
          "draft"
      ) {
        alert(
          "An upcoming published event cannot be changed back to draft."
        );

        return;
      }

      /*
       * BASIC VALIDATION
       */
      if (!title.trim()) {
        alert(
          "Please enter event title."
        );

        return;
      }

      /*
       * PUBLISHED EVENT VALIDATION
       */
      if (
        statusToSave ===
          "published" ||
        latestStatus ===
          "upcoming"
      ) {
        if (
          !description.trim()
        ) {
          alert(
            "Please enter event description before publishing."
          );

          return;
        }

        if (
          !startAt ||
          !endAt
        ) {
          alert(
            "Please select start and end date before publishing."
          );

          return;
        }

        const startDate =
          new Date(
            startAt
          );

        const endDate =
          new Date(
            endAt
          );

        if (
          Number.isNaN(
            startDate.getTime()
          ) ||
          Number.isNaN(
            endDate.getTime()
          )
        ) {
          alert(
            "Please enter a valid event schedule."
          );

          return;
        }

        const currentDate =
          new Date();

        if (
          startDate <=
          currentDate
        ) {
          alert(
            "Event start date and time must be later than the current time."
          );

          return;
        }

        if (
          endDate <=
          startDate
        ) {
          alert(
            "End date and time must be after start date and time."
          );

          return;
        }

        if (
          !memoUrl &&
          !newMemoFile
        ) {
          alert(
            "Please upload official memo before publishing."
          );

          return;
        }

        if (
          selectedMunicipalities.length ===
          0
        ) {
          alert(
            "Please select at least one municipality before publishing."
          );

          return;
        }
      }

      setSaving(true);

      try {
        /*
         * GET CURRENT PRIMARY MEMO
         * BEFORE REPLACEMENT
         *
         * This must happen BEFORE the
         * new memo is uploaded and before
         * event_memos is updated.
         */
        let oldMemoId:
          | string
          | null = null;

        let oldMemoFilePath:
          | string
          | null = null;

        if (newMemoFile) {
          const {
            data:
              currentMemoRows,
            error:
              currentMemoError,
          } = await supabase
            .from(
              "event_memos"
            )
            .select(
              "id, file_path"
            )
            .eq(
              "event_id",
              eventId
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              }
            )
            .limit(1);

          if (
            currentMemoError
          ) {
            throw currentMemoError;
          }

          const currentMemo =
            currentMemoRows?.[0];

          if (currentMemo) {
            oldMemoId =
              currentMemo.id;

            oldMemoFilePath =
              currentMemo.file_path ||
              getStoragePathFromPublicUrl(
                memoUrl
              );
          } else {
            /*
             * Legacy fallback:
             * The event might contain
             * events.memo_url but have
             * no row yet in event_memos.
             */
            oldMemoFilePath =
              getStoragePathFromPublicUrl(
                memoUrl
              );
          }

          console.log(
            "OLD MEMO ID:",
            oldMemoId
          );

          console.log(
            "OLD MEMO PATH:",
            oldMemoFilePath
          );
        }

        /*
         * UPLOAD NEW MEMO IF NECESSARY
         */
        const uploadedMemo =
          await uploadMemoIfNeeded();

        /*
         * DETERMINE FINAL STATUS
         *
         * draft → draft
         *
         * published event:
         * future schedule → upcoming
         * current schedule → ongoing
         * past schedule → completed
         */
        const finalStatus =
          statusToSave ===
          "draft"
            ? "draft"
            : getAutomaticEventStatus(
                {
                  status:
                    "published",

                  start_at:
                    new Date(
                      startAt
                    ).toISOString(),

                  end_at:
                    new Date(
                      endAt
                    ).toISOString(),
                },
                Date.now()
              );

        /*
         * UPDATE EVENT
         */
        const {
          error: eventError,
        } = await supabase
          .from("events")
          .update({
            title:
              title.trim(),

            description:
              description.trim(),

            start_at:
              startAt
                ? new Date(
                    startAt
                  ).toISOString()
                : null,

            end_at:
              endAt
                ? new Date(
                    endAt
                  ).toISOString()
                : null,

            status:
              finalStatus,

            memo_url:
              uploadedMemo.url,

            memo_filename:
              uploadedMemo.filename,

            /*
             * Change memo timestamp
             * only when a new memo
             * has actually been uploaded.
             */
            ...(newMemoFile
              ? {
                  memo_uploaded_at:
                    new Date().toISOString(),
                }
              : {}),

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            eventId
          );

        if (eventError) {
          throw eventError;
        }

        /*
         * SYNC NEW MEMO WITH event_memos
         */
        if (
          uploadedMemo.isNew &&
          uploadedMemo.url &&
          uploadedMemo.filename &&
          uploadedMemo.filePath
        ) {
          /*
           * Existing memo:
           * update the SAME primary
           * event_memos record.
           */
          if (oldMemoId) {
            const {
              error:
                memoUpdateError,
            } = await supabase
              .from(
                "event_memos"
              )
              .update({
                file_name:
                  uploadedMemo.filename,

                file_url:
                  uploadedMemo.url,

                file_path:
                  uploadedMemo.filePath,

                file_size:
                  uploadedMemo.fileSize,

                file_type:
                  uploadedMemo.fileType,
              })
              .eq(
                "id",
                oldMemoId
              );

            if (
              memoUpdateError
            ) {
              throw memoUpdateError;
            }
          } else {
            /*
             * Legacy event:
             * no event_memos row exists,
             * so create one.
             */
            const {
              error:
                memoInsertError,
            } = await supabase
              .from(
                "event_memos"
              )
              .insert({
                event_id:
                  eventId,

                file_name:
                  uploadedMemo.filename,

                file_url:
                  uploadedMemo.url,

                file_path:
                  uploadedMemo.filePath,

                file_size:
                  uploadedMemo.fileSize,

                file_type:
                  uploadedMemo.fileType,
              });

            if (
              memoInsertError
            ) {
              throw memoInsertError;
            }
          }
        }

        /*
         * GET EXISTING MUNICIPALITIES
         */
        const {
          data:
            existingRows,
          error:
            existingError,
        } = await supabase
          .from(
            "event_municipalities"
          )
          .select("*")
          .eq(
            "event_id",
            eventId
          );

        if (existingError) {
          throw existingError;
        }

        const existingMunicipalities =
          (
            existingRows as EventMunicipality[]
          ).map(
            (item) =>
              item.municipality
          );

        /*
         * MUNICIPALITIES TO ADD
         */
        const municipalitiesToAdd =
          selectedMunicipalities.filter(
            (municipality) =>
              !existingMunicipalities.includes(
                municipality
              )
          );

        /*
         * MUNICIPALITIES TO REMOVE
         */
        const municipalitiesToRemove =
          existingMunicipalities.filter(
            (municipality) =>
              !selectedMunicipalities.includes(
                municipality
              )
          );

        /*
         * REMOVE MUNICIPALITIES
         */
        if (
          municipalitiesToRemove.length >
          0
        ) {
          const {
            error:
              removeError,
          } = await supabase
            .from(
              "event_municipalities"
            )
            .delete()
            .eq(
              "event_id",
              eventId
            )
            .in(
              "municipality",
              municipalitiesToRemove
            );

          if (removeError) {
            throw removeError;
          }
        }

        /*
         * ADD MUNICIPALITIES
         */
        if (
          municipalitiesToAdd.length >
          0
        ) {
          const rowsToInsert =
            municipalitiesToAdd.map(
              (
                municipality
              ) => ({
                event_id:
                  eventId,

                municipality,

                municipal_status:
                  "pending",
              })
            );

          const {
            error:
              insertError,
          } = await supabase
            .from(
              "event_municipalities"
            )
            .insert(
              rowsToInsert
            );

          if (insertError) {
            throw insertError;
          }
        }

        /*
         * DELETE PREVIOUS MEMO
         * FROM SUPABASE STORAGE
         *
         * Only runs AFTER:
         *
         * 1. New file uploaded
         * 2. events updated
         * 3. event_memos synchronized
         * 4. municipality changes completed
         *
         * Therefore, the old file is not
         * removed too early.
         */
        if (
          uploadedMemo.isNew &&
          oldMemoFilePath &&
          uploadedMemo.filePath &&
          oldMemoFilePath !==
            uploadedMemo.filePath
        ) {
          console.log(
            "DELETING OLD MEMO:",
            oldMemoFilePath
          );

          const {
            data:
              deletedFiles,
            error:
              deleteOldMemoError,
          } =
            await supabase.storage
              .from(
                MEMO_BUCKET
              )
              .remove([
                oldMemoFilePath,
              ]);

          if (
            deleteOldMemoError
          ) {
            /*
             * Do not fail the entire
             * event update because the
             * new memo is already saved.
             */
            console.error(
              "OLD MEMO DELETE ERROR:",
              deleteOldMemoError
            );
          } else {
            console.log(
              "OLD MEMO DELETED:",
              deletedFiles
            );
          }
        }

        /*
         * SUCCESS
         */
        alert(
          statusToSave ===
            "draft"
            ? "Draft updated successfully."
            : "Provincial event updated successfully."
        );

        router.push(
          `/dashboard/provincial/events/${eventId}`
        );

        router.refresh();
      } catch (error) {
        console.error(
          "Update event error:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "Failed to update event.";

        alert(message);
      } finally {
        setSaving(false);
      }
    };

  /*
   * LOADING SCREEN
   */
  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Loading event...
        </p>
      </div>
    );
  }

  /*
   * LOCKED EVENT SCREEN
   *
   * Even if the user manually enters:
   *
   * /events/[id]/edit
   *
   * Ongoing, completed, and cancelled
   * events cannot be edited.
   */
  if (lockedStatus) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/provincial/events/${eventId}`
            )
          }
          className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          ← Back to Event
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          {/* LOCK ICON */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-6 w-6 text-slate-600"
            >
              <rect
                x="5"
                y="11"
                width="14"
                height="10"
                rx="2"
              />

              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Event Editing Locked
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            This event can no longer be edited because its
            current status is{" "}
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClass(
                lockedStatus
              )}`}
            >
              {lockedStatus}
            </span>
            .
          </p>

          {lockedStatus ===
            "ongoing" && (
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
              Ongoing events are locked to protect attendance
              and event records while the event is in progress.
            </p>
          )}

          {lockedStatus ===
            "completed" && (
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
              Completed events are preserved as historical
              records and can no longer be modified.
            </p>
          )}

          {lockedStatus ===
            "cancelled" && (
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
              Cancelled events are retained for historical
              records and can no longer be modified.
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/provincial/events/${eventId}`
              )
            }
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            View Event
          </button>
        </div>
      </div>
    );
  }

  /*
   * EDITABLE EVENT PAGE
   *
   * Only:
   * Draft
   * Upcoming
   */
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* PAGE HEADER */}
      <div>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/provincial/events/${eventId}`
            )
          }
          className="mb-3 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          ← Back to Event
        </button>

        <h1 className="text-2xl font-bold text-slate-900">
          Edit Provincial Event
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Update event details, official memo, schedule, and
          target municipalities.
        </p>
      </div>

      {/* FORM */}
      <form
        onSubmit={(event) =>
          event.preventDefault()
        }
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-6">
          {/* EVENT TITLE */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Event Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="Enter event title"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Event Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Enter event description"
              rows={5}
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          {/* SCHEDULE */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Start Date and Time
              </label>

              <input
                type="datetime-local"
                value={startAt}
                onChange={(event) =>
                  setStartAt(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                End Date and Time
              </label>

              <input
                type="datetime-local"
                value={endAt}
                onChange={(event) =>
                  setEndAt(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>
          </div>

          {/* STATUS */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Event Status
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClass(
                  status
                )}`}
              >
                {status}
              </span>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Event status is automatically managed based on
                its publishing state and schedule.
              </p>
            </div>
          </div>

          {/* OFFICIAL MEMO */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Official Memo
            </label>

            {memoFilename ||
            memoUrl ? (
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Current Memo:{" "}
                  {memoFilename ||
                    "Uploaded memo file"}
                </p>

                {memoUrl && (
                  <a
                    href={
                      memoUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
                  >
                    Open current memo
                  </a>
                )}
              </div>
            ) : (
              <p className="mb-3 text-sm text-slate-500">
                No memo uploaded yet.
              </p>
            )}

            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(event) =>
                setNewMemoFile(
                  event.target
                    .files?.[0] ||
                    null
                )
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />

            <p className="mt-1 text-xs text-slate-500">
              Uploading a new memo will replace the current memo
              link.
            </p>

            {newMemoFile && (
              <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2">
                <p className="text-xs font-medium text-blue-700">
                  New memo selected:{" "}
                  {
                    newMemoFile.name
                  }
                </p>
              </div>
            )}
          </div>

          {/* MUNICIPALITIES */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Target Municipalities
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Select the municipalities assigned to this
                  provincial event.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleSelectAll
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {selectedMunicipalities.length ===
                municipalitiesList.length
                  ? "Unselect All"
                  : "Select All"}
              </button>
            </div>

            <div className="mb-3">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {
                  selectedMunicipalities.length
                }{" "}
                selected
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {municipalitiesList.map(
                (
                  municipality
                ) => {
                  const selected =
                    selectedMunicipalities.includes(
                      municipality
                    );

                  return (
                    <label
                      key={
                        municipality
                      }
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                        selected
                          ? "border-slate-400 bg-slate-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selected
                        }
                        onChange={() =>
                          toggleMunicipality(
                            municipality
                          )
                        }
                        className="h-4 w-4"
                      />

                      <span className="font-medium text-slate-700">
                        {
                          municipality
                        }
                      </span>
                    </label>
                  );
                }
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                router.push(
                  `/dashboard/provincial/events/${eventId}`
                )
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            {status ===
              "draft" && (
              <>
                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    handleUpdateEvent(
                      "draft"
                    )
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : "Save as Draft"}
                </button>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    handleUpdateEvent(
                      "published"
                    )
                  }
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Publishing..."
                    : "Publish Event"}
                </button>
              </>
            )}

            {status ===
              "upcoming" && (
              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  handleUpdateEvent(
                    "published"
                  )
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}