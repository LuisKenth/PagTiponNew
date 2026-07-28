export default function MunicipalityDetailLoading() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

      <p className="mt-4 text-sm text-slate-500">
        Loading municipality details...
      </p>
    </div>
  );
}