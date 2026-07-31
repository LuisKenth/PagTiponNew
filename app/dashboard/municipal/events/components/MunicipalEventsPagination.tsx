import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type MunicipalEventsPaginationProps = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  firstVisibleItem: number;
  lastVisibleItem: number;
  onPageSizeChange: (
    size: number,
  ) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export default function MunicipalEventsPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  firstVisibleItem,
  lastVisibleItem,
  onPageSizeChange,
  onPreviousPage,
  onNextPage,
}: MunicipalEventsPaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-900">
            {firstVisibleItem}
          </span>
          {" – "}
          <span className="font-semibold text-slate-900">
            {lastVisibleItem}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-900">
            {totalItems}
          </span>
        </p>

        <label className="flex items-center gap-2 text-sm text-slate-500">
          <span>Show</span>

          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(
                Number(
                  event.target.value,
                ),
              )
            }
            aria-label="Events per page"
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          >
            {PAGE_SIZE_OPTIONS.map(
              (option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              ),
            )}
          </select>

          <span>per page</span>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <span className="whitespace-nowrap text-sm font-medium text-slate-600">
          Page{" "}
          <span className="font-bold text-slate-900">
            {currentPage}
          </span>{" "}
          of{" "}
          <span className="font-bold text-slate-900">
            {totalPages}
          </span>
        </span>

        <button
          type="button"
          onClick={onNextPage}
          disabled={
            currentPage === totalPages
          }
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
