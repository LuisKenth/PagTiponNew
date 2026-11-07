"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Eye,
  Fingerprint,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import MunicipalAdminActions from "../../components/MunicipalAdminActions";
import { MUNICIPAL_ADMIN_LIMIT } from "@/lib/municipalAdminLimit";

import type { MunicipalAdmin } from "../../types/municipality";
import { formatDate } from "../../utils/municipalityUtils";

type MunicipalityAdminSectionProps = {
  admins: MunicipalAdmin[];
  onChanged: () => void;
};

function getAdminStatusClass(status: MunicipalAdmin["verification_status"]) {
  if (status === "approved") {
    return "bg-green-50 text-green-700";
  }

  if (status === "inactive") {
    return "bg-slate-100 text-slate-600";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getAdminStatusLabel(status: MunicipalAdmin["verification_status"]) {
  if (status === "approved") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";

  return "Unknown";
}

export default function MunicipalityAdminSection({
  admins,
  onChanged,
}: MunicipalityAdminSectionProps) {
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  const selectedAdmin =
    admins.find((admin) => admin.id === selectedAdminId) || null;

  const approvedCount = admins.filter(
    (admin) => admin.verification_status === "approved",
  ).length;

  const inactiveCount = admins.filter(
    (admin) => admin.verification_status === "inactive",
  ).length;

  useEffect(() => {
    if (!selectedAdminId) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedAdminId(null);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedAdminId]);

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Municipal Administrators
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            View profiles and manage administrator accounts assigned to this
            municipality.
          </p>
        </div>

        {/* Account Summary */}
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
            {approvedCount}/{MUNICIPAL_ADMIN_LIMIT} approved slots used
          </span>

          <span className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            {approvedCount} Active
          </span>

          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
            {inactiveCount} Inactive
          </span>
        </div>

        {admins.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
              <UserRound size={22} />
            </div>

            <p className="mt-3 font-semibold text-slate-900">
              No municipal administrator
            </p>

            <p className="mt-1 text-sm text-slate-500">
              No administrator account is currently assigned.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                {/* Admin Information */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                      <UserRound size={19} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">
                        {admin.full_name || "Unnamed Admin"}
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Registered {formatDate(admin.created_at)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getAdminStatusClass(
                      admin.verification_status,
                    )}`}
                  >
                    {getAdminStatusLabel(admin.verification_status)}
                  </span>
                </div>

                {/* Email */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <Mail
                      size={16}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />

                    <span className="break-all">
                      {admin.email || "No email address"}
                    </span>
                  </div>
                </div>

                {/* Administrator Action Buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-2 [&>*]:!mt-0">
                  
                  {/* View Profile */}
                  <button
                    type="button"
                    onClick={() => setSelectedAdminId(admin.id)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <Eye size={16} />
                    View Profile
                  </button>

                  {/* Activate / Deactivate / Delete */}
                  <MunicipalAdminActions admin={admin} onChanged={onChanged} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Municipal Admin Profile Modal */}
      {selectedAdmin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedAdminId(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="municipal-admin-profile-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2
                  id="municipal-admin-profile-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Municipal Admin Profile
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Administrator account information
                </p>
              </div>

              <button
                type="button"
                aria-label="Close profile"
                onClick={() => setSelectedAdminId(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Content */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                  <UserRound size={27} />
                </div>

                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold text-slate-900">
                    {selectedAdmin.full_name || "Unnamed Admin"}
                  </h3>

                  <p className="text-sm text-slate-500">
                    Municipal Administrator
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getAdminStatusClass(
                      selectedAdmin.verification_status,
                    )}`}
                  >
                    {getAdminStatusLabel(selectedAdmin.verification_status)}
                  </span>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                {/* Full Name */}
                <div className="flex items-start gap-3">
                  <UserRound
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Full Name
                    </p>

                    <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                      {selectedAdmin.full_name || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 shrink-0 text-slate-400" />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Email Address
                    </p>

                    <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                      {selectedAdmin.email || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Municipality */}
                <div className="flex items-start gap-3">
                  <Building2
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Assigned Municipality
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedAdmin.municipality || "Not assigned"}
                    </p>
                  </div>
                </div>

                {/* Role and Status */}
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Account Role / Status
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Municipal Admin —{" "}
                      {getAdminStatusLabel(selectedAdmin.verification_status)}
                    </p>
                  </div>
                </div>

                {/* Registration Date */}
                <div className="flex items-start gap-3">
                  <CalendarDays
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Registration Date
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(selectedAdmin.created_at)}
                    </p>
                  </div>
                </div>

                {/* Account ID */}
                <div className="flex items-start gap-3">
                  <Fingerprint
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Account ID
                    </p>

                    <p className="mt-1 break-all font-mono text-xs text-slate-700">
                      {selectedAdmin.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedAdminId(null)}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
