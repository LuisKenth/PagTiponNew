"use client";
import BackgroundDataSync from "@/app/components/live/BackgroundDataSync";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";
import { Download, Loader2, Search, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  VERIFICATION_LABELS,
  filterParticipants,
  joinedDate,
  participantsCsv,
  type ParticipantRow,
} from "./participants/model";
import { readParticipantDirectory } from "./participants/readDirectory";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const input =
  "mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
function Verification({ row }: { row: ParticipantRow }) {
  const color =
    row.verification === "verified"
      ? "bg-emerald-50 text-emerald-700"
      : row.verification === "pending"
        ? "bg-amber-50 text-amber-700"
        : row.verification === "rejected" || row.verification === "restricted"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-600";
  return (
    <div>
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
      >
        {VERIFICATION_LABELS[row.verification]}
      </span>
      <p className="mt-2 text-xs text-slate-500">Residency: {row.residency}</p>
      <p className="mt-1 text-xs text-slate-500">
        Category: {row.categoryProof}
      </p>
    </div>
  );
}
export default function MunicipalParticipantsPage() {
  const [rows, setRows] = useState<ParticipantRow[]>([]),
    [municipality, setMunicipality] = useState("");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [verification, setVerification] = useState("all"),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await readParticipantDirectory(controller.signal);
        if (!cancelled) {
          setRows(data.rows);
          setMunicipality(data.municipality);
        }
      } catch (error) {
        if (!cancelled) {
          setRows([]);
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load participants.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [revision]);
  const filtered = useMemo(
    () => filterParticipants(rows, query, category, verification),
    [rows, query, category, verification],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    current = Math.min(page, pages),
    offset = (current - 1) * pageSize,
    visible = filtered.slice(offset, offset + pageSize),
    verified = rows.filter((row) => row.verification === "verified").length;
  const refresh = () => {
    setLoading(true);
    setRevision((value) => value + 1);
  };
  const reset = () => {
    setQuery("");
    setCategory("all");
    setVerification("all");
    setPage(1);
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([participantsCsv(filtered)], {
        type: "text/csv;charset=utf-8;",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "municipal-participants.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="min-w-0 space-y-6 pb-6">
      <MunicipalPageHeader
        icon={<Users className="h-6 w-6" />}
        eyebrow="Municipal Directory"
        title="Participants"
        description={
          <>
            All participant accounts in{" "}
            <strong>{municipality || "your municipality"}</strong>, including
            users without registrations.
          </>
        }
        actions={
          <>
            <button
              type="button"
              className={button}
              onClick={exportCsv}
              disabled={loading || !!error || filtered.length === 0}
            >
              <Download size={17} /> Export CSV
            </button>
            <BackgroundDataSync onUpdate={refresh} disabled={loading} />
          </>
        }
      />
      <section
        aria-label="Filter participants"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Find Participants</h2>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            Reset Filters
          </button>
        </div>
        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-3">
          <label className="block min-w-0 text-sm font-medium text-slate-700">
            Search participants
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
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Name, email, mobile, or category…"
                className={input}
                style={{ marginTop: 0, paddingLeft: 42 }}
              />
            </div>
          </label>
          <label className="block min-w-0 text-sm font-medium text-slate-700">
            Participant category
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className={input}
            >
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 text-sm font-medium text-slate-700">
            Document verification
            <select
              value={verification}
              onChange={(event) => {
                setVerification(event.target.value);
                setPage(1);
              }}
              className={input}
            >
              <option value="all">All statuses</option>
              {Object.entries(VERIFICATION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs leading-5 text-slate-500">
          <p>
            Verified means both current residency and category proofs are
            approved.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard/municipal/participant-verifications"
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
            >
              <ShieldCheck size={15} /> Review Documents
            </Link>
            <Link
              href="/dashboard/municipal/registrations/events"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Event Registrations →
            </Link>
          </div>
        </div>
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
        aria-label="Participant directory"
        aria-busy={loading}
        className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 sm:px-6">
          <div>
            <h2 className="font-semibold text-slate-900">
              {municipality
                ? `${municipality} Participants`
                : "Participant Directory"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              One account per participant · names sorted A–Z
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {loading
              ? "Loading…"
              : error
                ? "Unavailable"
                : `${rows.length} total · ${verified} verified`}
          </span>
        </div>
        {loading ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"
          >
            <Loader2 size={20} className="animate-spin" /> Loading participants…
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">
              Participant data could not be loaded.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 text-sm font-semibold text-indigo-600 underline"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 font-semibold text-slate-800">
              No participants found
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {rows.length
                ? "Try another search or filter."
                : "Participant accounts in this municipality will appear here, even before they register for an event."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Participant</th>
                    <th className="px-5 py-3 font-semibold">Contact</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Verification</th>
                    <th className="px-5 py-3 font-semibold">Joined · PH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((row) => (
                    <tr key={row.id}>
                      <td className="max-w-60 break-words px-5 py-4 align-top font-semibold text-slate-900">
                        {row.full_name || "Unnamed participant"}
                      </td>
                      <td className="max-w-64 break-all px-5 py-4 align-top text-slate-600">
                        <p>{row.email || "No email"}</p>
                        <p className="mt-2 text-xs">
                          {row.mobile_number || "No mobile number"}
                        </p>
                      </td>
                      <td className="max-w-48 break-words px-5 py-4 align-top text-slate-600">
                        {row.categoryLabel}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <Verification row={row} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 align-top text-xs text-slate-500">
                        {joinedDate(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {visible.map((row) => (
                <article key={row.id} className="min-w-0 p-5">
                  <h3 className="break-words text-sm font-semibold text-slate-900">
                    {row.full_name || "Unnamed participant"}
                  </h3>
                  <p className="mt-2 break-all text-sm text-slate-600">
                    {row.email || "No email"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {row.mobile_number || "No mobile number"}
                  </p>
                  <p className="mt-3 break-words text-xs font-medium text-slate-600">
                    {row.categoryLabel}
                  </p>
                  <div className="mt-3">
                    <Verification row={row} />
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Joined {joinedDate(row.created_at)} (PH)
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
        {!loading && !error && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5 text-sm text-slate-600">
            <p aria-live="polite">
              Showing {filtered.length ? offset + 1 : 0}–
              {Math.min(offset + pageSize, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Participants per page"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-xl border border-slate-300 bg-white p-2"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <button
                type="button"
                onClick={() => setPage(Math.max(1, current - 1))}
                disabled={current <= 1}
                className={button}
              >
                Previous
              </button>
              <span>
                {current} / {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(pages, current + 1))}
                disabled={current >= pages}
                className={button}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
