export default function MunicipalDashboardLoading() {
  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 py-10 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

      <p className="mt-3 text-sm text-slate-500">
        Loading received events...
      </p>
    </div>
  );
}
