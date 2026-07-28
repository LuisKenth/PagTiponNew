import type { ReceivedEvent } from "../types/municipalDashboard";
import MunicipalDashboardLoading from "./MunicipalDashboardLoading";
import ReceivedEventCard from "./ReceivedEventCard";

type ReceivedEventsSectionProps = {
  events: ReceivedEvent[];
  loading: boolean;
  onPrepare: (item: ReceivedEvent) => void;
};

export default function ReceivedEventsSection({
  events,
  loading,
  onPrepare,
}: ReceivedEventsSectionProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Received Provincial Events
      </h2>

      {loading ? (
        <MunicipalDashboardLoading />
      ) : events.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-medium text-slate-800">
            No provincial events received yet.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Published events assigned to this municipality
            will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {events.map((item) => (
            <ReceivedEventCard
              key={item.id}
              item={item}
              onPrepare={onPrepare}
            />
          ))}
        </div>
      )}
    </div>
  );
}
