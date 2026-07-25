import type { EventReport } from "../types";

type AttendanceTrendProps = {
  reports: EventReport[];
  loading: boolean;
};

type TrendPoint = {
  id: string;
  title: string;
  date: Date;
  dateLabel: string;
  registrations: number;
  present: number;
  attendanceRate: number;
};

function formatTrendDate(date: Date) {
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

export default function AttendanceTrend({
  reports,
  loading,
}: AttendanceTrendProps) {
  const trendData: TrendPoint[] = reports
    .filter((report) => {
      if (!report.event.start_at) {
        return false;
      }

      const date = new Date(report.event.start_at);

      return (
        !Number.isNaN(date.getTime()) &&
        report.registrations > 0
      );
    })
    .map((report) => {
      const date = new Date(
        report.event.start_at as string
      );

      return {
        id: String(report.event.id),
        title:
          report.event.title || "Untitled Event",
        date,
        dateLabel: formatTrendDate(date),
        registrations: report.registrations,
        present: report.present,
        attendanceRate: report.attendanceRate,
      };
    })
    .sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime()
    );

  const chartHeight = 320;

  const padding = {
    top: 30,
    right: 40,
    bottom: 80,
    left: 55,
  };

  const pointSpacing = 130;

  const chartWidth = Math.max(
    700,
    padding.left +
      padding.right +
      Math.max(trendData.length - 1, 1) *
        pointSpacing
  );

  const plotWidth =
    chartWidth - padding.left - padding.right;

  const plotHeight =
    chartHeight - padding.top - padding.bottom;

  const getX = (index: number) => {
    if (trendData.length <= 1) {
      return padding.left + plotWidth / 2;
    }

    return (
      padding.left +
      (index / (trendData.length - 1)) *
        plotWidth
    );
  };

  const getY = (rate: number) => {
    return (
      padding.top +
      plotHeight -
      (rate / 100) * plotHeight
    );
  };

  const linePoints = trendData
    .map(
      (point, index) =>
        `${getX(index)},${getY(
          point.attendanceRate
        )}`
    )
    .join(" ");

  const averageAttendance =
    trendData.length > 0
      ? Math.round(
          trendData.reduce(
            (total, point) =>
              total + point.attendanceRate,
            0
          ) / trendData.length
        )
      : 0;

  const bestEvent =
    trendData.length > 0
      ? [...trendData].sort(
          (a, b) =>
            b.attendanceRate -
            a.attendanceRate
        )[0]
      : null;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Attendance Trend
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track attendance performance across
            provincial events over time.
          </p>
        </div>

        {!loading && trendData.length > 0 && (
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {trendData.length}{" "}
            {trendData.length === 1
              ? "event"
              : "events"}
          </span>
        )}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">
          Loading attendance trend...
        </p>
      ) : trendData.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-semibold text-slate-900">
            No attendance trend available
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Attendance trends will appear once
            registered participants have attendance
            records.
          </p>
        </div>
      ) : (
        <>
          {/* Small Summary */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Events with Data
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {trendData.length}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Average Attendance
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {averageAttendance}%
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Highest Attendance
              </p>

              <p className="mt-1 text-xl font-bold text-green-700">
                {bestEvent?.attendanceRate ?? 0}%
              </p>

              {bestEvent && (
                <p className="mt-1 truncate text-xs text-slate-500">
                  {bestEvent.title}
                </p>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="mt-6 overflow-x-auto">
            <svg
              width={chartWidth}
              height={chartHeight}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="min-w-full"
              role="img"
              aria-label="Attendance trend graph"
            >
              {/* Horizontal grid lines */}
              {[0, 25, 50, 75, 100].map(
                (value) => {
                  const y = getY(value);

                  return (
                    <g key={value}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={
                          chartWidth -
                          padding.right
                        }
                        y2={y}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />

                      <text
                        x={padding.left - 12}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="#64748b"
                      >
                        {value}%
                      </text>
                    </g>
                  );
                }
              )}

              {/* Y axis */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={padding.top + plotHeight}
                stroke="#cbd5e1"
              />

              {/* X axis */}
              <line
                x1={padding.left}
                y1={padding.top + plotHeight}
                x2={chartWidth - padding.right}
                y2={padding.top + plotHeight}
                stroke="#cbd5e1"
              />

              {/* Trend line */}
              {trendData.length > 1 && (
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points */}
              {trendData.map(
                (point, index) => {
                  const x = getX(index);
                  const y = getY(
                    point.attendanceRate
                  );

                  return (
                    <g key={point.id}>
                      {/* Point */}
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill="#0f172a"
                      >
                        <title>
                          {`${point.title}
${point.dateLabel}
Registered: ${point.registrations}
Present: ${point.present}
Attendance: ${point.attendanceRate}%`}
                        </title>
                      </circle>

                      {/* Percentage */}
                      <text
                        x={x}
                        y={y - 14}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#0f172a"
                      >
                        {point.attendanceRate}%
                      </text>

                      {/* Event date */}
                      <text
                        x={x}
                        y={
                          padding.top +
                          plotHeight +
                          22
                        }
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#475569"
                      >
                        {point.dateLabel}
                      </text>

                      {/* Short event title */}
                      <text
                        x={x}
                        y={
                          padding.top +
                          plotHeight +
                          42
                        }
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                      >
                        {point.title.length > 15
                          ? `${point.title.slice(
                              0,
                              15
                            )}...`
                          : point.title}
                      </text>
                    </g>
                  );
                }
              )}
            </svg>
          </div>

          <p className="mt-2 text-center text-xs text-slate-400">
            Hover over a point to view event
            attendance details.
          </p>
        </>
      )}
    </div>
  );
}