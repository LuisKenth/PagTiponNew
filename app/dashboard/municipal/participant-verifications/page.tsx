"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { proofLabel, currentProof } from "@/lib/verificationStatus";

type Status = "pending" | "approved" | "rejected";
type Filter = Status | "all";

type Submission = {
  id: string;
  participant_id: string;
  verification_type: "residency" | "category";
  municipality: string;
  participant_category: string | null;
  participant_category_other: string | null;
  document_type: string;
  document_path: string;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  withdrawn_at: string | null;
  document_deleted_at: string | null;
  status: Status;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type Participant = {
  id: string;
  full_name: string;
};

type ReviewItem = Submission & {
  participant_name: string;
};

type ReviewAction = {
  item: ReviewItem;
  decision: "approved" | "rejected";
};

const PAGE_SIZE = 10;

const categoryLabels: Record<string, string> = {
  farmer: "Farmer",
  fisherman: "Fisherman",
  senior_citizen: "Senior Citizen",
  "4ps": "4Ps Beneficiary",
  others: "Others",
};

const statusLabels: Record<Status, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

const statusStyles: Record<Status, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function errorText(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export default function MunicipalParticipantVerificationsPage() {
  const [municipality, setMunicipality] = useState("");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error("Please sign in first.");

        const { data: admin, error: adminError } = await supabase
          .from("profiles")
          .select("role, municipality, verification_status")
          .eq("id", user.id)
          .single();

        if (adminError) throw adminError;

        if (
          admin.role !== "municipal_admin" ||
          admin.verification_status !== "approved" ||
          !admin.municipality
        ) {
          throw new Error(
            "Only approved Municipal Admins can access this page."
          );
        }

        let query = supabase
          .from("participant_verifications")
          .select(
            "id, participant_id, verification_type, municipality, participant_category, participant_category_other, document_type, document_path, invalidated_at, invalidation_reason, withdrawn_at, document_deleted_at, status, rejection_reason, submitted_at, reviewed_at",
            { count: "exact" }
          )
          .eq("municipality", admin.municipality);

        if (filter !== "all") {
          query = query.eq("status", filter).is("invalidated_at", null).is("withdrawn_at", null);
        }

        const from = (page - 1) * PAGE_SIZE;

        const { data, error, count } = await query
          .order("submitted_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        const rows = (data || []) as Submission[];
        const participantIds = [
          ...new Set(rows.map((row) => row.participant_id)),
        ];

        let participants: Participant[] = [];

        if (participantIds.length > 0) {
          const { data: profileData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", participantIds);

          if (profilesError) throw profilesError;

          participants = (profileData || []) as Participant[];
        }

        const names = new Map(
          participants.map((participant) => [
            participant.id,
            participant.full_name,
          ])
        );

        if (cancelled) return;

        setMunicipality(admin.municipality);
        setTotal(count || 0);
        setItems(
          rows.map((row) => ({
            ...row,
            participant_name:
              names.get(row.participant_id) || "Name unavailable",
          }))
        );

        const lastPage = Math.max(
          1,
          Math.ceil((count || 0) / PAGE_SIZE)
        );

        if (page > lastPage) {
          setPage(lastPage);
        }
      } catch (error) {
        if (cancelled) return;

        setItems([]);
        setTotal(0);
        setErrorMessage(
          errorText(error, "Unable to load participant submissions.")
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [filter, page, refreshKey]);

  useEffect(() => {
    if (!reviewAction) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        setReviewAction(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [reviewAction, saving]);

  async function openDocument(item: ReviewItem) {
    if (openingId) return;

    // Open synchronously so browsers do not block the document tab.
    const documentWindow = window.open("about:blank", "_blank");

    if (!documentWindow) {
      setErrorMessage(
        "Please allow pop-ups for this site to view the document."
      );
      return;
    }

    documentWindow.opener = null;
    setOpeningId(item.id);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.storage
        .from("participant-proofs")
        .createSignedUrl(item.document_path, 60);

      if (error) throw error;
      if (!data?.signedUrl) {
        throw new Error("Unable to open this document.");
      }

      documentWindow.location.replace(data.signedUrl);
    } catch (error) {
      documentWindow.close();
      setErrorMessage(errorText(error, "Unable to open the document."));
    } finally {
      setOpeningId(null);
    }
  }

  function startReview(
    item: ReviewItem,
    decision: "approved" | "rejected"
  ) {
    setRejectionReason("");
    setReviewError(null);
    setReviewAction({ item, decision });
  }

  async function saveReview() {
    if (!reviewAction || saving) return;

    if (
      reviewAction.decision === "rejected" &&
      !rejectionReason.trim()
    ) {
      setReviewError("Please provide a rejection reason.");
      return;
    }

    setSaving(true);
    setReviewError(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.rpc(
        "review_participant_verification",
        {
          p_submission_id: reviewAction.item.id,
          p_decision: reviewAction.decision,
          p_rejection_reason:
            reviewAction.decision === "rejected"
              ? rejectionReason.trim()
              : null,
        }
      );

      if (error) throw error;

      setSuccessMessage(
        `Submission ${
          reviewAction.decision === "approved" ? "approved" : "rejected"
        } successfully.`
      );
      setReviewAction(null);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setReviewError(
        errorText(error, "Unable to save the review. Please try again.")
      );
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Municipal Administration
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-950">
              Participant Verification
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review residency and category documents
              {municipality ? ` for ${municipality}` : ""}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>

        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          For residency, compare the document name and address with the
          participant details. For category, check that the document supports
          the category shown on the submission. Review each requirement
          separately.
        </p>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{successMessage}</p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-950">
            Submissions
          </h2>

          <div>
            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="status-filter"
              value={filter}
              disabled={saving}
              onChange={(event) => {
                setFilter(event.target.value as Filter);
                setPage(1);
                setSuccessMessage(null);
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Submissions</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Loading submissions...
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            No submissions found for this filter.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      {item.participant_name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.verification_type === "residency"
                        ? "Residency Verification"
                        : "Category Verification"}
                      {" · "}
                      {item.municipality}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      (currentProof(item) ? statusStyles[item.status] : "border-slate-200 bg-slate-50 text-slate-600")
                    }`}
                  >
                    {proofLabel(item)}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-500">Document</dt>
                    <dd className="mt-1 font-medium text-slate-800">
                      {item.document_type}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-500">Submitted</dt>
                    <dd className="mt-1 text-slate-800">
                      {formatDate(item.submitted_at)}
                    </dd>
                  </div>

                  {item.verification_type === "category" && (
                    <div>
                      <dt className="text-xs text-slate-500">
                        Submitted category
                      </dt>
                      <dd className="mt-1 font-medium text-slate-800">
                        {item.participant_category === "others"
                          ? item.participant_category_other || "Others"
                          : categoryLabels[
                              item.participant_category || ""
                            ] || "Not specified"}
                      </dd>
                    </div>
                  )}

                  {item.reviewed_at && (
                    <div>
                      <dt className="text-xs text-slate-500">Reviewed</dt>
                      <dd className="mt-1 text-slate-800">
                        {formatDate(item.reviewed_at)}
                      </dd>
                    </div>
                  )}
                </dl>

                {item.rejection_reason && (
                  <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-semibold">Rejection reason</p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {item.rejection_reason}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openDocument(item)}
                    disabled={Boolean(openingId) || saving || Boolean(item.document_deleted_at)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {openingId === item.id ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    )}
                    {item.document_deleted_at ? "Document Removed" : "View Document"}
                  </button>

                  {item.status === "pending" && currentProof(item) && (
                    <>
                      <button
                        type="button"
                        onClick={() => startReview(item, "approved")}
                        disabled={saving}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => startReview(item, "rejected")}
                        disabled={saving}
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">
            {loading
              ? "Loading..."
              : `Showing ${
                  total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
                }–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading || saving || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-slate-600">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={loading || saving || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {reviewAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2
                id="review-title"
                className="text-lg font-bold text-slate-950"
              >
                {reviewAction.decision === "approved"
                  ? "Approve Submission"
                  : "Reject Submission"}
              </h2>

              <button
                type="button"
                disabled={saving}
                onClick={() => setReviewAction(null)}
                aria-label="Close review"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {reviewAction.item.participant_name}
              {" · "}
              {reviewAction.item.verification_type === "residency"
                ? "Residency"
                : "Category"}
            </p>

            {reviewAction.decision === "approved" ? (
              <p className="mt-4 text-sm leading-6 text-slate-700">
                Confirm that you reviewed the document and that it supports
                this verification requirement.
              </p>
            ) : (
              <div className="mt-4">
                <label
                  htmlFor="rejection-reason"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Rejection reason
                </label>
                <textarea
                  id="rejection-reason"
                  autoFocus
                  rows={4}
                  maxLength={1000}
                  disabled={saving}
                  value={rejectionReason}
                  onChange={(event) => {
                    setRejectionReason(event.target.value);
                    setReviewError(null);
                  }}
                  placeholder="Explain what the participant needs to correct."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {rejectionReason.length}/1000
                </p>
              </div>
            )}

            {reviewError && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
              >
                {reviewError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setReviewAction(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void saveReview()}
                disabled={
                  saving ||
                  (reviewAction.decision === "rejected" &&
                    !rejectionReason.trim())
                }
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  reviewAction.decision === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {saving && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}