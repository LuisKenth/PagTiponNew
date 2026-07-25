"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import QRCodeBox from "./components/QRCodeBox";

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

type OpenEvent = {
    id: string;
    event_id: string;
    municipality: string;
    municipal_status: string | null;
    registration_open: boolean | null;
    local_instructions: string | null;
    created_at: string;
    event: EventRow | null;
};

type RSVP = {
    id: string;
    event_municipality_id: string;
    user_id: string;
    municipality: string;
    qr_token: string | null;
    status: string | null;
    registered_at: string | null;
};

export default function ParticipantDashboardPage() {
    const [userId, setUserId] = useState("");
    const [municipality, setMunicipality] = useState("");
    const [openEvents, setOpenEvents] = useState<OpenEvent[]>([]);
    const [rsvps, setRsvps] = useState<RSVP[]>([]);
    const [loading, setLoading] = useState(true);
    const [registeringId, setRegisteringId] = useState<string | null>(null);

    useEffect(() => {
        fetchOpenEvents();
    }, []);

    const fetchOpenEvents = async () => {
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

        setUserId(user.id);

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

        const { data: localEvents, error: localEventsError } = await supabase
            .from("event_municipalities")
            .select(
                "id, event_id, municipality, municipal_status, registration_open, local_instructions, created_at"
            )
            .eq("municipality", profile.municipality)
            .eq("municipal_status", "prepared")
            .eq("registration_open", true)
            .order("created_at", { ascending: false });

        if (localEventsError) {
            console.error(localEventsError.message);
            setOpenEvents([]);
            setLoading(false);
            return;
        }

        const { data: rsvpData, error: rsvpError } = await supabase
            .from("rsvps")
            .select(
                "id, event_municipality_id, user_id, municipality, qr_token, status, registered_at"
            )
            .eq("user_id", user.id);

        if (rsvpError) {
            console.error(rsvpError.message);
            setRsvps([]);
        } else {
            setRsvps(rsvpData || []);
        }

        if (!localEvents || localEvents.length === 0) {
            setOpenEvents([]);
            setLoading(false);
            return;
        }

        const eventIds = localEvents.map((item) => item.event_id);

        const { data: events, error: eventsError } = await supabase
            .from("events")
            .select(
                "id, title, description, start_at, end_at, memo_url, memo_filename, status, created_at"
            )
            .in("id", eventIds)
            .eq("status", "published");

        if (eventsError) {
            console.error(eventsError.message);
            setOpenEvents([]);
            setLoading(false);
            return;
        }

        const mappedEvents: OpenEvent[] = localEvents.map((item) => ({
            ...item,
            event: events?.find((event) => event.id === item.event_id) || null,
        }));

        setOpenEvents(mappedEvents.filter((item) => item.event !== null));
        setLoading(false);
    };

    const isRegistered = (eventMunicipalityId: string) => {
        return rsvps.some(
            (rsvp) =>
                rsvp.event_municipality_id === eventMunicipalityId &&
                rsvp.status === "registered"
        );
    };

    const getRegisteredRsvp = (eventMunicipalityId: string) => {
        return rsvps.find(
            (rsvp) =>
                rsvp.event_municipality_id === eventMunicipalityId &&
                rsvp.status === "registered"
        );
    };

    const handleRegister = async (item: OpenEvent) => {
        if (!userId) {
            alert("User not found. Please login again.");
            return;
        }

        if (isRegistered(item.id)) {
            alert("You are already registered for this event.");
            return;
        }

        const confirmRegister = confirm(
            `Are you sure you want to register for ${item.event?.title || "this event"}?`
        );

        if (!confirmRegister) return;

        setRegisteringId(item.id);

        const qrToken = `${userId}-${item.id}-${crypto.randomUUID()}`;

        const { error } = await supabase.from("rsvps").insert({
            event_municipality_id: item.id,
            user_id: userId,
            municipality: item.municipality,
            qr_token: qrToken,
            status: "registered",
        });

        if (error) {
            alert(error.message);
            setRegisteringId(null);
            return;
        }

        alert("Registration successful.");
        setRegisteringId(null);
        fetchOpenEvents();
    };

    const formatDateTime = (dateValue: string | null) => {
        if (!dateValue) return "Not set";

        return new Date(dateValue).toLocaleString("en-PH", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    return (
        <main className="min-h-screen bg-slate-100 p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-slate-900">
                        Participant Dashboard
                    </h1>

                    <p className="mt-2 text-sm text-slate-600">
                        Available events for{" "}
                        <span className="font-semibold text-slate-900">
                            {municipality || "your municipality"}
                        </span>
                        .
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">Available Events</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                            {openEvents.length}
                        </h2>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">Registered Events</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                            {rsvps.filter((rsvp) => rsvp.status === "registered").length}
                        </h2>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-slate-500">Upcoming Events</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                            {openEvents.length}
                        </h2>
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Available Events
                    </h2>

                    {loading ? (
                        <p className="mt-4 text-sm text-slate-500">
                            Loading available events...
                        </p>
                    ) : openEvents.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">
                            No available events for registration yet.
                        </p>
                    ) : (
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            {openEvents.map((item) => {
                                const registeredRsvp = getRegisteredRsvp(item.id);
                                const registered = Boolean(registeredRsvp);

                                return (
                                    <div
                                        key={item.id}
                                        className="rounded-xl border border-slate-200 p-5"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-semibold text-slate-900">
                                                {item.event?.title || "Untitled Event"}
                                            </h3>

                                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                                                Open Registration
                                            </span>

                                            {registered && (
                                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                                                    Registered
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-2 text-sm text-slate-600">
                                            {item.event?.description || "No description provided."}
                                        </p>

                                        <div className="mt-3 space-y-1 text-sm text-slate-500">
                                            <p>
                                                <span className="font-medium text-slate-700">
                                                    Start:
                                                </span>{" "}
                                                {formatDateTime(item.event?.start_at || null)}
                                            </p>

                                            <p>
                                                <span className="font-medium text-slate-700">End:</span>{" "}
                                                {formatDateTime(item.event?.end_at || null)}
                                            </p>
                                        </div>

                                        {item.local_instructions && (
                                            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                                                <span className="font-medium text-slate-800">
                                                    Local Instructions:
                                                </span>{" "}
                                                {item.local_instructions}
                                            </p>
                                        )}

                                        {registeredRsvp?.qr_token && (
                                            <QRCodeBox qrToken={registeredRsvp.qr_token} />
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleRegister(item)}
                                            disabled={registered || registeringId === item.id}
                                            className="mt-5 w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {registeringId === item.id
                                                ? "Registering..."
                                                : registered
                                                    ? "Registered"
                                                    : "Register"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}