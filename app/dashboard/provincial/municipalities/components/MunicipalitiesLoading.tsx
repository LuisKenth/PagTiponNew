export default function MunicipalitiesLoading() {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

      <p className="mt-3 text-sm text-slate-500">
        Loading municipality information...
      </p>
    </div>
  );
}
