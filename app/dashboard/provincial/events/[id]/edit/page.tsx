"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

    if (Number.isNaN(date.getTime())) return "";

    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

    return localDate.toISOString().slice(0, 16);
}

export default function EditProvincialEventPage() {
    const params = useParams();
    const router = useRouter();

    const eventId = params.id as string;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startAt, setStartAt] = useState("");
    const [endAt, setEndAt] = useState("");

    const [memoUrl, setMemoUrl] = useState<string | null>(null);
    const [memoFilename, setMemoFilename] = useState<string | null>(null);
    const [newMemoFile, setNewMemoFile] = useState<File | null>(null);

    const [selectedMunicipalities, setSelectedMunicipalities] = useState<
        string[]
    >([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchEvent = async () => {
        setLoading(true);

        const { data: eventData, error: eventError } = await supabase
            .from("events")
            .select("*")
            .eq("id", eventId)
            .single();

        if (eventError) {
            console.error("Event fetch error:", eventError.message);
            alert("Failed to load event.");
            router.push("/dashboard/provincial/events");
            return;
        }

        const event = eventData as EventItem;

        setTitle(event.title || "");
        setDescription(event.description || "");
        setStartAt(toDatetimeLocal(event.start_at));
        setEndAt(toDatetimeLocal(event.end_at));
        setMemoUrl(event.memo_url);
        setMemoFilename(event.memo_filename);

        const { data: municipalityData, error: municipalityError } = await supabase
            .from("event_municipalities")
            .select("*")
            .eq("event_id", eventId);

        if (municipalityError) {
            console.error("Municipality fetch error:", municipalityError.message);
            setSelectedMunicipalities([]);
        } else {
            const selected = (municipalityData as EventMunicipality[]).map(
                (item) => item.municipality
            );

            setSelectedMunicipalities(selected);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (eventId) {
            fetchEvent();
        }
    }, [eventId]);

    const toggleMunicipality = (municipality: string) => {
        setSelectedMunicipalities((prev) =>
            prev.includes(municipality)
                ? prev.filter((item) => item !== municipality)
                : [...prev, municipality]
        );
    };

    const handleSelectAll = () => {
        if (selectedMunicipalities.length === municipalitiesList.length) {
            setSelectedMunicipalities([]);
        } else {
            setSelectedMunicipalities(municipalitiesList);
        }
    };

    const uploadMemoIfNeeded = async () => {
        if (!newMemoFile) {
            return {
                url: memoUrl,
                filename: memoFilename,
            };
        }

        const fileExt = newMemoFile.name.split(".").pop();
        const fileName = `${eventId}-${Date.now()}.${fileExt}`;
        const filePath = `provincial-memos/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(MEMO_BUCKET)
            .upload(filePath, newMemoFile, {
                cacheControl: "3600",
                upsert: true,
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage.from(MEMO_BUCKET).getPublicUrl(filePath);

        return {
            url: data.publicUrl,
            filename: newMemoFile.name,
        };
    };

    const handleUpdateEvent = async (statusToSave: "draft" | "published" | "cancelled" | "completed") => {

        if (!title.trim()) {
            alert("Please enter event title.");
            return;
        }

        if (statusToSave === "published") {
            if (!description.trim()) {
                alert("Please enter event description before publishing.");
                return;
            }

            if (!startAt || !endAt) {
                alert("Please select start and end date before publishing.");
                return;
            }

            if (new Date(endAt) <= new Date(startAt)) {
                alert("End date and time must be after start date and time.");
                return;
            }

            if (!memoUrl && !newMemoFile) {
                alert("Please upload official memo before publishing.");
                return;
            }

            if (selectedMunicipalities.length === 0) {
                alert("Please select at least one municipality before publishing.");
                return;
            }

            if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
                alert("End date and time must be after start date and time.");
                return;
            }
        }

        setSaving(true);

        try {
            const uploadedMemo = await uploadMemoIfNeeded();

            const { data: updatedEvent, error: eventError } = await supabase
                .from("events")
                .update({
                    title: title.trim(),
                    description: description.trim() || null,
                    start_at: startAt ? new Date(startAt).toISOString() : null,
                    end_at: endAt ? new Date(endAt).toISOString() : null,
                    status: statusToSave,
                    memo_url: uploadedMemo.url,
                    memo_filename: uploadedMemo.filename,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", eventId)
                .select("id, title, status")
                .single();

            if (eventError) {
                throw eventError;
            }

            if (!updatedEvent) {
                throw new Error("Event was not updated. Please check event update policy.");
            }

            console.log("Updated event:", updatedEvent);

            const { data: existingRows, error: existingError } = await supabase
                .from("event_municipalities")
                .select("*")
                .eq("event_id", eventId);

            if (existingError) {
                throw existingError;
            }

            const existingMunicipalities = (existingRows as EventMunicipality[]).map(
                (item) => item.municipality
            );

            const municipalitiesToAdd = selectedMunicipalities.filter(
                (municipality) => !existingMunicipalities.includes(municipality)
            );

            const municipalitiesToRemove = existingMunicipalities.filter(
                (municipality) => !selectedMunicipalities.includes(municipality)
            );

            if (municipalitiesToRemove.length > 0) {
                const { error: removeError } = await supabase
                    .from("event_municipalities")
                    .delete()
                    .eq("event_id", eventId)
                    .in("municipality", municipalitiesToRemove);

                if (removeError) {
                    throw removeError;
                }
            }

            if (municipalitiesToAdd.length > 0) {
                const rowsToInsert = municipalitiesToAdd.map((municipality) => ({
                    event_id: eventId,
                    municipality,
                    preparation_status: "pending",
                }));

                const { error: insertError } = await supabase
                    .from("event_municipalities")
                    .insert(rowsToInsert);

                if (insertError) {
                    throw insertError;
                }
            }

            alert(
                statusToSave === "draft"
                    ? "Event saved as draft successfully."
                    : "Event published successfully."
            );
            router.push(`/dashboard/provincial/events/${eventId}`);
            router.refresh();
        } catch (error: any) {
            console.error("Update event error:", error.message);
            alert(error.message || "Failed to update event.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Loading event...</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <button
                    onClick={() => router.back()}
                    className="mb-3 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                    ← Back
                </button>

                <h1 className="text-2xl font-bold text-slate-900">
                    Edit Provincial Event
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Update event details, memo file, status, and target municipalities.
                </p>
            </div>

            <form
                onSubmit={(e) => e.preventDefault()}
                className="rounded-2xl bg-white p-6 shadow-sm"
            >
                <div className="space-y-5">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
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
                        <label className="mb-1 block text-sm font-medium text-slate-700">
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

                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
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
                            <label className="mb-1 block text-sm font-medium text-slate-700">
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
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Official Memo
                        </label>

                        {memoFilename || memoUrl ? (
                            <div className="mb-3 rounded-lg bg-slate-50 p-4">
                                <p className="text-sm font-medium text-slate-900">
                                    Current Memo: {memoFilename || "Uploaded memo file"}
                                </p>

                                {memoUrl && (
                                    <a
                                        href={memoUrl}
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
                            onChange={(e) => setNewMemoFile(e.target.files?.[0] || null)}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                        />

                        <p className="mt-1 text-xs text-slate-500">
                            Uploading a new memo will replace the current memo link.
                        </p>
                    </div>

                    <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Target Municipalities
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Select the municipalities assigned to this provincial event.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                                {selectedMunicipalities.length === municipalitiesList.length
                                    ? "Unselect All"
                                    : "Select All"}
                            </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {municipalitiesList.map((municipality) => (
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
                                    <span className="font-medium text-slate-700">
                                        {municipality}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                        <button
                            type="button"
                            onClick={() => router.push(`/dashboard/provincial/events/${eventId}`)}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleUpdateEvent("draft")}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? "Saving..." : "Save as Draft"}
                        </button>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleUpdateEvent("published")}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? "Publishing..." : "Publish Event"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}