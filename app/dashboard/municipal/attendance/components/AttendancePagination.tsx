import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type AttendancePaginationProps = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  firstVisibleItem: number;
  lastVisibleItem: number;
  onPageSizeChange: (
    value: number,
  ) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export default function AttendancePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  firstVisibleItem,
  lastVisibleItem,
  onPageSizeChange,
  onPreviousPage,
  onNextPage,
}: AttendancePaginationProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-800">
          {firstVisibleItem}
        </span>{" "}
        to{" "}
        <span className="font-semibold text-slate-800">
          {lastVisibleItem}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-800">
          {totalItems}
        </span>{" "}
        records
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          Rows

          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(
                Number(event.target.value),
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPreviousPage}
            disabled={currentPage <= 1}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <span className="min-w-20 text-center text-sm font-semibold text-slate-600">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={onNextPage}
            disabled={
              currentPage >= totalPages
            }
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
