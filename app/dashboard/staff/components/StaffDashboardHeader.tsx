import {
  MapPin,
  QrCode,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

type StaffDashboardHeaderProps = {
  municipality: string;
};

export default function StaffDashboardHeader({
  municipality,
}: StaffDashboardHeaderProps) {
  const municipalityLabel =
    municipality?.trim() || "Assigned Municipality";

  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-32 h-28 w-28 rounded-full bg-teal-100/50 blur-2xl" />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Main heading */}
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <ScanLine className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Staff Dashboard
              </h1>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Event Staff
              </span>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage event check-in, scan participant QR codes, and monitor
              attendance records for your assigned municipality.
            </p>

            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <MapPin
                className="h-4 w-4 shrink-0 text-emerald-600"
                aria-hidden="true"
              />

              <span className="truncate">
                Assigned to{" "}
                <span className="font-semibold text-slate-900">
                  {municipalityLabel}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Header feature indicators */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200">
              <QrCode className="h-4.5 w-4.5" aria-hidden="true" />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Check-In</p>
              <p className="text-sm font-semibold text-slate-900">
                QR Enabled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200">
              <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Access</p>
              <p className="text-sm font-semibold text-slate-900">
                Protected
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}