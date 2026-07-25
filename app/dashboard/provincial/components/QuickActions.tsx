import Link from "next/link";

export default function QuickActions() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">
        Quick Actions
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Common provincial admin tasks.
      </p>

      <div className="mt-5 space-y-3">
        <Link
          href="/dashboard/provincial/events/create"
          className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">
            Create Provincial Event
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Create an event and select target municipalities.
          </p>
        </Link>

        <Link
          href="/dashboard/provincial/memos"
          className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">
            Manage Official Memos
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Review uploaded official event memos.
          </p>
        </Link>

        <Link
          href="/dashboard/provincial/reports"
          className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <p className="font-semibold text-slate-900">
            View Event Reports
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Check attendance and participation summaries.
          </p>
        </Link>
      </div>
    </div>
  );
}
