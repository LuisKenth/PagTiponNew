import Pagination from "../../components/Pagination";

import type { MemoEvent } from "../types";

import MemoMobileCard from "./MemoMobileCard";
import MemoTableRow from "./MemoTableRow";
import MemoTableSkeleton from "./MemoTableSkeleton";

type MemoTableProps = {
    memos: MemoEvent[];
    loading: boolean;

    totalItems: number;
    totalMemos: number;

    currentPage: number;
    totalPages: number;
    pageSize: number;

    searchQuery: string;

    onPageChange: (
        page: number
    ) => void;

    onPageSizeChange: (
        size: number
    ) => void;
};

export default function MemoTable({
    memos,
    loading,
    totalItems,
    totalMemos,
    currentPage,
    totalPages,
    pageSize,
    searchQuery,
    onPageChange,
    onPageSizeChange,
}: MemoTableProps) {
    if (loading) {
        return <MemoTableSkeleton />;
    }

    if (totalMemos === 0) {
        return (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center sm:p-10">
                <p className="font-semibold text-slate-900">
                    No official memos
                    uploaded yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                    Official memos attached
                    to provincial events will
                    appear here.
                </p>
            </div>
        );
    }

    if (
        totalItems === 0 &&
        searchQuery.trim()
    ) {
        return (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center sm:p-10">
                <p className="font-semibold text-slate-900">
                    No matching memos found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                    Try another event,
                    memo, municipality, or
                    status.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* MOBILE */}
            <div className="mt-5 space-y-3 md:hidden">
                {memos.map(
                    (event) => (
                        <MemoMobileCard
                            key={event.id}
                            event={event}
                        />
                    )
                )}
            </div>

            {/* DESKTOP */}
            <div className="mt-5 hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50/80">
                        <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">
                                Event
                            </th>

                            <th className="py-3 pr-4">
                                Memo
                            </th>

                            <th className="py-3 pr-4">
                                Target
                                Municipalities
                            </th>

                            <th className="py-3 pr-4">
                                Event Status
                            </th>

                            <th className="py-3 pr-4">
                                Uploaded
                            </th>

                            <th className="py-3 pr-4 text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {memos.map(
                            (event) => (
                                <MemoTableRow
                                    key={event.id}
                                    event={event}
                                />
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="mt-4">
                <Pagination
                    currentPage={
                        currentPage
                    }
                    totalPages={
                        totalPages
                    }
                    totalItems={
                        totalItems
                    }
                    pageSize={
                        pageSize
                    }
                    onPageChange={
                        onPageChange
                    }
                    onPageSizeChange={
                        onPageSizeChange
                    }
                />
            </div>
        </>
    );
}