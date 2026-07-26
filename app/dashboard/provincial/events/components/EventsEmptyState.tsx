import Link from "next/link";

export default function EventsEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">
        📅
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        No provincial events yet
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Create your first provincial event and assign the municipalities
        that should participate.
      </p>

      <Link
        href="/dashboard/provincial/events/create"
        className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Create Event
      </Link>
    </div>
  );
}
