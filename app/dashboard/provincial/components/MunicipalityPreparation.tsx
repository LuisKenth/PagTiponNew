import Link from "next/link";
import type {
  EventMunicipalityRow,
  EventRow,
} from "../types";
import {
  formatStatusLabel,
  getEventTitle,
  getStatusStyle,
} from "../utils";

type MunicipalityPreparationProps = {
  loading: boolean;
  events: EventRow[];
  eventMunicipalities: EventMunicipalityRow[];
};

export default function MunicipalityPreparation({
  loading,
  events,
  eventMunicipalities,
}: MunicipalityPreparationProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Municipality Preparation Status
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitor preparation and registration status of target
            municipalities.
          </p>
        </div>

        <Link
          href="/dashboard/provincial/municipalities"
          className="text-sm font-semibold text-slate-700 hover:text-slate-950"
        >
          View municipalities →
        </Link>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Municipality
                </th>
                <th className="px-4 py-3 font-medium">
                  Event Name
                </th>
                <th className="px-4 py-3 font-medium">
                  Preparation Status
                </th>
                <th className="px-4 py-3 font-medium">
                  Registration Status
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Loading municipality status...
                  </td>
                </tr>
              ) : eventMunicipalities.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No municipality assignments yet.
                  </td>
                </tr>
              ) : (
                eventMunicipalities.slice(0, 8).map((item, index) => {
                  const preparationStatus = String(
                    item.status || "pending"
                  );

                  const registrationStatus = String(
                    item.registration_status || "closed"
                  );

                  return (
                    <tr
                      key={`${String(item.event_id)}-${item.municipality}-${index}`}
                      className="border-t border-slate-200 hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.municipality || "N/A"}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-700">
                        {getEventTitle(events, item.event_id)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                            preparationStatus
                          )}`}
                        >
                          {formatStatusLabel(preparationStatus)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                            registrationStatus
                          )}`}
                        >
                          {formatStatusLabel(registrationStatus)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
