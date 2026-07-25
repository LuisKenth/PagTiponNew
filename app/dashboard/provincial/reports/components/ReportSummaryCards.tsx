import { getRateClass } from "../utils";

type ReportSummaryCardsProps = {
  eventCount: number;
  totalRegistrations: number;
  totalPresent: number;
  overallAttendanceRate: number;
  municipalityPreparationRate: number;
  totalPreparedAssignments: number;
  totalMunicipalityAssignments: number;
};

export default function ReportSummaryCards({
  eventCount,
  totalRegistrations,
  totalPresent,
  overallAttendanceRate,
  municipalityPreparationRate,
  totalPreparedAssignments,
  totalMunicipalityAssignments,
}: ReportSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">
          Provincial Events
        </p>
        <p className="mt-2 text-3xl font-bold text-slate-900">
          {eventCount}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Events included in the current report
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">
          Municipality Preparation
        </p>

        <div className="mt-2 flex items-center gap-3">
          <p className="text-3xl font-bold text-slate-900">
            {municipalityPreparationRate}%
          </p>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${getRateClass(
              municipalityPreparationRate
            )}`}
          >
            {municipalityPreparationRate >= 80
              ? "Good"
              : municipalityPreparationRate >= 50
              ? "In Progress"
              : "Needs Attention"}
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {totalPreparedAssignments} of {totalMunicipalityAssignments}{" "}
          assignments prepared
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">
          Total Registrations
        </p>
        <p className="mt-2 text-3xl font-bold text-slate-900">
          {totalRegistrations}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Participant event registrations
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">
          Present Participants
        </p>
        <p className="mt-2 text-3xl font-bold text-slate-900">
          {totalPresent}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Participants marked present
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">
          Overall Attendance Rate
        </p>
        <p className="mt-2 text-3xl font-bold text-slate-900">
          {overallAttendanceRate}%
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Present participants vs. registrations
        </p>
      </div>
    </div>
  );
}
