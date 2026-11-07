"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { proofLabel, currentProof } from "@/lib/verificationStatus";

type VerificationType = "residency" | "category";
type VerificationStatus = "pending" | "approved" | "rejected";

type Profile = {
  id: string;
  full_name: string;
  role: string;
  municipality: string | null;
  participant_category: string | null;
  participant_category_other: string | null;
};

type Submission = {
  id: string;
  verification_type: VerificationType;
  municipality: string;
  participant_category: string | null;
  participant_category_other: string | null;
  document_type: string;
  document_path: string;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  withdrawn_at: string | null;
  document_deleted_at: string | null;
  status: VerificationStatus;
  rejection_reason: string | null;
  submitted_at: string;
};

const BUCKET = "participant-proofs";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const fileExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

const categoryLabels: Record<string, string> = {
  farmer: "Farmer",
  fisherman: "Fisherman",
  senior_citizen: "Senior Citizen",
  "4ps": "4Ps Beneficiary",
  others: "Others",
};

const categoryProofHints: Record<string, string> = {
  farmer: "Farmer registration or certification from the agriculture office.",
  fisherman:
    "Fisherfolk registration or certification from the municipal office.",
  senior_citizen:
    "Senior Citizen ID or another accepted document showing your age.",
  "4ps": "Beneficiary certification or a document showing 4Ps membership.",
  others:
    "A document or certification supporting your specified participant category.",
};

const statusStyles = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
};

const statusLabels = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default function ParticipantVerificationPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<VerificationType | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [files, setFiles] = useState<
    Record<VerificationType, File | null>
  >({
    residency: null,
    category: null,
  });

  const [documentTypes, setDocumentTypes] = useState({
    residency: "National ID",
    category: "",
  });

  const [consents, setConsents] = useState({
    residency: false,
    category: false,
  });

  const [inputKeys, setInputKeys] = useState({
    residency: 0,
    category: 0,
  });

  async function loadData() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in to view verification.");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, role, municipality, participant_category, participant_category_other"
        )
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData.role !== "participant") {
        throw new Error("This page is available to participants only.");
      }

      const { data: verificationData, error: verificationError } =
        await supabase
          .from("participant_verifications")
          .select(
            "id, verification_type, municipality, participant_category, participant_category_other, document_type, document_path, invalidated_at, invalidation_reason, withdrawn_at, document_deleted_at, status, rejection_reason, submitted_at"
          )
          .eq("participant_id", user.id)
          .order("submitted_at", { ascending: false });

      if (verificationError) throw verificationError;

      setProfile(profileData as Profile);
      setSubmissions((verificationData || []) as Submission[]);
    } catch (error) {
      setProfile(null);
      setErrorMessage(
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Unable to load verification details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function selectFile(type: VerificationType, file: File | null) {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!file) {
      setFiles((current) => ({ ...current, [type]: null }));
      return;
    }

    if (!fileExtensions[file.type]) {
      setErrorMessage("Please select a JPG, PNG, or PDF file.");
      setFiles((current) => ({ ...current, [type]: null }));
      setInputKeys((current) => ({
        ...current,
        [type]: current[type] + 1,
      }));
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setErrorMessage("Please select a non-empty file no larger than 5 MB.");
      setFiles((current) => ({ ...current, [type]: null }));
      setInputKeys((current) => ({
        ...current,
        [type]: current[type] + 1,
      }));
      return;
    }

    setFiles((current) => ({ ...current, [type]: file }));
  }

  async function submitProof(type: VerificationType) {
    if (!profile || uploading) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const file = files[type];
    const documentType = documentTypes[type].trim();

    if (!profile.municipality) {
      setErrorMessage("Please set your municipality before submitting.");
      return;
    }

    if (type === "category" && !profile.participant_category) {
      setErrorMessage("Please set your participant category first.");
      return;
    }

    if (!documentType || documentType.length > 100) {
      setErrorMessage("Please provide a document type of up to 100 characters.");
      return;
    }

    if (!file) {
      setErrorMessage("Please select a supporting document.");
      return;
    }

    if (!consents[type]) {
      setErrorMessage("Please confirm the document declaration.");
      return;
    }

    if (
      !fileExtensions[file.type] ||
      file.size === 0 ||
      file.size > MAX_FILE_SIZE
    ) {
      setErrorMessage("Please select a JPG, PNG, or PDF no larger than 5 MB.");
      return;
    }

    setUploading(type);

    let uploadedPath: string | null = null;
    let submissionAttempted = false;

    try {
      const path = `${profile.id}/${type}/${crypto.randomUUID()}.${fileExtensions[file.type]}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      uploadedPath = path;
      submissionAttempted = true;

      const { error: submitError } = await supabase.rpc(
        "submit_participant_verification",
        {
          p_verification_type: type,
          p_document_type: documentType,
          p_document_path: path,
        }
      );

      if (submitError) throw submitError;

      setFiles((current) => ({ ...current, [type]: null }));
      setConsents((current) => ({ ...current, [type]: false }));
      setInputKeys((current) => ({
        ...current,
        [type]: current[type] + 1,
      }));

      await loadData();

      setSuccessMessage(
        "Document submitted. Please wait for your Municipal Admin to review it."
      );
    } catch (error) {
      /*
       * After an RPC attempt, keep the upload:
       * a lost network response may still mean the submission succeeded.
       * Refresh before retrying.
       */
      if (uploadedPath && !submissionAttempted) {
        await supabase.storage.from(BUCKET).remove([uploadedPath]);
      }

      setErrorMessage(
        `${
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Unable to submit your document."
        }${submissionAttempted ? " Refresh the page to check the submission before retrying." : ""}`
      );
    } finally {
      setUploading(null);
    }
  }

  async function withdrawSubmission(submission: Submission) {
    if (uploading || !window.confirm("Withdraw this pending submission? You can then upload a corrected document.")) return;
    setUploading(submission.verification_type);
    try {
      const {error}=await supabase.rpc("withdraw_participant_verification",{p_submission_id:submission.id});
      if(error) throw error;
      await loadData();
      setSuccessMessage("Submission withdrawn. You may submit a new document.");
    } catch(error) {setErrorMessage(typeof error === "object" && error && "message" in error ? String(error.message) : "Unable to withdraw submission.");}
    finally {setUploading(null);}
  }

  async function openDocument(submission: Submission) {
    if (openingId) return;

    const documentWindow = window.open("about:blank", "_blank");
    if (!documentWindow) {setErrorMessage("Please allow pop-ups to view the document.");return;}
    documentWindow.opener = null;
    setOpeningId(submission.id);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(submission.document_path, 60);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Unable to open this document.");

      documentWindow.location.replace(data.signedUrl);
    } catch (error) {
      documentWindow.close();
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to open document."
      );
    } finally {
      setOpeningId(null);
    }
  }

  const latestFor = (type: VerificationType) =>
    profile
      ? submissions.find(
          (item) =>
            item.verification_type === type
        )
      : undefined;

  const residencyProof = latestFor("residency");
  const residencyApproved = Boolean(residencyProof && currentProof(residencyProof) && residencyProof.status === "approved");
  const categoryProof = latestFor("category");
  const categoryApproved = Boolean(categoryProof && currentProof(categoryProof) && categoryProof.status === "approved");

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Participant Account
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-950">
              Account Verification
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Submit proof of residency and participant category for review
              by your Municipal Admin.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading || Boolean(uploading)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>

        {profile && (
          <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Participant</p>
              <p className="mt-1 font-semibold text-slate-900">
                {profile.full_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Municipality</p>
              <p className="mt-1 font-semibold text-slate-900">
                {profile.municipality || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Category</p>
              <p className="mt-1 font-semibold text-slate-900">
                {profile.participant_category === "others"
                  ? profile.participant_category_other || "Others"
                  : categoryLabels[profile.participant_category || ""] ||
                    "Not set"}
              </p>
            </div>
          </div>
        )}
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

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Loading verification details...
        </div>
      ) : profile ? (
        <>
          <div
            className={`rounded-xl border p-4 text-sm ${
              residencyApproved && categoryApproved
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {residencyApproved && categoryApproved
              ? "Your residency and participant category are approved."
              : "Your account verification requires approval of both residency and participant category."}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {(["residency", "category"] as VerificationType[]).map((type) => {
              const latest = latestFor(type);

              const pendingSubmission = submissions.find(
                (item) =>
                  item.verification_type === type &&
                  item.status === "pending" && currentProof(item)
              );

              const blocked =
                Boolean(pendingSubmission) || Boolean(latest && currentProof(latest) && latest.status === "approved");

              const title =
                type === "residency"
                  ? "Residency Verification"
                  : "Category Verification";

              return (
                <section
                  key={type}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-950">
                      {title}
                    </h2>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        latest
                          ? (currentProof(latest) ? statusStyles[latest.status] : "border-slate-200 bg-slate-50 text-slate-600")
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {latest ? proofLabel(latest) : "Not Submitted"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {type === "residency"
                      ? "Upload your National ID showing your name and address. If the address is outdated, submit a barangay certificate of residency instead."
                      : categoryProofHints[
                          profile.participant_category || ""
                        ] || "Submit a document supporting your selected category."}
                  </p>

                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    Keep the information needed for review readable. Cover ID
                    numbers, QR codes, and unrelated personal details before
                    uploading. Files are stored privately and are accessible
                    to you and authorized Municipal Admin reviewers.
                  </p>

                  {latest?.invalidated_at && (<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{latest.invalidation_reason}</p>)}
                  {latest?.status === "rejected" && currentProof(latest) && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <p className="font-semibold">Reason for rejection</p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {latest.rejection_reason}
                      </p>
                      <p className="mt-2">You may submit a corrected document.</p>
                    </div>
                  )}

                  {pendingSubmission && (
                    <p className="mt-4 text-sm text-amber-800">
                      A submission is awaiting review. If your profile details
                      changed, contact your Municipal Admin before resubmitting.
                    </p>
                  )}

                  {!blocked && (
                    <form
                      className="mt-5 space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submitProof(type);
                      }}
                    >
                      <fieldset
                        disabled={Boolean(uploading)}
                        className="space-y-4"
                      >
                        <div>
                          <label
                            htmlFor={`${type}-document-type`}
                            className="mb-2 block text-sm font-medium text-slate-700"
                          >
                            Document type
                          </label>
                          <input
                            id={`${type}-document-type`}
                            type="text"
                            maxLength={100}
                            required
                            placeholder={
                              type === "residency"
                                ? "National ID / Barangay Certificate"
                                : "e.g. Farmer Certification"
                            }
                            value={documentTypes[type]}
                            onChange={(event) =>
                              setDocumentTypes((current) => ({
                                ...current,
                                [type]: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`${type}-file`}
                            className="mb-2 block text-sm font-medium text-slate-700"
                          >
                            Supporting document
                          </label>
                          <input
                            key={inputKeys[type]}
                            id={`${type}-file`}
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            required
                            onChange={(event) =>
                              selectFile(
                                type,
                                event.target.files?.[0] || null
                              )
                            }
                            className="block w-full rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700"
                          />
                          <p className="mt-2 text-xs text-slate-500">
                            JPG, PNG, or PDF. Maximum file size: 5 MB.
                          </p>
                        </div>

                        <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
                          <input
                            type="checkbox"
                            checked={consents[type]}
                            onChange={(event) =>
                              setConsents((current) => ({
                                ...current,
                                [type]: event.target.checked,
                              }))
                            }
                            className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                          />
                          <span>
                            I confirm that this document is mine and supports
                            the details I provided. I understand it will be
                            reviewed for account verification.
                          </span>
                        </label>

                        <button
                          type="submit"
                          disabled={
                            Boolean(uploading) ||
                            !files[type] ||
                            !documentTypes[type].trim() ||
                            !consents[type]
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {uploading === type ? (
                            <Loader2
                              className="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Upload className="h-4 w-4" aria-hidden="true" />
                          )}
                          {uploading === type
                            ? "Submitting..."
                            : "Submit for Review"}
                        </button>
                      </fieldset>
                    </form>
                  )}
                </section>
              );
            })}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              Submission History
            </h2>

            {submissions.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                You have not submitted any documents yet.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {submission.verification_type === "residency"
                          ? "Residency"
                          : "Category"}{" "}
                        — {submission.document_type}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {submission.municipality} ·{" "}
                        {formatDate(submission.submitted_at)}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          (currentProof(submission) ? statusStyles[submission.status] : "border-slate-200 bg-slate-50 text-slate-600")
                        }`}
                      >
                        {proofLabel(submission)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void openDocument(submission)}
                      disabled={Boolean(openingId) || Boolean(submission.document_deleted_at)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {openingId === submission.id ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      )}
                      {submission.document_deleted_at ? "Document Removed" : "View Document"}
                    </button>
                    {submission.status === "pending" && currentProof(submission) && (
                      <button type="button" disabled={Boolean(uploading)} onClick={()=>void withdrawSubmission(submission)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 disabled:opacity-50">Withdraw Submission</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}