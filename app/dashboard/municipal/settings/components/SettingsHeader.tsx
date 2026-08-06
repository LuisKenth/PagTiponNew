import {
  Settings2,
  ShieldCheck,
} from "lucide-react";

export default function SettingsHeader() {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Settings2 className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Municipal Settings
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Manage your municipal administrator profile and account
              security.
            </p>
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Protected account
        </div>
      </div>
    </header>
  );
}
