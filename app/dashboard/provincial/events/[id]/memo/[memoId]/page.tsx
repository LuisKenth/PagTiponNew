"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type EventMemo = {
  id: number;
  event_id: string;
  file_name: string;
  file_url: string;
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string | null;
};

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function ProvincialMemoViewerPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = params.id as string;
  const memoId = params.memoId as string;

  const [memo, setMemo] = useState<EventMemo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemo = async () => {
      if (!eventId || !memoId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("event_memos")
        .select(
          `
            id,
            event_id,
            file_name,
            file_url,
            file_path,
            file_size,
            file_type,
            created_at
          `
        )
        .eq("id", memoId)
        .eq("event_id", eventId)
        .single();

      if (error) {
        console.error("Memo viewer error:", error.message);
        setMemo(null);
      } else {
        setMemo(data as EventMemo);
      }

      setLoading(false);
    };

    fetchMemo();
  }, [eventId, memoId]);

  const goBackToEvent = () => {
    router.push(`/dashboard/provincial/events/${eventId}`);
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Loading official memo...
        </p>
      </div>
    );
  }

  if (!memo) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={goBackToEvent}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Event
        </button>

        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <FileText
            size={32}
            className="mx-auto text-slate-300"
          />

          <h1 className="mt-3 text-lg font-semibold text-slate-900">
            Memo not found
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            The selected official memo does not exist or cannot be
            accessed.
          </p>
        </div>
      </div>
    );
  }

  const extension = getFileExtension(memo.file_name);

  const isPdf = extension === "pdf";

  const isImage = [
    "png",
    "jpg",
    "jpeg",
    "webp",
  ].includes(extension);

  const isDocument = [
    "doc",
    "docx",
  ].includes(extension);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={goBackToEvent}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Back to event"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Official Memo
            </p>

            <h1 className="mt-1 truncate text-xl font-bold text-slate-900">
              {memo.file_name}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{extension.toUpperCase()}</span>

              <span>•</span>

              <span>
                {formatFileSize(memo.file_size)}
              </span>
            </div>
          </div>
        </div>

        <a
          href={memo.file_url}
          download={memo.file_name}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Download size={16} />
          Download
        </a>
      </div>

      {/* PDF Viewer */}
      {isPdf && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <FileText
                size={18}
                className="text-slate-500"
              />

              <h2 className="font-semibold text-slate-900">
                Document Preview
              </h2>
            </div>
          </div>

          <iframe
            src={memo.file_url}
            title={memo.file_name}
            className="h-[75vh] w-full border-0"
          />
        </div>
      )}

      {/* Image Viewer */}
      {isImage && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
            <ImageIcon
              size={18}
              className="text-slate-500"
            />

            <h2 className="font-semibold text-slate-900">
              Image Preview
            </h2>
          </div>

          <div className="flex min-h-[400px] items-center justify-center rounded-xl bg-slate-50 p-4">
            <img
              src={memo.file_url}
              alt={memo.file_name}
              className="max-h-[75vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}

      {/* DOC / DOCX */}
      {isDocument && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <FileText size={26} />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Microsoft Word Document
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            This document format cannot be previewed directly inside
            the browser. Download the file to open it using Microsoft
            Word or another compatible application.
          </p>

          <a
            href={memo.file_url}
            download={memo.file_name}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Download size={16} />
            Download Document
          </a>
        </div>
      )}

      {/* Unknown format */}
      {!isPdf && !isImage && !isDocument && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <FileText
            size={30}
            className="mx-auto text-slate-300"
          />

          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            Preview unavailable
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Download this document to view its contents.
          </p>

          <a
            href={memo.file_url}
            download={memo.file_name}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Download size={16} />
            Download File
          </a>
        </div>
      )}
    </div>
  );
}