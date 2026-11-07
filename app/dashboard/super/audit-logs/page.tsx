"use client";
import { useEffect, useState } from "react";
import { Activity, Search, SlidersHorizontal } from "lucide-react";
import { superRequest, message } from "@/lib/super/client";
import { auditActions, formatDate, type AuditResult } from "@/lib/super/types";
import {
  PageHeader,
  RefreshButton,
  Loading,
  ErrorMessage,
  Pagination,
} from "../components/ui";
export default function AuditLogs() {
  const [result, setResult] = useState<AuditResult>({
      entries: [],
      total: 0,
      page: 1,
      pageSize: 15,
    }),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [search, setSearch] = useState(""),
    [action, setAction] = useState("all"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams({
            page: String(page),
            action,
            search,
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
          });
          const data = await superRequest<AuditResult>(
            `/api/super/audit-logs?${params}`,
            undefined,
            "GET",
            controller.signal,
          );
          if (!active) return;
          const max = Math.max(1, Math.ceil(data.total / data.pageSize));
          if (page > max) {
            setPage(max);
            return;
          }
          setResult(data);
          setError("");
        } catch (e) {
          if (active) setError(message(e));
        } finally {
          if (active) setLoading(false);
        }
      },
      search ? 250 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, action, from, to, revision]);
  return (
    <>
      <PageHeader
        eyebrow="Account history"
        title="Audit Logs"
        description="Review who changed an administrator account, what happened, and when it was recorded."
        icon={Activity}
      >
        <RefreshButton
          busy={loading}
          onClick={() => setRevision((v) => v + 1)}
        />
      </PageHeader>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            Filter Activity
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative">
              <span className="sr-only">Search administrator</span>
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or email…"
                className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm"
              />
            </label>
            <label>
              <span className="sr-only">Action</span>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
              >
                <option value="all">All actions</option>
                {Object.entries(auditActions).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              From · Philippine time
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-700"
              />
            </label>
            <label className="text-xs text-slate-500">
              To · Philippine time
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-700"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Names are shown where accounts still exist. Reset requests do not
              confirm delivery.
            </p>
            {(search || action !== "all" || from || to) && (
              <button
                className="ml-3 shrink-0 text-xs font-semibold text-indigo-600"
                onClick={() => {
                  setSearch("");
                  setAction("all");
                  setFrom("");
                  setTo("");
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : result.entries.length === 0 ? (
          <div className="py-14 text-center">
            <Activity className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No activity matches these filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {result.entries.map((entry) => (
              <article key={entry.id} className="p-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {auditActions[entry.action] ||
                        entry.action.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      <span className="font-medium text-slate-700">
                        {entry.actor_name}
                      </span>{" "}
                      <span className="mx-1 text-slate-300">→</span>{" "}
                      {entry.target_name}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-400">
                    {formatDate(entry.created_at)}
                  </time>
                </div>
                {Object.keys(entry.details).some((k) =>
                  ["oldEmail", "newEmail", "targetEmail", "reason"].includes(k),
                ) && (
                  <details className="mt-3 rounded-xl bg-slate-50 p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                      View change details
                    </summary>
                    <dl className="mt-3 space-y-2 text-xs leading-5">
                      {["oldEmail", "newEmail", "targetEmail", "reason"]
                        .filter((k) => typeof entry.details[k] === "string")
                        .map((key) => (
                          <div key={key}>
                            <dt className="font-semibold text-slate-500">
                              {key === "oldEmail"
                                ? "Previous email"
                                : key === "newEmail"
                                  ? "New email"
                                  : key === "targetEmail"
                                    ? "Account email"
                                    : "Reason"}
                            </dt>
                            <dd className="break-words text-slate-700">
                              {String(entry.details[key])}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </details>
                )}
              </article>
            ))}
          </div>
        )}
        {!loading && (
          <Pagination
            page={page}
            total={result.total}
            pageSize={15}
            onChange={setPage}
          />
        )}
      </section>
    </>
  );
}
