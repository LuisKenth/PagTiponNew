import {
  AlignLeft,
  FileText,
} from "lucide-react";

type EventDetailsSectionProps = {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

const TITLE_MAX_LENGTH = 150;
const DESCRIPTION_MAX_LENGTH = 2000;

export default function EventDetailsSection({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: EventDetailsSectionProps) {
  const titleRemaining =
    TITLE_MAX_LENGTH - title.length;

  const descriptionRemaining =
    DESCRIPTION_MAX_LENGTH - description.length;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <FileText size={19} />
        </div>

        <div>
          <h2 className="font-semibold text-slate-900">
            Event Details
          </h2>

          <p className="text-sm text-slate-500">
            Provide the basic information for the provincial event.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Event Title */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="event-title"
              className="text-sm font-medium text-slate-700"
            >
              Event Title
            </label>

            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
              Required
            </span>
          </div>

          <div className="relative">
            <FileText
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="event-title"
              type="text"
              value={title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={(e) =>
                onTitleChange(e.target.value)
              }
              placeholder="Example: Provincial Youth Development Summit"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />

            <span
              className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium ${
                titleRemaining <= 20
                  ? "text-amber-500"
                  : "text-slate-400"
              }`}
            >
              {title.length}/{TITLE_MAX_LENGTH}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Use a clear and recognizable name for the event.
          </p>
        </div>

        {/* Description */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="event-description"
              className="text-sm font-medium text-slate-700"
            >
              Event Description
            </label>

            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
              Required to publish
            </span>
          </div>

          <div className="relative">
            <AlignLeft
              size={17}
              className="pointer-events-none absolute left-4 top-4 text-slate-400"
            />

            <textarea
              id="event-description"
              value={description}
              maxLength={DESCRIPTION_MAX_LENGTH}
              onChange={(e) =>
                onDescriptionChange(e.target.value)
              }
              placeholder="Describe the purpose, objectives, and important information about this event..."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Draft events may be saved without a description.
            </p>

            <span
              className={`shrink-0 text-[11px] font-medium ${
                descriptionRemaining <= 200
                  ? "text-amber-500"
                  : "text-slate-400"
              }`}
            >
              {description.length}/{DESCRIPTION_MAX_LENGTH}
            </span>
          </div>
        </div>
      </div>

      {/* Information */}
      <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-xs leading-5 text-slate-500">
          The event title is required when saving a draft.
          A complete description is required before the event can be
          published to the selected municipalities.
        </p>
      </div>
    </section>
  );
}