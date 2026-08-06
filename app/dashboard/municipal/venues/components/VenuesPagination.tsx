"use client";

import {
  ChevronLeft,
  ChevronRight,
  Rows3,
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

const numberFormatter =
  new Intl.NumberFormat("en-PH");

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

  const isFirstPage =
    currentPage <= 1;

  const isLastPage =
    currentPage >= totalPages;

  return (
    <nav
      aria-label="Venue list pagination"
      className="border-t border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <p
            aria-live="polite"
            className="text-sm text-slate-500"
          >
            Showing{" "}
            <span className="font-bold tabular-nums text-slate-800">
              {numberFormatter.format(
                firstVisibleItem,
              )}
              –
              {numberFormatter.format(
                lastVisibleItem,
              )}
            </span>{" "}
            of{" "}
            <span className="font-bold tabular-nums text-slate-800">
              {numberFormatter.format(
                totalItems,
              )}
            </span>{" "}
            {totalItems === 1
              ? "venue"
              : "venues"}
          </p>

          <div className="hidden h-5 w-px bg-slate-300 sm:block" />

          <div className="flex items-center gap-2">
            <label
              htmlFor="venue-page-size"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500"
            >
              <Rows3 className="h-4 w-4 text-slate-400" />
              Rows
            </label>

            <select
              id="venue-page-size"
              value={pageSize}
              onChange={(event) =>
                onPageSizeChange(
                  Number(
                    event.target.value,
                  ),
                )
              }
              aria-label="Venues per page"
              className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-slate-600 focus:ring-4 focus:ring-slate-100"
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

            <span className="text-sm text-slate-500">
              per page
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:justify-end">
          <div className="order-2 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 sm:order-1">
            <span className="whitespace-nowrap text-sm font-medium text-slate-500">
              Page{" "}
              <strong className="tabular-nums text-slate-900">
                {numberFormatter.format(
                  currentPage,
                )}
              </strong>{" "}
              of{" "}
              <strong className="tabular-nums text-slate-900">
                {numberFormatter.format(
                  totalPages,
                )}
              </strong>
            </span>
          </div>

          <div className="order-1 grid grid-cols-2 gap-2 sm:order-2 sm:flex">
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={isFirstPage}
              aria-label="Go to previous venue page"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <button
              type="button"
              onClick={onNextPage}
              disabled={isLastPage}
              aria-label="Go to next venue page"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}