import type { MunicipalityReport } from "../types";
import { getRateClass } from "../utils";

type MunicipalityParticipationTableProps = {
  reports: MunicipalityReport[];
  loading: boolean;
};

export default function MunicipalityParticipationTable({
  reports,
  loading,
}: MunicipalityParticipationTableProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Municipality Participation
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Compare event preparation and participant attendance by
          municipality.
        </p>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Loading municipality reports...
        </p>
      ) : reports.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-semibold text-slate-900">
            No municipality participation data
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Try changing or resetting the selected filters.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="py-3 pr-4">Municipality</th>
                <th className="py-3 pr-4 text-center">
                  Events Received
                </th>
                <th className="py-3 pr-4 text-center">Prepared</th>
                <th className="py-3 pr-4">Preparation Rate</th>
                <th className="py-3 pr-4 text-center">
                  Registrations
                </th>
                <th className="py-3 pr-4 text-center">Present</th>
                <th className="py-3">Attendance Rate</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.municipality}
                  className="border-b last:border-b-0 hover:bg-slate-50"
                >
                  <td className="py-4 pr-4 font-semibold text-slate-900">
                    {report.municipality}
                  </td>

                  <td className="py-4 pr-4 text-center text-slate-700">
                    {report.eventsReceived}
                  </td>

                  <td className="py-4 pr-4 text-center text-slate-700">
                    {report.prepared}
                  </td>

                  <td className="py-4 pr-4">
                    <div className="min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-900 transition-all"
                            style={{
                              width: `${Math.min(
                                report.preparationRate,
                                100
                              )}%`,
                            }}
                          />
                        </div>

                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getRateClass(
                            report.preparationRate
                          )}`}
                        >
                          {report.preparationRate}%
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 pr-4 text-center text-slate-700">
                    {report.registrations}
                  </td>

                  <td className="py-4 pr-4 text-center font-medium text-green-700">
                    {report.present}
                  </td>

                  <td className="py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${getRateClass(
                        report.attendanceRate
                      )}`}
                    >
                      {report.attendanceRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
