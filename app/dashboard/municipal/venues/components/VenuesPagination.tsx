"use client";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type VenuesPaginationProps = {
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

export default function VenuesPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  firstVisibleItem,
  lastVisibleItem,
  onPageSizeChange,
  onPreviousPage,
  onNextPage,
}: VenuesPaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <span>
          Showing{" "}
          <strong className="text-slate-800">
            {firstVisibleItem}–
            {lastVisibleItem}
          </strong>{" "}
          of{" "}
          <strong className="text-slate-800">
            {totalItems}
          </strong>{" "}
          venues
        </span>

        <label
          htmlFor="venue-page-size"
          className="ml-1"
        >
          Show
        </label>

        <select
          id="venue-page-size"
          value={pageSize}
          onChange={(event) =>
            onPageSizeChange(
              Number(event.target.value),
            )
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-500"
        >
          {[5, 10, 20].map(
            (size) => (
              <option
                key={size}
                value={size}
              >
                {size}
              </option>
            ),
          )}
        </select>

        <span>per page</span>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={currentPage <= 1}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <span className="whitespace-nowrap px-2 text-sm font-semibold text-slate-700">
          Page {currentPage} of{" "}
          {totalPages}
        </span>

        <button
          type="button"
          onClick={onNextPage}
          disabled={
            currentPage >= totalPages
          }
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
