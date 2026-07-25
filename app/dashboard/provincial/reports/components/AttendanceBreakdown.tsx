type AttendanceBreakdownProps = {
  totalRegistrations: number;
  totalPresent: number;
  totalAbsent: number;
};

export default function AttendanceBreakdown({
  totalRegistrations,
  totalPresent,
  totalAbsent,
}: AttendanceBreakdownProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Attendance Breakdown
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Attendance totals based on the currently selected report filters.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Registered</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {totalRegistrations}
          </p>
        </div>

        <div className="rounded-xl bg-green-50 p-4">
          <p className="text-sm text-green-700">Present</p>
          <p className="mt-1 text-2xl font-bold text-green-800">
            {totalPresent}
          </p>
        </div>

        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-sm text-red-700">Absent</p>
          <p className="mt-1 text-2xl font-bold text-red-800">
            {totalAbsent}
          </p>
        </div>
      </div>
    </div>
  );
}
