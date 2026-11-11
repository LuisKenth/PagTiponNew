"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

type EventOption = {
  id: string;
  title: string | null;
  start_at: string | null;
  status: string | null;
};

type Props = {
  events: EventOption[];
  value: string;
  onChange: (eventId: string) => void;
};

const MAX_VISIBLE = 50;
const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function eventLabel(event: EventOption) {
  return event.title?.trim() || "Untitled Event";
}

function formatEventDate(value: string | null) {
  if (!value) return "Date not scheduled";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return EVENT_DATE_FORMATTER.format(date);
}

export default function SearchableEventSelect({
  events,
  value,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = events.find((event) => event.id === value);
  const matching = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return events.filter((event) => {
      if (!needle) return true;
      return (
        eventLabel(event).toLocaleLowerCase().includes(needle) ||
        formatEventDate(event.start_at).toLocaleLowerCase().includes(needle) ||
        (event.status || "").toLocaleLowerCase().includes(needle)
      );
    });
  }, [events, query]);
  const shown = matching.slice(0, MAX_VISIBLE);
  const showAllOption = query.trim().length === 0;
  const optionsCount = shown.length + (showAllOption ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function choose(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    triggerRef.current?.focus();
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery("");
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown" && optionsCount) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % optionsCount);
    }
    if (event.key === "ArrowUp" && optionsCount) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + optionsCount) % optionsCount);
    }
    if (event.key === "Enter" && optionsCount) {
      event.preventDefault();
      if (showAllOption && activeIndex === 0) {
        choose("all");
      } else {
        const index = activeIndex - (showAllOption ? 1 : 0);
        const chosen = shown[index];
        if (chosen) choose(chosen.id);
      }
    }
    if (event.key === "Tab") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 text-sm font-medium text-slate-700"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <span id="pagtipon-select-event-label">Select Event</span>
      <button
        ref={triggerRef}
        type="button"
        aria-labelledby="pagtipon-select-event-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((previous) => !previous);
          setQuery("");
          setActiveIndex(0);
        }}
        className="mt-2 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className="min-w-0 truncate">{selected ? eventLabel(selected) : "All Events"}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[min(92vw,440px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-200 p-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-label="Search events in dropdown"
              aria-controls="pagtipon-event-options"
              aria-expanded="true"
              aria-autocomplete="list"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search title, date, or status..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {query && (
              <button type="button" aria-label="Clear event search" onClick={() => { setQuery(""); setActiveIndex(0); inputRef.current?.focus(); }}>
                <X className="h-4 w-4 text-slate-500" />
              </button>
            )}
          </div>

          <div id="pagtipon-event-options" role="listbox" aria-label="Matching events" className="max-h-64 overflow-y-auto p-1">
            {showAllOption && (
              <button
                type="button"
                role="option"
                aria-selected={value === "all"}
                onMouseEnter={() => setActiveIndex(0)}
                onClick={() => choose("all")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${activeIndex === 0 ? "bg-indigo-50" : "hover:bg-slate-50"}`}
              >
                <span className="font-semibold">All Events</span>
                {value === "all" && <Check className="h-4 w-4 text-indigo-600" aria-hidden="true" />}
              </button>
            )}
            {shown.map((event, index) => {
              const optionIndex = index + (showAllOption ? 1 : 0);
              return (
                <button
                  key={event.id}
                  type="button"
                  role="option"
                  aria-selected={value === event.id}
                  onMouseEnter={() => setActiveIndex(optionIndex)}
                  onClick={() => choose(event.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left ${activeIndex === optionIndex ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold text-slate-800">{eventLabel(event)}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {formatEventDate(event.start_at)} · {(event.status || "Unknown").replaceAll("_", " ")}
                    </span>
                  </span>
                  {value === event.id && <Check className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />}
                </button>
              );
            })}
            {matching.length === 0 && (
              <p className="px-3 py-5 text-center text-sm text-slate-500">No matching events found.</p>
            )}
          </div>
          {matching.length > MAX_VISIBLE && (
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              Showing {MAX_VISIBLE} of {matching.length} matches. Type more to narrow the list.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
