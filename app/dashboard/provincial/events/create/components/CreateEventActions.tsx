"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Save,
  Send,
} from "lucide-react";

type SubmitAction = "draft" | "published" | null;

type CreateEventActionsProps = {
  submitAction: SubmitAction;

  title: string;
  description: string;
  startAt: string;
  endAt: string;
  memoCount: number;
  municipalityCount: number;

  onCancel: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
};

export default function CreateEventActions({
  submitAction,
  title,
  description,
  startAt,
  endAt,
  memoCount,
  municipalityCount,
  onCancel,
  onSaveDraft,
  onPublish,
}: CreateEventActionsProps) {
  const loading = submitAction !== null;

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const requirements = useMemo(() => {
    const startDate = startAt ? new Date(startAt) : null;
    const endDate = endAt ? new Date(endAt) : null;

    const validStart =
      startDate !== null &&
      !Number.isNaN(startDate.getTime()) &&
      startDate.getTime() > now.getTime();

    const validEnd =
      startDate !== null &&
      endDate !== null &&
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      endDate.getTime() > startDate.getTime();

    return [
      {
        label: "Event title",
        complete: title.trim().length > 0,
      },
      {
        label: "Description",
        complete: description.trim().length > 0,
      },
      {
        label: "Valid schedule",
        complete: validStart && validEnd,
      },
      {
        label: "Official memo",
        complete: memoCount > 0,
      },
      {
        label: "Municipality",
        complete: municipalityCount > 0,
      },
    ];
  }, [
    title,
    description,
    startAt,
    endAt,
    memoCount,
    municipalityCount,
    now,
  ]);

  const missingRequirements = requirements.filter(
    (item) => !item.complete
  );

  const readyToPublish =
    missingRequirements.length === 0;

  return (
    <section className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:bottom-4 sm:p-4">
      <div className="flex flex-col gap-4">
        {/* Status */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${readyToPublish
                ? "bg-emerald-50 text-emerald-600"
                : "bg-amber-50 text-amber-600"
                }`}
            >
              {readyToPublish ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                {readyToPublish
                  ? "Ready to publish"
                  : `${missingRequirements.length} ${missingRequirements.length === 1
                    ? "requirement"
                    : "requirements"
                  } remaining`}
              </p>

              <p className="text-xs text-slate-500">
                {readyToPublish
                  ? "All required event information is complete."
                  : "You can still save this event as a draft."}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="col-span-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:col-auto"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onSaveDraft}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />

              {submitAction === "draft"
                ? "Saving Draft..."
                : "Save as Draft"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onPublish}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${readyToPublish
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-slate-700 hover:bg-slate-800"
                }`}
            >
              <Send size={16} />

              {submitAction === "published"
                ? "Publishing..."
                : "Publish Event"}
            </button>
          </div>
        </div>

        {/* Requirement checklist */}
        {!readyToPublish && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {requirements.map((item) => (
              <div
                key={item.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${item.complete
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
                  }`}
              >
                {item.complete ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                )}

                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}