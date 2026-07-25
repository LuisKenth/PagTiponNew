"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EventMemo = {
  id: string;
  title: string | null;
  memo_url: string | null;
  memo_filename: string | null;
};

export default function MemoViewerPage() {
  const params = useParams();

  const eventId = params.id as string;

  const [event, setEvent] = useState<EventMemo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemo = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("events")
        .select("id, title, memo_url, memo_filename")
        .eq("id", eventId)
        .maybeSingle<EventMemo>();

      if (error) {
        console.error("Memo fetch error:", error.message);
        setEvent(null);
        setLoading(false);
        return;
      }

      setEvent(data);
      setLoading(false);
    };

    if (eventId) {
      fetchMemo();
    }
  }, [eventId]);

  const getFileExtension = () => {
    const filename = event?.memo_filename?.toLowerCase() || "";

    return filename.split(".").pop() || "";
  };

  const extension = getFileExtension();

  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension);

  const isPdf = extension === "pdf";

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Loading official memo...
        </p>
      </div>
    );
  }

  if (!event || !event.memo_url) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/provincial/memos"
          className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to Official Memos
        </Link>

        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Memo Not Found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            This event does not have an official memo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Official Memo
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {event.title || "Untitled Event"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {event.memo_filename || "Official Memo"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/provincial/memos"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back to Official Memos
          </Link>

          <Link
            href={`/dashboard/provincial/events/${event.id}`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to Event
          </Link>
        </div>
      </div>

      {/* Memo Viewer */}
      <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
        {isPdf && (
          <iframe
            src={event.memo_url}
            title={event.memo_filename || "Official Memo"}
            className="h-[75vh] w-full rounded-xl border border-slate-200"
          />
        )}

        {isImage && (
          <div className="flex min-h-[500px] justify-center rounded-xl bg-slate-50 p-4">
            <img
              src={event.memo_url}
              alt={event.memo_filename || "Official Memo"}
              className="max-h-[75vh] max-w-full rounded-lg object-contain"
            />
          </div>
        )}

        {!isPdf && !isImage && (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              Preview not available
            </h2>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              This file type cannot be previewed directly in the browser.
            </p>

            <a
              href={event.memo_url}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open Memo File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}