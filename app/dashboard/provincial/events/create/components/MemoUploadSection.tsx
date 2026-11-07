"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { FileText, Upload, X } from "lucide-react";

type MemoUploadSectionProps = {
  memoFiles: File[];
  onMemoFilesChange: (files: File[]) => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg"];

export default function MemoUploadSection({
  memoFiles,
  onMemoFilesChange,
}: MemoUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const hasFiles = memoFiles.length > 0;

  const getFileExtension = (fileName: string) => {
    return fileName.split(".").pop()?.toLowerCase() || "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kilobytes = bytes / 1024;

    if (kilobytes < 1024) {
      return `${kilobytes.toFixed(1)} KB`;
    }

    return `${(kilobytes / 1024).toFixed(1)} MB`;
  };

  const fileAlreadyExists = (file: File, currentFiles: File[]) => {
    return currentFiles.some(
      (existingFile) =>
        existingFile.name === file.name &&
        existingFile.size === file.size &&
        existingFile.lastModified === file.lastModified,
    );
  };

  const addFiles = (files: File[]) => {
    setFileError("");

    const acceptedFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const extension = getFileExtension(file.name);

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        errors.push(`${file.name}: unsupported file type`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds the 10 MB limit`);
        continue;
      }

      if (fileAlreadyExists(file, [...memoFiles, ...acceptedFiles])) {
        continue;
      }

      acceptedFiles.push(file);
    }

    if (acceptedFiles.length > 0) {
      onMemoFilesChange([...memoFiles, ...acceptedFiles]);
    }

    if (errors.length > 0) {
      setFileError(errors.join(" • "));
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (inputRef.current?.matches(":disabled")) return;
    const droppedFiles = Array.from(event.dataTransfer.files || []);
    addFiles(droppedFiles);
  };

  const removeFile = (index: number) => {
    onMemoFilesChange(memoFiles.filter((_, fileIndex) => fileIndex !== index));
    setFileError("");
  };

  const removeAllFiles = () => {
    onMemoFilesChange([]);
    setFileError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FileText aria-hidden="true" size={20} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Official Memos</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Attach the official documents for this event.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
          Required to publish
        </span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-5 flex flex-col gap-4 rounded-xl border border-dashed p-4 transition sm:flex-row sm:items-center sm:justify-between ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50"}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Upload
            aria-hidden="true"
            className="h-6 w-6 shrink-0 text-indigo-500"
          />
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {isDragging
                ? "Drop documents here"
                : "Choose or drop your documents"}
            </p>
            <p
              id="memo-file-help"
              className="mt-1 text-xs leading-5 text-slate-500"
            >
              PDF, DOC, DOCX, PNG, JPG, JPEG · Up to 10 MB per file
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Upload aria-hidden="true" size={16} />
          {hasFiles ? "Add Files" : "Choose Files"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        aria-label="Select official memos"
        aria-describedby="memo-file-help"
        className="hidden"
      />

      {fileError && (
        <p
          role="alert"
          className="mt-3 break-words rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700"
        >
          {fileError}
        </p>
      )}

      {hasFiles ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p role="status" className="text-xs font-semibold text-slate-600">
              {memoFiles.length}{" "}
              {memoFiles.length === 1
                ? "document selected"
                : "documents selected"}
            </p>
            <button
              type="button"
              onClick={removeAllFiles}
              className="min-h-10 rounded-lg px-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Remove All
            </button>
          </div>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {memoFiles.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center gap-3 p-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText aria-hidden="true" size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    title={file.name}
                    className="truncate text-sm font-medium text-slate-800"
                  >
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {getFileExtension(file.name).toUpperCase()} ·{" "}
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Selected documents will be uploaded when you save or publish the
            event.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          No documents selected. Add at least one official memo before
          publishing.
        </p>
      )}
    </section>
  );
}
