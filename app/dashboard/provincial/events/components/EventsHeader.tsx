import Link from "next/link";

export default function EventsHeader() {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Provincial Administration
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Provincial Events
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Manage provincial events, official memos, target municipalities,
          and preparation progress.
        </p>
      </div>

      <Link
        href="/dashboard/provincial/events/create"
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        + Create Provincial Event
      </Link>
    </div>
  );
}
