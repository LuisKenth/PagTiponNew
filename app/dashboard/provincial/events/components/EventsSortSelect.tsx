import type { EventSortOption } from "../types";

type EventsSortSelectProps = {
  value: EventSortOption;
  onChange: (value: EventSortOption) => void;
};

export default function EventsSortSelect({
  value,
  onChange,
}: EventsSortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-slate-500">
        Sort by:
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value as EventSortOption
          )
        }
        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
      >
        <option value="newest">
          Newest Created
        </option>

        <option value="soonest">
          Event Date: Soonest
        </option>

        <option value="latest">
          Event Date: Latest
        </option>

        <option value="title_asc">
          Event Name: A–Z
        </option>
      </select>
    </div>
  );
}