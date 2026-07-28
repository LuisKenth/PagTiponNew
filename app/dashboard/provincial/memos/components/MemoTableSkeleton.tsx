export default function MemoTableSkeleton() {
  return (
    <>
      {/* MOBILE SKELETON */}
      <div className="mt-5 space-y-3 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-slate-200" />
                <div className="h-4 w-40 rounded bg-slate-200" />
              </div>

              <div className="h-6 w-20 rounded-full bg-slate-200" />
            </div>

            <div className="mt-5 space-y-2">
              <div className="h-3 w-12 rounded bg-slate-200" />
              <div className="h-4 w-48 rounded bg-slate-200" />
            </div>

            <div className="mt-5 space-y-2">
              <div className="h-3 w-32 rounded bg-slate-200" />

              <div className="flex gap-2">
                <div className="h-6 w-20 rounded bg-slate-200" />
                <div className="h-6 w-20 rounded bg-slate-200" />
              </div>
            </div>

            <div className="mt-5 h-4 w-36 rounded bg-slate-200" />

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
              <div className="h-9 rounded-lg bg-slate-200" />
              <div className="h-9 rounded-lg bg-slate-200" />
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP SKELETON */}
      <div className="mt-5 hidden overflow-hidden rounded-xl border border-slate-200 md:block">
        <div className="animate-pulse">
          <div className="grid grid-cols-6 gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-3 rounded bg-slate-200"
              />
            ))}
          </div>

          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-6 gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0"
            >
              {Array.from({ length: 6 }).map((_, cellIndex) => (
                <div
                  key={cellIndex}
                  className="h-4 rounded bg-slate-200"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}