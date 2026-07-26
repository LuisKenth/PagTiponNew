import Link from "next/link";
import { FileText, Files } from "lucide-react";

export type EventMemo = {
  id: number;
  event_id: string;
  file_name: string;
  file_url: string;
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string | null;
};

type EventMemosSectionProps = {
  eventId: string;
  memos: EventMemo[];
  legacyMemoUrl?: string | null;
  legacyMemoFilename?: string | null;
};

function formatFileSize(bytes?: number | null) {
  if (!bytes) return null;

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

export default function EventMemosSection({
  eventId,
  memos,
  legacyMemoUrl,
  legacyMemoFilename,
}: EventMemosSectionProps) {
  if (memos.length > 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Official Memos
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Documents attached to this provincial event.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            <Files size={14} />

            {memos.length}{" "}
            {memos.length === 1 ? "file" : "files"}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {memos.map((memo) => {
            const fileSize = formatFileSize(
              memo.file_size
            );

            return (
              <div
                key={memo.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FileText size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {memo.file_name}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>
                        {getFileExtension(
                          memo.file_name
                        )}
                      </span>

                      {fileSize && (
                        <>
                          <span>•</span>
                          <span>{fileSize}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/dashboard/provincial/events/${eventId}/memo/${memo.id}`}
                  className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Open Memo
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (legacyMemoUrl) {
    return (
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase text-slate-400">
          Official Memo
        </p>

        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <FileText size={18} />
            </div>

            <p className="truncate text-sm font-semibold text-slate-800">
              {legacyMemoFilename ||
                "Uploaded memo file"}
            </p>
          </div>

          <Link
            href={`/dashboard/provincial/events/${eventId}/memo`}
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Open Memo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">
        Official Memos
      </p>

      <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center">
        <FileText
          size={22}
          className="mx-auto text-slate-300"
        />

        <p className="mt-2 text-sm text-slate-500">
          No memo files uploaded.
        </p>
      </div>
    </div>
  );
}