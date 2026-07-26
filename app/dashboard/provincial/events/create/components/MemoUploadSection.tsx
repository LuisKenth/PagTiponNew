"use client";

import {
  useRef,
  useState,
} from "react";

import type {
  ChangeEvent,
  DragEvent,
} from "react";

import {
  FilePlus2,
  FileText,
  Upload,
  X,
} from "lucide-react";

type MemoUploadSectionProps = {
  memoFiles: File[];
  onMemoFilesChange: (files: File[]) => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "png",
  "jpg",
  "jpeg",
];

export default function MemoUploadSection({
  memoFiles,
  onMemoFilesChange,
}: MemoUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] =
    useState(false);

  const [fileError, setFileError] =
    useState("");

  const getFileExtension = (fileName: string) => {
    return (
      fileName
        .split(".")
        .pop()
        ?.toLowerCase() || ""
    );
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

  const fileAlreadyExists = (
    file: File,
    currentFiles: File[]
  ) => {
    return currentFiles.some(
      (existingFile) =>
        existingFile.name === file.name &&
        existingFile.size === file.size &&
        existingFile.lastModified ===
          file.lastModified
    );
  };

  const addFiles = (files: File[]) => {
    setFileError("");

    const acceptedFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const extension =
        getFileExtension(file.name);

      if (
        !ALLOWED_EXTENSIONS.includes(extension)
      ) {
        errors.push(
          `${file.name}: unsupported file type`
        );

        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(
          `${file.name}: exceeds the 10 MB limit`
        );

        continue;
      }

      if (
        fileAlreadyExists(
          file,
          [...memoFiles, ...acceptedFiles]
        )
      ) {
        continue;
      }

      acceptedFiles.push(file);
    }

    if (acceptedFiles.length > 0) {
      onMemoFilesChange([
        ...memoFiles,
        ...acceptedFiles,
      ]);
    }

    if (errors.length > 0) {
      setFileError(errors.join(" • "));
    }
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles =
      Array.from(event.target.files || []);

    addFiles(selectedFiles);

    /*
     * Reset input so the same file may be
     * selected again later after being removed.
     */
    event.target.value = "";
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(true);
  };

  const handleDragLeave = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);

    const droppedFiles = Array.from(
      event.dataTransfer.files || []
    );

    addFiles(droppedFiles);
  };

  const removeFile = (index: number) => {
    onMemoFilesChange(
      memoFiles.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );

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
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <FileText size={19} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Official Memos
            </h2>

            <p className="text-sm text-slate-500">
              Attach one or more official documents
              for this provincial event.
            </p>
          </div>
        </div>

        {memoFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {memoFiles.length}{" "}
              {memoFiles.length === 1
                ? "file"
                : "files"}
            </span>

            <button
              type="button"
              onClick={removeAllFiles}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
            >
              Remove All
            </button>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        onClick={() =>
          inputRef.current?.click()
        }
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? "border-slate-500 bg-slate-100"
            : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/70"
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
          {memoFiles.length > 0 ? (
            <FilePlus2 size={21} />
          ) : (
            <Upload size={21} />
          )}
        </div>

        <p className="mt-3 text-sm font-semibold text-slate-700">
          {isDragging
            ? "Drop the files here"
            : memoFiles.length > 0
              ? "Add more official documents"
              : "Upload official documents"}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Click to browse or drag and drop
          multiple files
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {[
            "PDF",
            "DOC",
            "DOCX",
            "PNG",
            "JPG",
          ].map((type) => (
            <span
              key={type}
              className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-500"
            >
              {type}
            </span>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          Maximum file size: 10 MB per file
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Error */}
      {fileError && (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs font-medium leading-5 text-red-600">
            {fileError}
          </p>
        </div>
      )}

      {/* Selected Files */}
      {memoFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Selected Documents
          </p>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {memoFiles.map(
              (file, index) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="flex items-center gap-3 bg-white px-4 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <FileText size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700">
                      {file.name}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>
                        {getFileExtension(
                          file.name
                        ).toUpperCase()}
                      </span>

                      <span>•</span>

                      <span>
                        {formatFileSize(
                          file.size
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeFile(index);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    aria-label={`Remove ${file.name}`}
                    title="Remove file"
                  >
                    <X size={17} />
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Information */}
      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-xs leading-5 text-slate-500">
          At least one official memo is required
          before publishing. You may attach
          multiple supporting documents to a
          single event. Draft events may be saved
          without any memo.
        </p>
      </div>
    </section>
  );
}