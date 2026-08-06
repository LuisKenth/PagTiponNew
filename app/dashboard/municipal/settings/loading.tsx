export default function MunicipalSettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-200" />

          <div className="space-y-2">
            <div className="h-6 w-52 rounded bg-slate-200" />
            <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <LoadingCard rows={5} />
        <LoadingCard rows={4} />
      </div>
    </div>
  );
}

function LoadingCard({
  rows,
}: {
  rows: number;
}) {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-6 w-44 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-64 max-w-full rounded bg-slate-100" />

      <div className="mt-7 space-y-4">
        {Array.from({ length: rows }).map(
          (_, index) => (
            <div
              key={index}
              className="h-12 rounded-xl bg-slate-100"
            />
          ),
        )}
      </div>
    </div>
  );
}
