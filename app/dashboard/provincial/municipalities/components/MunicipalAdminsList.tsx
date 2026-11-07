"use client";
import { useState } from "react";
import type { MunicipalAdmin } from "../types/municipality";
import { formatDate } from "../utils/municipalityUtils";
import MunicipalAdminActions, {
  municipalAdminStatus,
} from "./MunicipalAdminActions";

export default function MunicipalAdminsList({
  admins,
  onChanged,
}: {
  admins: MunicipalAdmin[];
  onChanged: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const query = search.trim().toLowerCase();
  const matches = admins.filter(
    (a) =>
      (status === "all" || a.verification_status === status) &&
      [a.full_name, a.email, a.municipality].some((v) =>
        v?.toLowerCase().includes(query),
      ),
  );
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">
        Municipal Administrators
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Manage active and inactive accounts. Only active admins use the 2 slots
        per municipality. Deactivate an account before deleting it.
      </p>
      <div className="my-5 flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Search municipal admins"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, or municipality…"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 p-3 text-sm"
        />
        <select
          aria-label="Filter admin status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white p-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="approved">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Showing {matches.length} of {admins.length} administrators
      </p>
      {matches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No matching administrators.
        </p>
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          {matches.map((admin) => (
            <article
              key={admin.id}
              className="min-w-0 rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="break-words font-semibold text-slate-900">
                  {admin.full_name || "Unnamed Admin"}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${admin.verification_status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {municipalAdminStatus(admin.verification_status)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {admin.municipality || "Not assigned"}
              </p>
              <p className="mt-1 break-all text-sm text-slate-600">
                {admin.email || "No email"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Created {formatDate(admin.created_at)}
              </p>
              <MunicipalAdminActions admin={admin} onChanged={onChanged} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
