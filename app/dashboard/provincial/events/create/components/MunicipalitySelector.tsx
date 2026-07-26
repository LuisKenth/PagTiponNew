"use client";

import { useMemo, useState } from "react";
import { Check, MapPin, Search, X } from "lucide-react";

type MunicipalitySelectorProps = {
  municipalities: string[];
  selectedMunicipalities: string[];
  onToggleMunicipality: (municipality: string) => void;
  onToggleAll: () => void;
};

export default function MunicipalitySelector({
  municipalities,
  selectedMunicipalities,
  onToggleMunicipality,
  onToggleAll,
}: MunicipalitySelectorProps) {
  const [search, setSearch] = useState("");

  const allSelected =
    municipalities.length > 0 &&
    selectedMunicipalities.length === municipalities.length;

  const filteredMunicipalities = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return municipalities;
    }

    return municipalities.filter((municipality) =>
      municipality.toLowerCase().includes(query)
    );
  }, [municipalities, search]);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <MapPin size={19} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Target Municipalities
            </h2>

            <p className="text-sm text-slate-500">
              Select the municipalities that will receive this event.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleAll}
          className={`self-start rounded-lg px-3 py-2 text-xs font-semibold transition sm:self-auto ${allSelected
            ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
        >
          {allSelected ? "Unselect All" : "Select All"}
        </button>
      </div>

      {/* Counter + Search */}
      <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 md:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Selected
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {selectedMunicipalities.length}
              <span className="ml-1 text-sm font-medium text-slate-400">
                / {municipalities.length}
              </span>
            </p>
          </div>

          {allSelected && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 md:mt-2">
              <Check size={14} />
              All selected
            </div>
          )}
        </div>

        <div className="relative h-[56px] self-center">
          <Search
            size={18}
            strokeWidth={2}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search municipality..."
            className="h-full w-full rounded-xl border border-slate-200 bg-white pl-12 pr-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              aria-label="Clear municipality search"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      {/* Municipality List */}
      <div className="mt-4 max-h-[300px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
        {filteredMunicipalities.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMunicipalities.map((municipality) => {
              const selected =
                selectedMunicipalities.includes(municipality);

              return (
                <label
                  key={municipality}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${selected
                    ? "border-slate-300 bg-white shadow-sm"
                    : "border-transparent hover:border-slate-200 hover:bg-white"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      onToggleMunicipality(municipality)
                    }
                    className="sr-only"
                  />

                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${selected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white"
                      }`}
                  >
                    {selected && (
                      <Check size={13} strokeWidth={3} />
                    )}
                  </div>

                  <span
                    className={
                      selected
                        ? "font-medium text-slate-900"
                        : "text-slate-600"
                    }
                  >
                    {municipality}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[130px] items-center justify-center text-center">
            <div>
              <MapPin
                size={24}
                className="mx-auto text-slate-300"
              />

              <p className="mt-2 text-sm font-medium text-slate-600">
                No municipality found
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Try a different search term.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Municipality Preview */}
      {selectedMunicipalities.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Selected municipalities
            </p>

            <p className="text-xs text-slate-400">
              Click a municipality below to remove it.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedMunicipalities
              .slice(0, 6)
              .map((municipality) => (
                <button
                  key={municipality}
                  type="button"
                  onClick={() =>
                    onToggleMunicipality(municipality)
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  {municipality}

                  <X size={12} className="text-slate-400" />
                </button>
              ))}

            {selectedMunicipalities.length > 6 && (
              <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                +{selectedMunicipalities.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Information */}
      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-xs leading-5 text-slate-500">
          Select at least one municipality before publishing the
          event. Municipality selection may remain incomplete while
          saving the event as a draft.
        </p>
      </div>
    </section>
  );
}