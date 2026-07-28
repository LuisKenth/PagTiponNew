import type { MunicipalAdmin } from "../types/municipality";
import { formatDate } from "../utils/municipalityUtils";

type PendingAdminsListProps = {
  admins: MunicipalAdmin[];
  processingId: string | null;
  onApprove: (admin: MunicipalAdmin) => void;
  onReject: (admin: MunicipalAdmin) => void;
};

export default function PendingAdminsList({
  admins,
  processingId,
  onApprove,
  onReject,
}: PendingAdminsListProps) {
  return (
    <>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Pending Municipal Admin Approvals
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review municipal administrator applications before granting
          access.
        </p>
      </div>

      {admins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-xl text-green-700">
            ✓
          </div>

          <p className="mt-3 font-semibold text-slate-900">
            No pending approvals
          </p>

          <p className="mt-1 text-sm text-slate-500">
            All municipal administrator applications have been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {admins.map((admin) => {
            const isProcessing = processingId === admin.id;

            return (
              <div
                key={admin.id}
                className="rounded-xl border border-slate-200 p-5"
              >
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">
                        {admin.full_name || "Unnamed Admin"}
                      </h3>

                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Pending
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-800">
                          Municipality:
                        </span>{" "}
                        {admin.municipality || "Not assigned"}
                      </p>

                      <p className="break-all">
                        <span className="font-medium text-slate-800">
                          Email:
                        </span>{" "}
                        {admin.email || "No email"}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Registered:
                        </span>{" "}
                        {formatDate(admin.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onReject(admin)}
                      disabled={isProcessing}
                      className="flex-1 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none"
                    >
                      {isProcessing ? "Processing..." : "Reject"}
                    </button>

                    <button
                      type="button"
                      onClick={() => onApprove(admin)}
                      disabled={isProcessing}
                      className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none"
                    >
                      {isProcessing ? "Processing..." : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
