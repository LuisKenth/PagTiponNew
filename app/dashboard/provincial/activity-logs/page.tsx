"use client";
import { useEffect, useState } from "react";
import { History, Loader2, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_CATEGORIES,
  activityDate,
  type ActivityEntry,
  type ActivityResult,
} from "@/lib/provincialActivity";
import ProvincialPageHeader, {
  provincialHeaderButton,
} from "../components/ProvincialPageHeader";
const defaults = {
  q: "",
  category: "all",
  action: "all",
  from: "",
  to: "",
  page: 1,
  pageSize: 20,
};
const inputClass =
  "mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const fields: Record<string, string> = {
  title: "Title",
  description: "Description",
  start_at: "Start",
  end_at: "End",
  status: "Status",
  audience_type: "Audience",
  audience_categories: "Categories",
  audience_category_other: "Other category",
};
function valueText(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if ((key === "start_at" || key === "end_at") && typeof value === "string")
    return activityDate(value) + " (PH)";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  return String(value);
}
function EntryDetails({ entry }: { entry: ActivityEntry }) {
  const details = entry.details;
  const before =
    details.before && typeof details.before === "object"
      ? (details.before as Record<string, unknown>)
      : {};
  const after =
    details.after && typeof details.after === "object"
      ? (details.after as Record<string, unknown>)
      : {};
  const changed = Array.isArray(details.changedFields)
    ? details.changedFields.filter(
        (key): key is string =>
          typeof key === "string" && Object.hasOwn(fields, key),
      )
    : [];
  return (
    <div className="mt-3 space-y-2 text-sm text-slate-600">
      {typeof details.email === "string" && (
        <p className="break-all">Account email: {details.email}</p>
      )}
      {typeof details.previousStatus === "string" && (
        <p>
          Previous status:{" "}
          {details.previousStatus === "approved"
            ? "Active"
            : details.previousStatus}
        </p>
      )}
      {typeof details.previousFileName === "string" && (
        <p className="break-words">Previous file: {details.previousFileName}</p>
      )}
      {details.eventDeleted === true && (
        <p>The memo was removed together with its event.</p>
      )}
      {changed.length > 0 && (
        <details className="rounded-lg bg-slate-50 p-3">
          <summary className="cursor-pointer font-medium text-slate-700">
            View changes ({changed.length})
          </summary>
          <dl className="mt-3 space-y-3">
            {changed.map((key) => (
              <div key={key} className="break-words">
                <dt className="font-semibold text-slate-800">{fields[key]}</dt>
                <dd className="mt-1 whitespace-pre-wrap">
                  Before: {valueText(key, before[key])}
                </dd>
                <dd className="mt-1 whitespace-pre-wrap">
                  After: {valueText(key, after[key])}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
export default function ProvincialActivityLogsPage() {
  const [filters, setFilters] = useState(defaults),
    [revision, setRevision] = useState(0);
  const [result, setResult] = useState<ActivityResult>({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !session)
          throw new Error("Your session has expired. Please sign in again.");
        const params = new URLSearchParams(
          Object.entries(filters).map(([key, value]) => [key, String(value)]),
        );
        const response = await fetch(
          "/api/provincial/activity-logs?" + params,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            signal: controller.signal,
            cache: "no-store",
          },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Unable to load activity logs.");
        if (cancelled) return;
        const data = body as ActivityResult;
        const last = Math.max(1, Math.ceil(data.total / filters.pageSize));
        if (filters.page > last) {
          cancelled = true;
          setFilters((current) => ({ ...current, page: last }));
          return;
        }
        setResult(data);
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load activity logs.",
          );
          setResult({
            entries: [],
            total: 0,
            page: 1,
            pageSize: filters.pageSize,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [filters, revision]);
  const update = (values: Partial<typeof defaults>) => {
    setLoading(true);
    setFilters((current) => ({
      ...current,
      ...values,
      page: values.page ?? 1,
    }));
  };
  const pageCount = Math.max(1, Math.ceil(result.total / filters.pageSize));
  const first = result.total ? (result.page - 1) * result.pageSize + 1 : 0,
    last = result.total ? first + result.entries.length - 1 : 0;
  return (
    <div className="min-w-0 space-y-6 pb-6">
      <ProvincialPageHeader
        icon={<History size={22} />}
        eyebrow="Administration"
        title="Activity Logs"
        description="Review who managed Municipal Admin accounts, events, and official memos."
        actions={
          <button
            type="button"
            className={provincialHeaderButton}
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />{" "}
            Refresh Logs
          </button>
        }
      />
      <section
        aria-label="Filter activity"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Filter Activity</h2>
          <button
            type="button"
            className="text-sm font-semibold text-indigo-700 hover:underline"
            onClick={() => {
              setLoading(true);
              setFilters({ ...defaults });
            }}
          >
            Reset Filters
          </button>
        </div>
        <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block min-w-0 text-sm font-medium text-slate-700">
            Search activity
            <div className="mt-2" style={{ position: "relative" }}>
              <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none text-slate-400"
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />

              <input
                type="search"
                aria-label="Search activity"
                value={filters.q}
                maxLength={120}
                onChange={(event) => update({ q: event.target.value })}
                placeholder="Name, email, event title, or memo…"
                className={inputClass}
                style={{ marginTop: 0, paddingLeft: 42 }}
              />
            </div>
          </label>
          <label className="min-w-0 text-sm font-medium text-slate-700">
            Category
            <select
              value={filters.category}
              onChange={(event) => update({ category: event.target.value })}
              className={inputClass}
            >
              <option value="all">All categories</option>
              {Object.entries(ACTIVITY_CATEGORIES).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-sm font-medium text-slate-700">
            Action
            <select
              value={filters.action}
              onChange={(event) => update({ action: event.target.value })}
              className={inputClass}
            >
              <option value="all">All actions</option>
              {Object.entries(ACTIVITY_ACTIONS).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-sm font-medium text-slate-700">
            From · Philippine time
            <input
              type="date"
              value={filters.from}
              onChange={(event) => update({ from: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="min-w-0 text-sm font-medium text-slate-700">
            To · Philippine time
            <input
              type="date"
              value={filters.to}
              onChange={(event) => update({ to: event.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Search and filters apply automatically. Only successful database
          changes are recorded. Names and titles are saved with each entry.
          Older recorded account actions are included; event and memo history
          starts when activity logging is enabled.
        </p>
      </section>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <section
        aria-label="Activity history"
        aria-busy={loading}
        className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 sm:px-6">
          <h2 className="font-semibold text-slate-900">Activity History</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {loading ? "Loading…" : `${result.total} found`}
          </span>
        </div>
        {loading ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"
          >
            <Loader2 size={20} className="animate-spin" /> Loading activity
            logs…
          </div>
        ) : error ? (
          <p className="p-10 text-center text-sm text-slate-500">
            Activity logs could not be loaded. Use Refresh Logs to retry.
          </p>
        ) : result.entries.length === 0 ? (
          <div className="p-10 text-center">
            <History className="mx-auto text-slate-400" size={30} />
            <p className="mt-3 font-semibold text-slate-800">
              No activity logs found
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Try another search or filter. New successful activities will
              appear here.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-slate-100">
            {result.entries.map((entry) => (
              <li key={entry.id} className="min-w-0 p-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {ACTIVITY_ACTIONS[entry.action] || entry.action}
                      </h3>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {ACTIVITY_CATEGORIES[entry.category]}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm font-medium text-slate-800">
                      {entry.target_name}
                    </p>
                    {entry.event_title && entry.category === "memo" && (
                      <p className="mt-1 break-words text-sm text-slate-500">
                        Event: {entry.event_title}
                      </p>
                    )}
                    {entry.municipality && (
                      <p className="mt-1 text-sm text-slate-500">
                        Municipality: {entry.municipality}
                      </p>
                    )}
                  </div>
                  <time
                    dateTime={entry.created_at}
                    className="text-xs text-slate-500"
                  >
                    {activityDate(entry.created_at)} (PH)
                  </time>
                </div>
                <p className="mt-3 break-words text-sm text-slate-600">
                  By{" "}
                  <span className="font-medium text-slate-800">
                    {entry.actor_name}
                  </span>
                  {entry.actor_email && (
                    <span className="break-all"> · {entry.actor_email}</span>
                  )}
                </p>
                <EntryDetails entry={entry} />
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5 text-sm text-slate-600 sm:px-6">
          <p aria-live="polite">
            {loading
              ? "Loading…"
              : `Showing ${first}–${last} of ${result.total}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Logs per page"
              value={filters.pageSize}
              disabled={loading}
              onChange={(event) =>
                update({ pageSize: Number(event.target.value) })
              }
              className="rounded-xl border border-slate-300 bg-white p-2"
            >
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button
              type="button"
              disabled={loading || filters.page <= 1}
              onClick={() => update({ page: filters.page - 1 })}
              className="rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              {filters.page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={loading || filters.page >= pageCount}
              onClick={() => update({ page: filters.page + 1 })}
              className="rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
