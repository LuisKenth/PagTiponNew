import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

type MunicipalityDetailHeaderProps = {
  municipalityName: string;
};

export default function MunicipalityDetailHeader({
  municipalityName,
}: MunicipalityDetailHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Link
        href="/dashboard/provincial/municipalities"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={17} />
        Back to Municipalities
      </Link>

      <div className="mt-5 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Building2 size={24} />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500">
            Municipality Details
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {municipalityName}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review administrators, provincial events, and
            municipality preparation status.
          </p>
        </div>
      </div>
    </div>
  );
}