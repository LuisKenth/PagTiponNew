type MemoSummaryCardsProps = {
  totalMemos: number;
  totalWithoutMemo: number;
  loading?: boolean;
};

export default function MemoSummaryCards({
  totalMemos,
  totalWithoutMemo,
  loading = false,
}: MemoSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* TOTAL MEMOS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Total Official Memos
        </p>

        {loading ? (
          <div className="mt-2 h-9 w-14 animate-pulse rounded bg-slate-200" />
        ) : (
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {totalMemos}
          </p>
        )}

        <p className="mt-1 text-xs text-slate-500">
          Provincial events with uploaded official memos
        </p>
      </div>

      {/* WITHOUT MEMO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Events Without Memo
        </p>

        {loading ? (
          <div className="mt-2 h-9 w-14 animate-pulse rounded bg-slate-200" />
        ) : (
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {totalWithoutMemo}
          </p>
        )}

        <p className="mt-1 text-xs text-slate-500">
          Events that currently have no attached memo
        </p>
      </div>
    </div>
  );
}