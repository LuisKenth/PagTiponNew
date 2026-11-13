"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLiveData } from "@/app/components/live/BackgroundDataSync";
import {
  filterSchedules,
  scheduleConflicts,
  scheduleDate,
  scheduleStatus,
  type ScheduleRow,
  type ScheduleFilters,
} from "../utils/staffSchedules";
type Payload = {
  rows: ScheduleRow[];
  staff: {
    id: string;
    full_name: string | null;
    verification_status: string;
  }[];
  municipality: string;
  loadedAt: string;
};
const initialFilters: ScheduleFilters = {
  staffId: "all",
  status: "upcoming",
  from: "",
  to: "",
};
const control =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal";
const button =
  "min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40";
const colors: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-800",
  ongoing: "bg-emerald-50 text-emerald-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-50 text-red-800",
  unknown: "bg-amber-50 text-amber-800",
};
export default function StaffSchedulesPanel() {
  const [data, setData] = useState<Payload | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [filters, setFilters] = useState(initialFilters),
    [page, setPage] = useState(1),
    [now, setNow] = useState(0);
  const alive = useRef(false),
    generation = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      const { data: session, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !session.session)
        throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch(
        "/api/municipal/event-staff/assignments?view=schedules",
        {
          headers: { Authorization: `Bearer ${session.session.access_token}` },
          cache: "no-store",
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to load staff schedules.");
      if (!Array.isArray(result.rows) || !Array.isArray(result.staff))
        throw new Error("Invalid schedule response.");
      if (alive.current && ticket === generation.current) {
        setData(result);
        setError("");
        setNow(Date.now());
      }
    } catch (e) {
      if (alive.current && ticket === generation.current)
        setError(
          e instanceof Error ? e.message : "Unable to load staff schedules.",
        );
    } finally {
      if (alive.current && ticket === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    const changed = () => void load();
    window.addEventListener("pagtipon:staff-assignments-changed", changed);
    return () => {
      alive.current = false;
      generation.current++;
      window.clearInterval(timer);
      window.removeEventListener("pagtipon:staff-assignments-changed", changed);
    };
  }, [load]);
  useLiveData({ onUpdate: load, disabled: loading });
  const rows = data?.rows ?? [];
  const conflicts = useMemo(
    () => scheduleConflicts(data?.rows ?? [], now),
    [data, now],
  );
  const invalid = Boolean(
    filters.from && filters.to && filters.from > filters.to,
  );
  const filtered = useMemo(
    () => (invalid ? [] : filterSchedules(data?.rows ?? [], filters, now)),
    [data, filters, invalid, now],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10)),
    currentPage = Math.min(page, totalPages),
    start = (currentPage - 1) * 10,
    visible = filtered.slice(start, start + 10);
  function update(key: keyof ScheduleFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  function status(row: ScheduleRow) {
    const value = scheduleStatus(row, now);
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[value]}`}
      >
        {value === "unknown"
          ? "Schedule incomplete"
          : value.charAt(0).toUpperCase() + value.slice(1)}
      </span>
    );
  }
  function warning(row: ScheduleRow) {
    const other = conflicts.get(row.id) || [];
    return other.length > 0 ? (
      <details className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
        <summary className="cursor-pointer font-semibold">
          <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden="true" />
          Schedule conflict ({other.length})
        </summary>
        <ul className="mt-2 space-y-2">
          {other.map((c) => (
            <li key={c.id}>
              <strong className="block break-words">{c.title}</strong>
              {scheduleDate(c.start)} – {scheduleDate(c.end)} (PH)
            </li>
          ))}
        </ul>
      </details>
    ) : null;
  }
  function eventLink(row: ScheduleRow) {
    return (
      <Link
        href={`/dashboard/municipal/preparations?assignmentId=${encodeURIComponent(row.eventMunicipalityId)}`}
        className="inline-flex min-h-11 items-center font-semibold text-indigo-700 underline underline-offset-4"
      >
        View Event<span className="sr-only">: {row.title}</span>
      </Link>
    );
  }
  const conflictCount = new Set(
    rows.filter((r) => conflicts.has(r.id)).map((r) => r.staffId),
  ).size;
  return (
    <section
      aria-labelledby="staff-schedules-heading"
      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CalendarDays
            className="mt-1 h-6 w-6 shrink-0 text-indigo-600"
            aria-hidden="true"
          />
          <div>
            <h2
              id="staff-schedules-heading"
              className="text-lg font-bold text-slate-950"
            >
              Staff Schedules
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Provincial and municipal event assignments
              {data?.municipality ? ` in ${data.municipality}` : ""}. All times
              are Philippine time.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Assign or manage staff from the event’s Assign Staff / Manage
              Staff button. Removed assignments are excluded.
            </p>
          </div>
        </div>
        {data && (
          <p className="mt-3 text-xs text-slate-500">
            Updated: {scheduleDate(data.loadedAt)} (PH) · Updates automatically
          </p>
        )}
        {conflictCount > 0 && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden="true" />
            {conflictCount} staff member
            {conflictCount === 1 ? " has" : "s have"} overlapping upcoming or
            ongoing assignments. Conflicts are checked across all schedules
            before filters.
          </p>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="min-w-0 text-xs font-semibold">
            Staff
            <select
              className={control}
              value={filters.staffId}
              onChange={(e) => update("staffId", e.target.value)}
            >
              <option value="all">All staff</option>
              {data?.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || "Unnamed staff"}
                  {s.verification_status !== "approved"
                    ? " (inactive/pending)"
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-xs font-semibold">
            Event status
            <select
              className={control}
              value={filters.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="unknown">Schedule incomplete</option>
              <option value="all">All statuses</option>
            </select>
          </label>
          <label className="min-w-0 text-xs font-semibold">
            From (PH)
            <input
              type="date"
              className={control}
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => update("from", e.target.value)}
            />
          </label>
          <label className="min-w-0 text-xs font-semibold">
            To (PH)
            <input
              type="date"
              className={control}
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => update("to", e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Date range includes events running during the selected PH dates.
            Earliest schedule first.
          </p>
          <button
            type="button"
            className={button}
            onClick={() => {
              setFilters({ ...initialFilters });
              setPage(1);
            }}
          >
            Reset filters
          </button>
        </div>
        {invalid && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            From date must be on or before To date.
          </p>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
          {data
            ? " Displaying the last successfully loaded schedules."
            : ""}{" "}
          Automatic updates will retry.
        </p>
      )}
      {loading ? (
        <p role="status" className="p-6 text-sm text-slate-600">
          Loading staff schedules…
        </p>
      ) : !visible.length ? (
        <p role="status" className="p-6 text-sm text-slate-600">
          {invalid
            ? "Correct the date range to view schedules."
            : error && !data
              ? "Schedules are unavailable."
              : rows.length
                ? "No schedules match these filters. Try All statuses or another date range."
                : "No staff assignments yet. Assign staff from a prepared event to display its schedule here."}
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "Staff",
                    "Event",
                    "Schedule (PH)",
                    "Venue",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td className="max-w-56 break-words px-5 py-4 align-top font-semibold">
                      {row.staffName}
                      {row.staffStatus !== "approved" && (
                        <span className="mt-1 block text-xs font-normal text-slate-500">
                          Account:{" "}
                          {row.staffStatus === "rejected"
                            ? "Deactivated"
                            : row.staffStatus}
                        </span>
                      )}
                    </td>
                    <td className="max-w-72 break-words px-5 py-4 align-top">
                      <p className="font-semibold">{row.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.source}
                      </p>
                      {warning(row)}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="block">{scheduleDate(row.start)}</span>
                      <span className="mt-1 block text-slate-500">
                        to {scheduleDate(row.end)}
                      </span>
                    </td>
                    <td className="max-w-48 break-words px-5 py-4 align-top">
                      {row.venue}
                    </td>
                    <td className="px-5 py-4 align-top">{status(row)}</td>
                    <td className="px-5 py-4 align-top">{eventLink(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">
            {visible.map((row) => (
              <article key={row.id} className="min-w-0 space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 break-words font-bold text-slate-950">
                    {row.staffName}
                  </h3>
                  {status(row)}
                </div>
                <p className="break-words font-semibold">
                  {row.title}
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    {row.source}
                    {row.staffStatus !== "approved"
                      ? ` · Account: ${row.staffStatus === "rejected" ? "Deactivated" : row.staffStatus}`
                      : ""}
                  </span>
                </p>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Schedule (PH)</dt>
                    <dd>
                      {scheduleDate(row.start)}
                      <br />
                      to {scheduleDate(row.end)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Venue</dt>
                    <dd className="break-words">{row.venue}</dd>
                  </div>
                </dl>
                {warning(row)}
                {eventLink(row)}
              </article>
            ))}
          </div>
        </>
      )}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5 text-sm">
          <p role="status">
            Showing {start + 1}–{Math.min(start + 10, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={button}
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </button>
            <span aria-label={`Page ${currentPage} of ${totalPages}`}>
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              className={button}
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
