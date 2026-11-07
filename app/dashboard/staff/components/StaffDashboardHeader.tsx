import { MapPin, ScanLine, ShieldCheck } from "lucide-react";

type StaffDashboardHeaderProps = { municipality: string };

export default function StaffDashboardHeader({ municipality }: StaffDashboardHeaderProps) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-white to-emerald-50/70 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <ScanLine className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">Staff Dashboard</h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Event Staff
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">Monitor your assigned event and participant attendance.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          <MapPin className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          {municipality?.trim() || "Assigned municipality"}
        </span>
      </div>
    </header>
  );
}
