import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { MunicipalityOverviewItem } from "../types/municipality";
import {
  getDisplayAdmin,
  getMunicipalityCardClass,
  getMunicipalityStatusClass,
  getMunicipalityStatusLabel,
  toMunicipalitySlug,
} from "../utils/municipalityUtils";

type MunicipalityCardProps = {
  municipality: MunicipalityOverviewItem;
};

export default function MunicipalityCard({
  municipality,
}: MunicipalityCardProps) {
  const displayedAdmin = getDisplayAdmin(
    municipality.approvedAdmins,
    municipality.pendingAdmins
  );

  const totalRelevantAdmins =
    municipality.approvedAdmins.length +
    municipality.pendingAdmins.length;

  const municipalitySlug = toMunicipalitySlug(
    municipality.name
  );

  return (
    <div
      className={`flex h-full flex-col rounded-xl border p-4 transition hover:shadow-sm ${getMunicipalityCardClass(
        municipality.status
      )}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Municipality
          </p>

          <h3 className="mt-1 text-base font-bold text-slate-900">
            {municipality.name}
          </h3>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getMunicipalityStatusClass(
            municipality.status
          )}`}
        >
          {getMunicipalityStatusLabel(municipality.status)}
        </span>
      </div>

      <div className="mt-4 flex-1 border-t border-slate-200/80 pt-4">
        {displayedAdmin ? (
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-slate-400">
                Administrator
              </p>

              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                {displayedAdmin.full_name || "Unnamed Admin"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                Email
              </p>

              <p className="mt-0.5 break-all text-sm text-slate-600">
                {displayedAdmin.email || "No email"}
              </p>
            </div>

            {totalRelevantAdmins > 1 && (
              <p className="text-xs font-medium text-slate-500">
                +{totalRelevantAdmins - 1} additional{" "}
                {totalRelevantAdmins - 1 === 1
                  ? "administrator"
                  : "administrators"}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center">
            <p className="text-sm font-medium text-slate-700">
              No municipal administrator
            </p>

            <p className="mt-1 text-xs text-slate-500">
              No approved or pending account is assigned.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-slate-200/80 pt-4">
        <Link
          href={`/dashboard/provincial/municipalities/${municipalitySlug}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          View Details
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}