import { Mail, UserRound } from "lucide-react";

import type { MunicipalAdmin } from "../../types/municipality";
import { formatDate } from "../../utils/municipalityUtils";

type MunicipalityAdminSectionProps = {
  admins: MunicipalAdmin[];
};

function getAdminStatusClass(
  status: MunicipalAdmin["verification_status"]
) {
  if (status === "approved") {
    return "bg-green-50 text-green-700";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getAdminStatusLabel(
  status: MunicipalAdmin["verification_status"]
) {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";

  return "Unknown";
}

export default function MunicipalityAdminSection({
  admins,
}: MunicipalityAdminSectionProps) {
  const activeAdmins = admins.filter(
    (admin) => admin.verification_status !== "rejected"
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Municipal Administrators
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Approved and pending administrator accounts assigned
          to this municipality.
        </p>
      </div>

      {activeAdmins.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
            <UserRound size={22} />
          </div>

          <p className="mt-3 font-semibold text-slate-900">
            No municipal administrator
          </p>

          <p className="mt-1 text-sm text-slate-500">
            No approved or pending administrator account is
            currently assigned.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {activeAdmins.map((admin) => (
            <div
              key={admin.id}
              className="rounded-xl border border-slate-200 p-4"
            >
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
                    admin.verification_status
                  )}`}
                >
                  {getAdminStatusLabel(
                    admin.verification_status
                  )}
                </span>
              </div>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}