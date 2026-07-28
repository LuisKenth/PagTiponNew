import type { MunicipalAdmin } from "../types/municipality";
import { formatDate } from "../utils/municipalityUtils";

type MunicipalAdminsListProps = {
  admins: MunicipalAdmin[];
};

export default function MunicipalAdminsList({
  admins,
}: MunicipalAdminsListProps) {
  return (
    <>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Municipal Administrators
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Approved municipal administrator accounts.
        </p>
      </div>

      {admins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-medium text-slate-900">
            No approved municipal administrators
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Approved accounts will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {admin.full_name || "Unnamed Admin"}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {admin.municipality || "Not assigned"}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    Approved
                  </span>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                  <p className="break-all text-slate-600">
                    <span className="font-medium text-slate-800">
                      Email:
                    </span>{" "}
                    {admin.email || "No email"}
                  </p>

                  <p className="text-slate-600">
                    <span className="font-medium text-slate-800">
                      Registered:
                    </span>{" "}
                    {formatDate(admin.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4">Administrator</th>
                  <th className="py-3 pr-4">Municipality</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3">Registered</th>
                </tr>
              </thead>

              <tbody>
                {admins.map((admin) => (
                  <tr
                    key={admin.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="py-4 pr-4 font-semibold text-slate-900">
                      {admin.full_name || "Unnamed Admin"}
                    </td>

                    <td className="py-4 pr-4 text-slate-600">
                      {admin.municipality || "Not assigned"}
                    </td>

                    <td className="py-4 pr-4 text-slate-600">
                      {admin.email || "No email"}
                    </td>

                    <td className="py-4 pr-4">
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        Approved
                      </span>
                    </td>

                    <td className="py-4 text-slate-500">
                      {formatDate(admin.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
