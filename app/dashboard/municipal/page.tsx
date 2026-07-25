"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type EventRow = {
    id: string;
    title: string;
    description: string | null;
    start_at: string | null;
    end_at: string | null;
    memo_url: string | null;
    memo_filename: string | null;
    status: string | null;
    created_at: string;
};

type ReceivedEvent = {
    id: string;
    event_id: string;
    municipality: string;
    municipal_status: string | null;
    registration_open: boolean | null;
    local_instructions: string | null;
    created_at: string;
    event: EventRow | null;
};

export default function MunicipalDashboardPage() {
    const [municipality, setMunicipality] = useState("");
    const [receivedEvents, setReceivedEvents] = useState<ReceivedEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedEvent, setSelectedEvent] = useState<ReceivedEvent | null>(null);
    const [localInstructions, setLocalInstructions] = useState("");
    const [registrationOpen, setRegistrationOpen] = useState(false);
    const [savingPreparation, setSavingPreparation] = useState(false);

    useEffect(() => {
        fetchReceivedEvents();
    }, []);

    const fetchReceivedEvents = async () => {
        setLoading(true);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error(userError?.message);
            setLoading(false);
            return;
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("municipality")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.municipality) {
            console.error(profileError?.message);
            setLoading(false);
            return;
        }

        setMunicipality(profile.municipality);

        const { data: targetRows, error: targetError } = await supabase
            .from("event_municipalities")
            .select(
                "id, event_id, municipality, municipal_status, registration_open, local_instructions, created_at"
            )
            .eq("municipality", profile.municipality)
            .order("created_at", { ascending: false });

        if (targetError) {
            console.error(targetError.message);
            setReceivedEvents([]);
            setLoading(false);
            return;
        }

        if (!targetRows || targetRows.length === 0) {
            setReceivedEvents([]);
            setLoading(false);
            return;
        }

        const eventIds = targetRows.map((row) => row.event_id);

        const { data: events, error: eventsError } = await supabase
            .from("events")
            .select(
                "id, title, description, start_at, end_at, memo_url, memo_filename, status, created_at"
            )
            .in("id", eventIds);

        if (eventsError) {
            console.error(eventsError.message);
            setReceivedEvents([]);
            setLoading(false);
            return;
        }

        const mappedEvents: ReceivedEvent[] = targetRows.map((row) => ({
            ...row,
            event: events?.find((event) => event.id === row.event_id) || null,
        }));

        setReceivedEvents(mappedEvents);
        setLoading(false);
    };

    const openPrepareModal = (item: ReceivedEvent) => {
        setSelectedEvent(item);
        setLocalInstructions(item.local_instructions || "");
        setRegistrationOpen(item.registration_open || false);
    };

    const closePrepareModal = () => {
        setSelectedEvent(null);
        setLocalInstructions("");
        setRegistrationOpen(false);
    };

    const savePreparation = async () => {
        if (!selectedEvent) return;

        if (!localInstructions.trim()) {
            alert("Please enter local instructions.");
            return;
        }

        setSavingPreparation(true);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setSavingPreparation(false);
            alert("User not found. Please login again.");
            return;
        }

        const { error } = await supabase
            .from("event_municipalities")
            .update({
                municipal_status: "prepared",
                local_instructions: localInstructions.trim(),
                registration_open: registrationOpen,
                prepared_by: user.id,
            })
            .eq("id", selectedEvent.id);

        if (error) {
            setSavingPreparation(false);
            alert(error.message);
            return;
        }

        setSavingPreparation(false);
        closePrepareModal();
        await fetchReceivedEvents();

        alert("Event preparation saved successfully.");
    };

    const formatDateTime = (dateValue: string | null) => {
        if (!dateValue) return "Not set";

        return new Date(dateValue).toLocaleString("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    const getStatusClass = (status: string | null) => {
        if (status === "pending") {
            return "bg-yellow-100 text-yellow-700";
        }

        if (status === "prepared") {
            return "bg-blue-100 text-blue-700";
        }

        if (status === "completed") {
            return "bg-green-100 text-green-700";
        }

        if (status === "cancelled") {
            return "bg-red-100 text-red-700";
        }

        return "bg-slate-100 text-slate-700";
    };

    return (
        <main className="min-h-screen bg-slate-100 p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Municipal Dashboard
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Received provincial events and official memos for{" "}
                            <span className="font-semibold text-slate-900">
                                {municipality || "your municipality"}
                            </span>
                            .
                        </p>
                    </div>

                    <Link
                        href="/dashboard/municipal/venues"
                        className="rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Manage Venues
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">Received Events</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                            {receivedEvents.length}
                        </h2>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">Pending Preparation</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                            {
                                receivedEvents.filter(
                                    (item) => item.municipal_status === "pending"
                                ).length
                            }
                        </h2>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">Registration Open</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                            {
                                receivedEvents.filter(
                                    (item) => item.registration_open === true
                                ).length
                            }
                        </h2>
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Received Provincial Events
                    </h2>

                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">
                            Loading received events...
                        </p>
                    ) : receivedEvents.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">
                            No provincial events received yet.
                        </p>
                    ) : (
                        <div className="mt-4 space-y-4">
                            {receivedEvents.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-xl border border-slate-200 p-5"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    {item.event?.title || "Untitled Event"}
                                                </h3>

                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                                                        item.municipal_status
                                                    )}`}
                                                >
                                                    {item.municipal_status || "pending"}
                                                </span>
                                            </div>

                                            <p className="text-sm text-slate-600">
                                                {item.event?.description || "No description provided."}
                                            </p>

                                            <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                                                <p>
                                                    <span className="font-medium text-slate-700">
                                                        Start:
                                                    </span>{" "}
                                                    {formatDateTime(item.event?.start_at || null)}
                                                </p>

                                                <p>
                                                    <span className="font-medium text-slate-700">
                                                        End:
                                                    </span>{" "}
                                                    {formatDateTime(item.event?.end_at || null)}
                                                </p>
                                            </div>

                                            {item.event?.memo_filename && (
                                                <p className="text-sm text-slate-500">
                                                    Memo:{" "}
                                                    <span className="font-medium text-slate-700">
                                                        {item.event.memo_filename}
                                                    </span>
                                                </p>
                                            )}

                                            {item.local_instructions && (
                                                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                                                    <span className="font-medium text-slate-800">
                                                        Local Instructions:
                                                    </span>{" "}
                                                    {item.local_instructions}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                                            {item.event?.memo_url && (
                                                <a
                                                    href={item.event.memo_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-lg bg-slate-950 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
                                                >
                                                    View Memo
                                                </a>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => openPrepareModal(item)}
                                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                {item.municipal_status === "prepared"
                                                    ? "Update Preparation"
                                                    : "Prepare Event"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg">
                        <h2 className="text-xl font-bold text-slate-900">
                            Prepare Event
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Add local instructions and choose whether participants can register
                            for this municipal event.
                        </p>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Event
                                </label>
                                <input
                                    type="text"
                                    value={selectedEvent.event?.title || "Untitled Event"}
                                    disabled
                                    className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-600"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Local Instructions
                                </label>
                                <textarea
                                    value={localInstructions}
                                    onChange={(e) => setLocalInstructions(e.target.value)}
                                    rows={5}
                                    placeholder="Example: Participants must arrive 30 minutes before the event. Bring valid ID."
                                    className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                                />
                            </div>

                            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4 text-sm">
                                <input
                                    type="checkbox"
                                    checked={registrationOpen}
                                    onChange={(e) => setRegistrationOpen(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                <div>
                                    <p className="font-medium text-slate-800">
                                        Open registration for participants
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Participants from this municipality can register once this is
                                        enabled.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end gap-3 border-t pt-5">
                            <button
                                type="button"
                                onClick={closePrepareModal}
                                disabled={savingPreparation}
                                className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={savePreparation}
                                disabled={savingPreparation}
                                className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                                {savingPreparation ? "Saving..." : "Save Preparation"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}