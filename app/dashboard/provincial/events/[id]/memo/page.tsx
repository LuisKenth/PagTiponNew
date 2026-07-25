"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EventItem = {
    id: string;
    title: string | null;
    memo_url: string | null;
    memo_filename: string | null;
};

function isImageFile(filename?: string | null, url?: string | null) {
    const value = (filename || url || "").toLowerCase();

    return (
        value.endsWith(".jpg") ||
        value.endsWith(".jpeg") ||
        value.endsWith(".png") ||
        value.endsWith(".webp") ||
        value.endsWith(".gif")
    );
}

function isPdfFile(filename?: string | null, url?: string | null) {
    const value = (filename || url || "").toLowerCase();
    return value.endsWith(".pdf");
}

export default function ProvincialMemoViewerPage() {
    const params = useParams();
    const router = useRouter();

    const eventId = params.id as string;

    const [event, setEvent] = useState<EventItem | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchEvent = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("events")
            .select("id, title, memo_url, memo_filename")
            .eq("id", eventId)
            .single();

        if (error) {
            console.error("Memo viewer error:", error.message);
            setEvent(null);
            setLoading(false);
            return;
        }

        setEvent(data);
        setLoading(false);
    };

    useEffect(() => {
        if (eventId) {
            fetchEvent();
        }
    }, [eventId]);

    if (loading) {
        return (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Loading memo...</p>
            </div>
        );
    }

    if (!event || !event.memo_url) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => router.push(`/dashboard/provincial/events/${eventId}`)}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                    ← Back to Event
                </button>

                <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                    <h1 className="text-lg font-semibold text-slate-900">
                        Memo not found
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        This event has no uploaded official memo.
                    </p>
                </div>
            </div>
        );
    }

    const isImage = isImageFile(event.memo_filename, event.memo_url);
    const isPdf = isPdfFile(event.memo_filename, event.memo_url);

    return (
        <div className="space-y-6">
            <div>
                <button
                    onClick={() => router.push(`/dashboard/provincial/events/${eventId}`)}
                    className="mb-3 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                    ← Back to Event
                </button>

                <h1 className="text-2xl font-bold text-slate-900">
                    Official Memo
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    {event.title || "Untitled Event"}
                </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                        File Name
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                        {event.memo_filename || "Uploaded memo file"}
                    </p>
                </div>

                {isImage ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <img
                            src={event.memo_url}
                            alt={event.memo_filename || "Official memo"}
                            className="mx-auto max-h-[75vh] w-auto max-w-full object-contain"
                        />
                    </div>
                ) : isPdf ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <iframe
                            src={event.memo_url}
                            className="h-[75vh] w-full"
                            title="Official Memo PDF"
                        />
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                        <h2 className="text-sm font-semibold text-slate-900">
                            Preview not available
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            This file type may need to be opened in a new tab.
                        </p>

                        <a
                            href={event.memo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                            Open Memo File
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}