import Link from "next/link";

import type { EventWithMunicipalities } from "../types";

type EventActionsProps = {
  event: EventWithMunicipalities;
  automaticStatus: string;

  deletingId: string | null;
  publishingId: string | null;
  cancellingId: string | null;

  onDelete: (event: EventWithMunicipalities) => void;
  onPublish: (event: EventWithMunicipalities) => void;
  onCancel: (event: EventWithMunicipalities) => void;
};

export default function EventActions({
  event,
  automaticStatus,
  deletingId,
  publishingId,
  cancellingId,
  onDelete,
  onPublish,
  onCancel,
}: EventActionsProps) {
  const isDraft = automaticStatus === "draft";
  const isUpcoming = automaticStatus === "upcoming";

  /*
   * EDIT RULE
   *
   * Draft    → editable
   * Upcoming → editable
   *
   * Ongoing, Completed, Cancelled
   * → locked
   */
  const canEdit =
    automaticStatus === "draft" ||
    automaticStatus === "upcoming";

  /*
   * CANCEL RULE
   *
   * Upcoming events only.
   *
   * Once the event becomes ongoing,
   * it can no longer be cancelled.
   */
  const canCancel = automaticStatus === "upcoming";

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {/* VIEW - ALWAYS AVAILABLE */}
      <Link
        href={`/dashboard/provincial/events/${event.id}`}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      >
        View
      </Link>

      {/* EDIT - DRAFT / UPCOMING ONLY */}
      {canEdit && (
        <Link
          href={`/dashboard/provincial/events/${event.id}/edit`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Edit
        </Link>
      )}

      {/* PUBLISH - DRAFT ONLY */}
      {isDraft && (
        <button
          type="button"
          onClick={() => onPublish(event)}
          disabled={publishingId === event.id}
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {publishingId === event.id
            ? "Publishing..."
            : "Publish"}
        </button>
      )}

      {/* CANCEL - UPCOMING ONLY */}
      {canCancel && (
        <button
          type="button"
          onClick={() => onCancel(event)}
          disabled={cancellingId === event.id}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cancellingId === event.id
            ? "Cancelling..."
            : "Cancel"}
        </button>
      )}

      {/* DELETE - DRAFT ONLY */}
      {isDraft && (
        <button
          type="button"
          onClick={() => onDelete(event)}
          disabled={deletingId === event.id}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deletingId === event.id
            ? "Deleting..."
            : "Delete"}
        </button>
      )}
    </div>
  );
}