import Link from "next/link";

import type { MemoEvent } from "../types";

import {
    formatDate,
    getStatusClass,
    getStatusLabel,
} from "../utils";

type MemoTableRowProps = {
    event: MemoEvent;
};

export default function MemoTableRow({
    event,
}: MemoTableRowProps) {
    const visibleMunicipalities =
        event.municipalities.slice(0, 2);

    const remainingMunicipalities =
        Math.max(
            0,
            event.municipalities.length -
            visibleMunicipalities.length
        );

    return (
        <tr className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70">
            {/* EVENT */}
            <td className="max-w-[210px] py-3 pr-4 align-middle">
                <p
                    className="truncate font-medium text-slate-900"
                    title={event.title || "Untitled Event"}
                >
                    {event.title || "Untitled Event"}
                </p>
            </td>

            {/* MEMO */}
            <td className="max-w-[220px] py-3 pr-4 align-middle">
                <p
                    className="truncate text-slate-600"
                    title={
                        event.memo_filename ||
                        "Official Memo"
                    }
                >
                    {event.memo_filename ||
                        "Official Memo"}
                </p>
            </td>

            {/* MUNICIPALITIES */}
            <td className="max-w-[260px] py-3 pr-4 align-middle">
                {event.municipalities.length ===
                    0 ? (
                    <span className="text-xs text-slate-400">
                        None assigned
                    </span>
                ) : (
                    <div className="flex flex-wrap items-center gap-1">
                        {visibleMunicipalities.map(
                            (item) => (
                                <span
                                    key={item.id}
                                    className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                                >
                                    {item.municipality}
                                </span>
                            )
                        )}

                        {remainingMunicipalities >
                            0 && (
                                <span
                                    className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500"
                                    title={event.municipalities
                                        .slice(2)
                                        .map(
                                            (item) =>
                                                item.municipality
                                        )
                                        .join(", ")}
                                >
                                    +
                                    {
                                        remainingMunicipalities
                                    }{" "}
                                    more
                                </span>
                            )}
                    </div>
                )}
            </td>

            {/* EVENT STATUS */}
            <td className="whitespace-nowrap py-3 pr-4 align-middle">
                <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusClass(
                        event.status
                    )}`}
                >
                    {getStatusLabel(
                        event.status
                    )}
                </span>
            </td>

            {/* UPLOADED */}
            <td className="whitespace-nowrap py-3 pr-4 align-middle text-xs text-slate-500">
                {formatDate(
                    event.memo_uploaded_at ?? event.created_at
                )}
            </td>

            {/* ACTIONS */}
            <td className="whitespace-nowrap py-3 align-middle">
                <div className="flex items-center justify-end gap-2">
                    {event.memo_url && (
                        <Link
                            href={`/dashboard/provincial/memos/${event.id}`}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                        >
                            View Memo
                        </Link>
                    )}

                    <Link
                        href={`/dashboard/provincial/events/${event.id}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    >
                        View Event
                    </Link>
                </div>
            </td>
        </tr>
    );
}