export type MemoSortValue =
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc";

type MemoSortProps = {
  value: MemoSortValue;
  onChange: (value: MemoSortValue) => void;
};

export default function MemoSort({
  value,
  onChange,
}: MemoSortProps) {
  return (
    <div className="flex w-full items-center gap-2 md:w-auto">
      <label
        htmlFor="memo-sort"
        className="whitespace-nowrap text-sm font-medium text-slate-600"
      >
        Sort by
      </label>

      <select
        id="memo-sort"
        value={value}
        onChange={(event) =>
          onChange(event.target.value as MemoSortValue)
        }
        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 md:flex-none"
      >
        <option value="newest">
          Newest first
        </option>

        <option value="oldest">
          Oldest first
        </option>

        <option value="title-asc">
          Event A–Z
        </option>

        <option value="title-desc">
          Event Z–A
        </option>
      </select>
    </div>
  );
}