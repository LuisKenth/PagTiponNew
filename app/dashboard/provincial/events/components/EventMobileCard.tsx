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

type EventMobileCardProps = {
    event: EventWithMunicipalities;
    currentTime: number;

    deletingId: string | null;
    publishingId: string | null;
    cancellingId: string | null;

    onDelete: (event: EventWithMunicipalities) => void;
    onPublish: (event: EventWithMunicipalities) => void;
    onCancel: (event: EventWithMunicipalities) => void;
};

export default function EventMobileCard({
    event,
    currentTime,
    deletingId,
    publishingId,
    cancellingId,
    onDelete,
    onPublish,
    onCancel,
}: EventMobileCardProps) {
    const automaticStatus = getAutomaticEventStatus(
        event,
        currentTime
    );

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            {/* HEADER */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="break-words font-semibold text-slate-900">
                        {getEventName(event)}
                    </h3>

                    {automaticStatus === "draft" && (
                        <p className="mt-1 text-xs text-slate-400">
                            Not yet published
                        </p>
                    )}

                    {automaticStatus === "cancelled" && (
                        <p className="mt-1 text-xs text-red-500">
                            Event cancelled
                        </p>
                    )}
                </div>

                <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClass(
                        automaticStatus
                    )}`}
                >
                    {automaticStatus}
                </span>
            </div>

            {/* SCHEDULE */}
            <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Schedule
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                    {formatDate(event.start_at)}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                    to {formatDate(event.end_at)}
                </p>
            </div>

            {/* MUNICIPALITIES */}
            <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Target Municipalities
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                    {event.municipalities.length === 0 ? (
                        <span className="text-xs text-slate-400">
                            No municipality
                        </span>
                    ) : (
                        <>
                            {event.municipalities
                                .slice(0, 6)
                                .map((item) => (
                                    <span
                                        key={item.id}
                                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                                    >
                                        {item.municipality}
                                    </span>
                                ))}

                            {event.municipalities.length > 6 && (
                                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                    +
                                    {event.municipalities.length -
                                        6}{" "}
                                    more
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* MEMO + PREPARATION */}
            <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Memo
                    </p>

                    <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${event.memo_url || event.memo_filename
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                            }`}
                    >
                        {getMemoLabel(event)}
                    </span>
                </div>

                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Preparation
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        {getPreparationLabel(event.municipalities)}
                    </span>
                </div>
            </div>

            {/* ACTIONS */}
            <div className="mt-4 border-t border-slate-100 pt-4">
                <EventActions
                    event={event}
                    automaticStatus={automaticStatus}
                    deletingId={deletingId}
                    publishingId={publishingId}
                    cancellingId={cancellingId}
                    onDelete={onDelete}
                    onPublish={onPublish}
                    onCancel={onCancel}
                />
            </div>
        </div>
    );
}