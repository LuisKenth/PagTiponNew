type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;

  itemLabel?: string;
  pageSizeOptions?: number[];

  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = "records",
  pageSizeOptions = [5, 10, 20],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const startItem =
    (currentPage - 1) * pageSize + 1;

  const endItem = Math.min(
    currentPage * pageSize,
    totalItems
  );

  /*
   * Maximum of 5 visible page buttons.
   */
  const getPageNumbers = () => {
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      return Array.from(
        { length: totalPages },
        (_, index) => index + 1
      );
    }

    let start = Math.max(
      1,
      currentPage - 2
    );

    let end = Math.min(
      totalPages,
      start + maxButtons - 1
    );

    if (
      end - start + 1 <
      maxButtons
    ) {
      start = Math.max(
        1,
        end - maxButtons + 1
      );
    }

    return Array.from(
      {
        length:
          end - start + 1,
      },
      (_, index) =>
        start + index
    );
  };

  const pageNumbers =
    getPageNumbers();

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      {/* LEFT SIDE */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {startItem}
          </span>
          {" - "}
          <span className="font-semibold text-slate-700">
            {endItem}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-700">
            {totalItems}
          </span>{" "}
          {itemLabel}
        </p>

        {/* ROW COUNT */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Rows:
          </span>

          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(
                Number(
                  event.target.value
                )
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-500"
          >
            {pageSizeOptions.map(
              (size) => (
                <option
                  key={size}
                  value={size}
                >
                  {size}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* PREVIOUS */}
        <button
          type="button"
          disabled={
            currentPage === 1
          }
          onClick={() =>
            onPageChange(
              currentPage - 1
            )
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        {/* PAGE NUMBERS */}
        {pageNumbers.map(
          (page) => {
            const isActive =
              page === currentPage;

            return (
              <button
                key={page}
                type="button"
                onClick={() =>
                  onPageChange(
                    page
                  )
                }
                className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            );
          }
        )}

        {/* NEXT */}
        <button
          type="button"
          disabled={
            currentPage ===
            totalPages
          }
          onClick={() =>
            onPageChange(
              currentPage + 1
            )
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}