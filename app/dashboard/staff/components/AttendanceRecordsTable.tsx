import type { AttendanceRecord } from "../types";
import { formatDateTime } from "../utils";

type AttendanceRecordsTableProps = {
  records: AttendanceRecord[];
  loading: boolean;
};

export default function AttendanceRecordsTable({
  records,
  loading,
}: AttendanceRecordsTableProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Recent Attendance Records
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Showing records only for the selected event.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">
          Loading attendance records...
        </p>
      ) : records.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No attendance records for this event yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-3 pr-4">User ID</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Method</th>
                <th className="py-3 pr-4">Checked In At</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b text-sm">
                  <td className="py-3 pr-4 text-slate-600">{record.user_id}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        record.status === "present"
                          ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                          : "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      }
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {record.method || "Not set"}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {formatDateTime(record.checked_in_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
