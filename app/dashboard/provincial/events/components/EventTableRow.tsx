import type { EventWithMunicipalities } from "../types";

import {
  formatDate,
  getAutomaticEventStatus,
  getEventName,
  getMemoLabel,
  getPreparationLabel,
  getStatusClass,
} from "../utils";

import EventActions from "./EventActions";

type EventTableRowProps = {
  event: EventWithMunicipalities;

  deletingId: string | null;
  publishingId: string | null;
  cancellingId: string | null;

  currentTime: number;

  onDelete: (event: EventWithMunicipalities) => void;
  onPublish: (event: EventWithMunicipalities) => void;
  onCancel: (event: EventWithMunicipalities) => void;
};

export default function EventTableRow({
  event,
  deletingId,
  publishingId,
  cancellingId,
  currentTime,
  onDelete,
  onPublish,
  onCancel,
}: EventTableRowProps) {
  const automaticStatus =
    getAutomaticEventStatus(
      event,
      currentTime
    );

  return (
    <tr className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/80">
      {/* EVENT NAME */}
      <td className="max-w-[260px] py-4 pr-4 align-top">
        <p
          title={getEventName(event)}
          className="max-w-[220px] break-words font-semibold leading-5 text-slate-900"
        >
          {getEventName(event)}
        </p>

        {automaticStatus === "draft" && (
          <p className="mt-1 text-xs text-slate-400">
            Not yet published
          </p>
        )}

        {automaticStatus === "cancelled" && (
          <p className="mt-1 text-xs text-red-400">
            Event cancelled
          </p>
        )}
      </td>

      {/* SCHEDULE */}
      <td className="min-w-[190px] py-4 pr-4 align-top">
        <p className="font-medium text-slate-700">
          {formatDate(event.start_at)}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          to {formatDate(event.end_at)}
        </p>
      </td>

      {/* MUNICIPALITIES */}
      <td className="max-w-[300px] py-4 pr-4 align-top">
        {event.municipalities.length === 0 ? (
          <span className="text-xs text-slate-400">
            No municipality
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {event.municipalities
              .slice(0, 4)
              .map((item) => (
                <span
                  key={item.id}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {item.municipality}
                </span>
              ))}

            {event.municipalities.length > 4 && (
              <span
                title={event.municipalities
                  .slice(4)
                  .map(
                    (item) =>
                      item.municipality
                  )
                  .join(", ")}
                className="cursor-help rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                +
                {event.municipalities.length -
                  4}{" "}
                more
              </span>
            )}
          </div>
        )}
      </td>

      {/* MEMO */}
      <td className="py-4 pr-4 align-top">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${event.memo_url ||
            event.memo_filename
            ? "bg-green-50 text-green-700"
            : "bg-slate-100 text-slate-500"
            }`}
        >
          {getMemoLabel(event)}
        </span>
      </td>

      {/* PREPARATION */}
      <td className="py-4 pr-4 align-top">
        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          {getPreparationLabel(
            event.municipalities
          )}
        </span>
      </td>

      {/* STATUS */}
      <td className="py-4 pr-4 align-top">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClass(
            automaticStatus
          )}`}
        >
          {automaticStatus}
        </span>
      </td>

      {/* ACTIONS */}
      <td className="min-w-[250px] py-4 align-top">
        <EventActions
          event={event}
          automaticStatus={
            automaticStatus
          }
          deletingId={deletingId}
          publishingId={publishingId}
          cancellingId={cancellingId}
          onDelete={onDelete}
          onPublish={onPublish}
          onCancel={onCancel}
        />
      </td>
    </tr>
  );
}