import Link from "next/link";

import type { MemoEvent } from "../types";

import {
    formatDate,
    getStatusClass,
    getStatusLabel,
} from "../utils";

type MemoMobileCardProps = {
    event: MemoEvent;
};

export default function MemoMobileCard({
    event,
}: MemoMobileCardProps) {

    const visibleMunicipalities = event.municipalities.slice(0, 4);

    const remainingMunicipalities = Math.max(
        0,
        event.municipalities.length - visibleMunicipalities.length
    );

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            {/* Event + Status */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Event
                    </p>

                    <h3 className="mt-1 break-words font-semibold text-slate-900">
                        {event.title || "Untitled Event"}
                    </h3>
                </div>

                <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClass(
                        event.status
                    )}`}
                >
                    {getStatusLabel(event.status)}
                </span>
            </div>

            {/* Memo */}
            <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Memo
                </p>

                <p className="mt-1 break-all text-sm text-slate-700">
                    {event.memo_filename || "Official Memo"}
                </p>
            </div>

            {/* Municipalities */}
            <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Target Municipalities
                </p>

                {event.municipalities.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-400">
                        No municipality assigned
                    </p>
                ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {visibleMunicipalities.map((item) => (
                            <span
                                key={item.id}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                            >
                                {item.municipality}
                            </span>
                        ))}

                        {remainingMunicipalities > 0 && (
                            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                                +{remainingMunicipalities} more
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Uploaded */}
            <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Uploaded
                </p>

                <p className="mt-1 text-sm text-slate-600">
                    {formatDate(
                        event.memo_uploaded_at ?? event.created_at
                    )}
                </p>
            </div>

            {/* Actions */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                <Link
                    href={`/dashboard/provincial/events/${event.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                    View Event
                </Link>

                {event.memo_url ? (
                    <Link
                        href={`/dashboard/provincial/memos/${event.id}`}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                        View Memo
                    </Link>
                ) : (
                    <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400"
                    >
                        No Memo
                    </button>
                )}
            </div>
        </div>
    );
}