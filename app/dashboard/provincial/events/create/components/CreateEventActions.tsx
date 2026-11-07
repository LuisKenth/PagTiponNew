"use client";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Save,
  Send,
  ClipboardCheck,
} from "lucide-react";
type Props = {
  draftSaveLabel?: string;
  requirementsOverride?: { label: string; complete: boolean }[];
  footerText?: string;
  submitAction: "draft" | "published" | null;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  memoCount: number;
  municipalityCount: number;
  audienceComplete: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
};
export default function CreateEventActions({
  draftSaveLabel = "Save as Draft",
  requirementsOverride,
  footerText,
  submitAction,
  title,
  description,
  startAt,
  endAt,
  memoCount,
  municipalityCount,
  audienceComplete,
  onCancel,
  onSaveDraft,
  onPublish,
}: Props) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);
  const start = Date.parse(startAt),
    end = Date.parse(endAt),
    loading = submitAction !== null;
  const requirements = requirementsOverride ?? [
    { label: "Event title", complete: !!title.trim() },
    { label: "Event description", complete: !!description.trim() },
    { label: "Participant audience", complete: audienceComplete },
    {
      label: "Future start and valid end time",
      complete:
        !!now &&
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start > now.getTime() &&
        end > start,
    },
    { label: "At least one official memo", complete: memoCount > 0 },
    { label: "At least one municipality", complete: municipalityCount > 0 },
  ];
  const complete = requirements.filter((r) => r.complete).length,
    ready = complete === requirements.length;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">Review & Publish</h2>
          <p className="mt-1 text-xs text-slate-500">
            {complete} of {requirements.length} requirements complete
          </p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Publishing requirements"
        aria-valuenow={complete}
        aria-valuemin={0}
        aria-valuemax={requirements.length}
        className="h-1.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${(complete / requirements.length) * 100}%` }}
        />
      </div>
      <ul className="my-5 space-y-3">
        {requirements.map((r) => (
          <li
            key={r.label}
            className={`flex items-start gap-2.5 text-xs leading-5 ${r.complete ? "text-emerald-700" : "text-slate-500"}`}
          >
            {r.complete ? (
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
            ) : (
              <Circle
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-300"
              />
            )}
            <span>
              {r.label}
              <span className="sr-only">
                {r.complete ? ": complete" : ": incomplete"}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p
        role="status"
        className={`mb-4 rounded-xl p-3 text-xs leading-5 ${ready ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}`}
      >
        {ready
          ? "Ready to publish. Review the information before continuing."
          : "Complete the publishing requirements above. You can also save a draft and continue later."}
      </p>
      <div className="space-y-2.5">
        <button
          type="button"
          disabled={loading}
          onClick={onPublish}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitAction === "published" ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Send aria-hidden="true" className="h-4 w-4" />
          )}
          {submitAction === "published" ? "Publishing…" : "Publish Event"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onSaveDraft}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {submitAction === "draft" ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {submitAction === "draft" ? "Saving Draft…" : draftSaveLabel}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="min-h-11 w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">
        {footerText ??
          "Publishing assigns this event to the selected municipalities and starts the notification process."}
      </p>
    </section>
  );
}
