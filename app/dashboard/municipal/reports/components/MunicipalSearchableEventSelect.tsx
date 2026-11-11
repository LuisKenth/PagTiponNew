"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Check, ChevronDown, Search, X } from "lucide-react";

import type { MunicipalReportEventOption } from "../types/municipalReports";

type Props = {
  events: MunicipalReportEventOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDate(value?: string | null) {
  if (!value) return "No schedule";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : dateFormatter.format(date);
}

export default function MunicipalSearchableEventSelect({
  events,
  value,
  onChange,
  ariaLabel = "Select event",
}: Props) {
  const optionsId = useId();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = events.find((event) => event.eventMunicipalityId === value);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return events;

    return events.filter((event) => {
      const title = event.eventTitle.toLowerCase();
      const status = (event.eventStatus ?? "").toLowerCase();
      const date = formatDate(event.startAt).toLowerCase();

      return (
        title.includes(keyword) ||
        status.includes(keyword) ||
        date.includes(keyword)
      );
    });
  }, [events, search]);

  const visibleEvents = filteredEvents.slice(0, 50);

  const showAllOption = search.trim() === "";
  const optionCount = visibleEvents.length + (showAllOption ? 1 : 0);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [open]);

  const handleSelect = (eventId: string) => {
    onChange(eventId);
    setOpen(false);
    setSearch("");
    setActiveIndex(0);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setSearch("");
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown" && optionCount > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % optionCount);
      return;
    }

    if (event.key === "ArrowUp" && optionCount > 0) {
      event.preventDefault();

      setActiveIndex((index) => (index + optionCount - 1) % optionCount);
      return;
    }

    if (event.key === "Enter" && optionCount > 0) {
      event.preventDefault();

      if (showAllOption && activeIndex === 0) {
        handleSelect("all");
        return;
      }

      const index = activeIndex - (showAllOption ? 1 : 0);

      const chosen = visibleEvents[index];

      if (chosen) {
        handleSelect(chosen.eventMunicipalityId);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((previous) => !previous);
          setSearch("");
          setActiveIndex(0);
        }}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 text-left text-sm text-slate-800 outline-none transition hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500"
      >
        <span className="truncate">{selected?.eventTitle || "All Events"}</span>

        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-200 p-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />

            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-label="Search events"
              aria-controls={optionsId}
              aria-expanded={open}
              aria-autocomplete="list"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search title, date, or status..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />

            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setActiveIndex(0);
                  inputRef.current?.focus();
                }}
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <div
            id={optionsId}
            role="listbox"
            aria-label="Events"
            className="max-h-64 overflow-y-auto p-1"
          >
            {showAllOption && (
              <button
                type="button"
                role="option"
                aria-selected={value === "all"}
                onMouseEnter={() => setActiveIndex(0)}
                onClick={() => handleSelect("all")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  activeIndex === 0 ? "bg-indigo-50" : "hover:bg-slate-50"
                }`}
              >
                <span className="font-semibold text-slate-800">
                  All Events ({events.length})
                </span>

                {value === "all" && (
                  <Check className="h-4 w-4 text-indigo-600" />
                )}
              </button>
            )}

            {visibleEvents.map((event, index) => {
              const optionIndex = index + (showAllOption ? 1 : 0);

              const isSelected = value === event.eventMunicipalityId;

              return (
                <button
                  key={event.eventMunicipalityId}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(optionIndex)}
                  onClick={() => handleSelect(event.eventMunicipalityId)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left ${
                    activeIndex === optionIndex
                      ? "bg-indigo-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold text-slate-800">
                      {event.eventTitle || "Untitled Event"}
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      {formatDate(event.startAt)}
                      {event.eventStatus
                        ? ` · ${event.eventStatus.replaceAll("_", " ")}`
                        : ""}
                    </span>
                  </span>

                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-indigo-600" />
                  )}
                </button>
              );
            })}

            {filteredEvents.length === 0 && (
              <p className="px-3 py-5 text-center text-sm text-slate-500">
                No matching events found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
