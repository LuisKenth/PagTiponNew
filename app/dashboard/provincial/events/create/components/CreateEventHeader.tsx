import {
  ArrowLeft,
  CalendarPlus,
} from "lucide-react";

type CreateEventHeaderProps = {
  onBack: () => void;
};

export default function CreateEventHeader({
  onBack,
}: CreateEventHeaderProps) {
  return (
    <section className="rounded-2xl bg-white px-5 py-5 shadow-sm sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Back to provincial events"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Provincial Events
              </p>

              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

              <p className="hidden text-xs text-slate-400 sm:block">
                Event Creation
              </p>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Create New Event
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Prepare the event details, schedule, official documents,
              and target municipalities before publishing.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start rounded-xl bg-slate-50 px-3 py-2 sm:self-auto">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
            <CalendarPlus size={16} />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Status
            </p>

            <p className="text-xs font-semibold text-slate-700">
              New Event
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}