import type { ReceivedEvent } from "../types/municipalDashboard";
import {
  formatDateTime,
  getPreparationButtonLabel,
  getPreparationStatusClass,
  getPreparationStatusLabel,
  normalizePreparationStatus,
} from "../utils/municipalDashboardUtils";

type ReceivedEventCardProps = {
  item: ReceivedEvent;
  onPrepare: (item: ReceivedEvent) => void;
};

export default function ReceivedEventCard({
  item,
  onPrepare,
}: ReceivedEventCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">
              {item.event?.title || "Untitled Event"}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${getPreparationStatusClass(
                item.municipal_status
              )}`}
            >
              {getPreparationStatusLabel(
                normalizePreparationStatus(
                  item.municipal_status
                )
              )}
            </span>
          </div>

          <p className="text-sm text-slate-600">
            {item.event?.description ||
              "No description provided."}
          </p>

          <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
            <p>
              <span className="font-medium text-slate-700">
                Start:
              </span>{" "}
              {formatDateTime(item.event?.start_at)}
            </p>

            <p>
              <span className="font-medium text-slate-700">
                End:
              </span>{" "}
              {formatDateTime(item.event?.end_at)}
            </p>
          </div>

          {item.event?.memo_filename && (
            <p className="text-sm text-slate-500">
              Memo:{" "}
              <span className="font-medium text-slate-700">
                {item.event.memo_filename}
              </span>
            </p>
          )}

          {item.local_instructions && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-medium text-slate-800">
                Local Instructions:
              </span>{" "}
              {item.local_instructions}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          {item.event?.memo_url && (
            <a
              href={item.event.memo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-950 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-800"
            >
              View Memo
            </a>
          )}

          <button
            type="button"
            onClick={() => onPrepare(item)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {getPreparationButtonLabel(
              item.municipal_status
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
