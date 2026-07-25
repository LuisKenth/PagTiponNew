"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MUNICIPALITIES } from "@/lib/municipalities";

export default function CreateProvincialEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [memoFile, setMemoFile] = useState<File | null>(null);
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState(false);

  const toggleMunicipality = (municipality: string) => {
    setSelectedMunicipalities((prev) =>
      prev.includes(municipality)
        ? prev.filter((item) => item !== municipality)
        : [...prev, municipality]
    );
  };

  const toggleAllMunicipalities = () => {
    if (selectedMunicipalities.length === MUNICIPALITIES.length) {
      setSelectedMunicipalities([]);
    } else {
      setSelectedMunicipalities(MUNICIPALITIES);
    }
  };

  const uploadMemo = async (userId: string) => {
    if (!memoFile) {
      return {
        memoUrl: null,
        memoFilename: null,
      };
    }

    const safeFileName = memoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${userId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("official-memos")
      .upload(filePath, memoFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from("official-memos")
      .getPublicUrl(filePath);

    return {
      memoUrl: publicUrlData.publicUrl,
      memoFilename: memoFile.name,
    };
  };

  const handleCreateEvent = async (statusToSave: "draft" | "published") => {
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

      if (new Date(endAt) <= new Date(startAt)) {
        alert("End date and time must be after start date and time.");
        return;
      }

      if (!memoFile) {
        alert("Please upload official memo before publishing.");
        return;
      }

      if (selectedMunicipalities.length === 0) {
        alert("Please select at least one municipality before publishing.");
        return;
      }
    }

    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      alert("End date and time must be after start date and time.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not found. Please login again.");
      }

      const uploadedMemo = await uploadMemo(user.id);

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          start_at: startAt ? new Date(startAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          memo_url: uploadedMemo.memoUrl,
          memo_filename: uploadedMemo.memoFilename,
          created_by: user.id,
          status: statusToSave,
        })
        .select("id")
        .single();

      if (eventError) {
        throw eventError;
      }

      if (selectedMunicipalities.length > 0) {
        const municipalityRows = selectedMunicipalities.map((municipality) => ({
          event_id: eventData.id,
          municipality,
          municipal_status: "pending",
        }));

        const { error: municipalityError } = await supabase
          .from("event_municipalities")
          .insert(municipalityRows);

        if (municipalityError) {
          throw municipalityError;
        }
      }

      alert(
        statusToSave === "draft"
          ? "Event saved as draft."
          : "Event published successfully."
      );

      router.push("/dashboard/provincial/events");
      router.refresh();
    } catch (error: any) {
      console.error("Create event error:", error.message);
      alert(error.message || "Failed to save event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Create New Provincial Event
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Save the event as draft or publish it when ready.
          </p>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-6 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Event Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter event description"
              rows={5}
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Start Date and Time
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                End Date and Time
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Upload Official Memo
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setMemoFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
            />

            {memoFile && (
              <p className="mt-2 text-sm text-slate-500">
                Selected file:{" "}
                <span className="font-medium text-slate-700">
                  {memoFile.name}
                </span>
              </p>
            )}

            <p className="mt-1 text-xs text-slate-500">
              Required only when publishing. Draft events can be saved without a
              memo.
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                Target Municipalities
              </label>

              <button
                type="button"
                onClick={toggleAllMunicipalities}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                {selectedMunicipalities.length === MUNICIPALITIES.length
                  ? "Unselect All"
                  : "Select All"}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MUNICIPALITIES.map((municipality) => (
                <label
                  key={municipality}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedMunicipalities.includes(municipality)}
                    onChange={() => toggleMunicipality(municipality)}
                    className="h-4 w-4"
                  />
                  <span className="text-slate-700">{municipality}</span>
                </label>
              ))}
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Selected: {selectedMunicipalities.length} municipality
              {selectedMunicipalities.length === 1 ? "" : "ies"}
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => router.push("/dashboard/provincial/events")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleCreateEvent("draft")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save as Draft"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleCreateEvent("published")}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Publishing..." : "Publish Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}