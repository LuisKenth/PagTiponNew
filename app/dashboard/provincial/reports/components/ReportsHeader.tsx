type ReportsHeaderProps = {
  loading: boolean;
  onRefresh: () => void;
};

export default function ReportsHeader({
  loading,
  onRefresh,
}: ReportsHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Provincial Admin
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Reports
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Monitor event participation, attendance, and municipality
          preparation across provincial events.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? "Refreshing..." : "Refresh Reports"}
      </button>
    </div>
  );
}
