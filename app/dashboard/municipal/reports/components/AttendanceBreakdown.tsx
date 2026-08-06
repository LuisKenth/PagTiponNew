import type {
  MunicipalReportSummary,
} from "../types/municipalReports";

type AttendanceBreakdownProps = {
  summary: MunicipalReportSummary;
};

function getPercentage(
  value: number,
  total: number,
) {
  if (total <= 0) {
    return 0;
  }

  return (value / total) * 100;
}

const attendanceItems = [
  {
    key: "presentCount",
    label: "Present",
    colorClass: "bg-emerald-500",
    textClass: "text-emerald-700",
  },
  {
    key: "lateCount",
    label: "Late",
    colorClass: "bg-amber-400",
    textClass: "text-amber-700",
  },
  {
    key: "absentCount",
    label: "Absent",
    colorClass: "bg-red-500",
    textClass: "text-red-700",
  },
  {
    key: "pendingCount",
    label: "Pending",
    colorClass: "bg-slate-400",
    textClass: "text-slate-700",
  },
] as const;

const methodItems = [
  {
    key: "qrCheckInCount",
    label: "QR Check-ins",
    colorClass: "bg-blue-500",
    textClass: "text-blue-700",
  },
  {
    key: "manualCheckInCount",
    label: "Manual Check-ins",
    colorClass: "bg-violet-500",
    textClass: "text-violet-700",
  },
] as const;

export default function AttendanceBreakdown({
  summary,
}: AttendanceBreakdownProps) {
  const attendanceDenominator =
    summary.attendanceEligibleRegistrations;

  const methodTotal =
    summary.qrCheckInCount +
    summary.manualCheckInCount;

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-slate-900">
          Attendance Breakdown
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Distribution of attendance outcomes
          for ongoing and completed events.
        </p>

        <div className="mt-6 space-y-6">
          {attendanceItems.map((item) => {
            const value =
              summary[item.key];

            const percentage =
              getPercentage(
                value,
                attendanceDenominator,
              );

            return (
              <div key={item.key}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-base font-semibold text-slate-900">
                    {item.label}
                  </p>

                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${item.textClass}`}
                    >
                      {value}{" "}
                      {value === 1
                        ? "participant"
                        : "participants"}
                    </p>

                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      {percentage.toFixed(
                        1,
                      )}
                      % of{" "}
                      {
                        attendanceDenominator
                      }{" "}
                      eligible
                      registrations
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.colorClass}`}
                    style={{
                      width: `${Math.min(
                        100,
                        percentage,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Attendance-Eligible Registrations
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {
              attendanceDenominator
            }
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Registrations from cancelled and
            not-yet-started events are excluded
            from attendance percentages.
          </p>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-slate-900">
          Check-in Methods
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Comparison of QR and manual
          attendance recording.
        </p>

        <div className="mt-6 space-y-6">
          {methodItems.map((item) => {
            const value =
              summary[item.key];

            const percentage =
              getPercentage(
                value,
                methodTotal,
              );

            return (
              <div key={item.key}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-base font-semibold text-slate-900">
                    {item.label}
                  </p>

                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${item.textClass}`}
                    >
                      {value}{" "}
                      {value === 1
                        ? "check-in"
                        : "check-ins"}
                    </p>

                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      {percentage.toFixed(
                        1,
                      )}
                      % of {methodTotal}{" "}
                      recorded check-ins
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.colorClass}`}
                    style={{
                      width: `${Math.min(
                        100,
                        percentage,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Recorded Check-ins
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {methodTotal}
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Includes participants recorded
            through QR scanning or manual
            event-staff entry.
          </p>
        </div>
      </article>
    </section>
  );
}