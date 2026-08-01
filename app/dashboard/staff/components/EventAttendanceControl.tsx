import type { EventAssignment } from "../types";
import { formatDateTime } from "../utils";

type EventAttendanceControlProps = {
  assignments: EventAssignment[];
  selectedId: string;
  selectedAssignment: EventAssignment | null;
  loading: boolean;
  controlLoading: "open" | "close" | null;
  earliestOpeningTime: number | null;
  isCheckInOpen: boolean;
  wasCheckInOpened: boolean;
  wasCheckInClosed: boolean;
  canOpenCheckIn: boolean;
  canUseAttendanceTools: boolean;
  blockedMessage: string;
  onSelect: (id: string) => Promise<void>;
  onOpen: () => Promise<void>;
  onClose: () => Promise<void>;
  onRefresh: () => Promise<void>;
};

export default function EventAttendanceControl({
  assignments,
  selectedId,
  selectedAssignment,
  loading,
  controlLoading,
  earliestOpeningTime,
  isCheckInOpen,
  wasCheckInOpened,
  wasCheckInClosed,
  canOpenCheckIn,
  canUseAttendanceTools,
  blockedMessage,
  onSelect,
  onOpen,
  onClose,
  onRefresh,
}: EventAttendanceControlProps) {
  const checkInStatusLabel = isCheckInOpen
    ? "Open"
    : wasCheckInClosed
      ? "Closed"
      : "Not Open";

  const checkInStatusClass = isCheckInOpen
    ? "bg-green-100 text-green-700"
    : wasCheckInClosed
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Event Attendance Control
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select an event before opening, closing, or processing attendance.
          </p>
        </div>

        {selectedAssignment && (
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${checkInStatusClass}`}
          >
            Check-in: {checkInStatusLabel}
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">
          Loading assigned events...
        </p>
      ) : assignments.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          No provincial event is currently assigned to your municipality.
        </div>
      ) : (
        <>
          <div className="mt-5">
            <label
              htmlFor="event-assignment"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Assigned Event
            </label>

            <select
              id="event-assignment"
              value={selectedId}
              onChange={(event) => void onSelect(event.target.value)}
              disabled={Boolean(controlLoading)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {assignments.map((assignment) => (
                <option
                  key={String(assignment.id)}
                  value={String(assignment.id)}
                >
                  {assignment.event.title} — {assignment.event.status}
                </option>
              ))}
            </select>
          </div>

          {selectedAssignment && (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  label="Event status"
                  value={selectedAssignment.event.status || "Unknown"}
                  capitalize
                />
                <InfoCard
                  label="Event starts"
                  value={formatDateTime(selectedAssignment.event.start_at)}
                />
                <InfoCard
                  label="Earliest opening"
                  value={
                    earliestOpeningTime
                      ? formatDateTime(
                          new Date(earliestOpeningTime).toISOString()
                        )
                      : "Not set"
                  }
                />
                <InfoCard
                  label="Event ends"
                  value={formatDateTime(selectedAssignment.event.end_at)}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {!isCheckInOpen && (
                  <button
                    type="button"
                    onClick={() => void onOpen()}
                    disabled={!canOpenCheckIn || Boolean(controlLoading)}
                    className="rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {controlLoading === "open"
                      ? "Opening..."
                      : wasCheckInOpened
                        ? "Reopen Check-in"
                        : "Open Check-in"}
                  </button>
                )}

                {isCheckInOpen && (
                  <button
                    type="button"
                    onClick={() => void onClose()}
                    disabled={Boolean(controlLoading)}
                    className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {controlLoading === "close"
                      ? "Closing..."
                      : "Close Check-in"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void onRefresh()}
                  disabled={Boolean(controlLoading)}
                  className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>

              {!canUseAttendanceTools && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-800">
                  {blockedMessage}
                </div>
              )}

              {isCheckInOpen && (
                <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">
                  Attendance was opened at{" "}
                  <span className="font-semibold">
                    {formatDateTime(selectedAssignment.check_in_opened_at)}
                  </span>
                  . QR scanning and manual token entry are enabled until staff
                  closes check-in or the event reaches its end time.
                </div>
              )}

              {!isCheckInOpen && wasCheckInClosed && (
                <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                  Attendance was closed at{" "}
                  <span className="font-semibold">
                    {formatDateTime(selectedAssignment.check_in_closed_at)}
                  </span>
                  .
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
  capitalize?: boolean;
};

function InfoCard({ label, value, capitalize = false }: InfoCardProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-semibold text-slate-900 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
