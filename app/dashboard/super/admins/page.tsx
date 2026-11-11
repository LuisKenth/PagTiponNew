"use client";
import BackgroundDataSync from "@/app/components/live/BackgroundDataSync";
import { message, superRequest } from "@/lib/super/client";
import {
  formatDate,
  type AccountResult,
  type ProvincialAccount,
} from "@/lib/super/types";
import {
  CalendarDays,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  Mail,
  MailCheck,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ErrorMessage,
  Loading,
  Modal,
  PageHeader,
  Pagination,
  StatusBadge,
  SuccessMessage,
  inputClass,
  primaryClass,
  secondaryClass,
} from "../components/ui";
type Credentials = { email: string; password: string };
export default function ProvincialAdmins() {
  const [result, setResult] = useState<AccountResult>({
    admins: [],
    total: 0,
    page: 1,
    pageSize: 10,
    capacity: null,
  });
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [createOpen, setCreateOpen] = useState(false),
    [recoveryTarget, setRecoveryTarget] = useState<ProvincialAccount | null>(
      null,
    );
  const [credentials, setCredentials] = useState<Credentials | null>(null),
    [showPassword, setShowPassword] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<ProvincialAccount | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ProvincialAccount | null>(
    null,
  );
  const inFlight = useRef(false),
    credentialsRef = useRef<HTMLDivElement>(null);
  const capacity = result.capacity;
  const slotAvailable =
    !!capacity && capacity.remaining > 0 && !loading && !error;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams({
            page: String(page),
            search,
            status,
          });
          const data = await superRequest<AccountResult>(
            `/api/super/admins?${params}`,
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
  }, [page, search, status, revision]);
  useEffect(() => {
    if (credentials)
      credentialsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }, [credentials]);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    if (!slotAvailable) {
      window.alert(
        "No Provincial Admin slot is available. Refresh the list or deactivate an existing Provincial Admin first.",
      );
      return;
    }
    const form = e.currentTarget;
    const data = new FormData(form);
    inFlight.current = true;
    setBusy(true);
    setSuccess("");
    try {
      const response = await superRequest<{
        credentials: Credentials;
        message: string;
      }>("/api/super/admins", {
        action: "create",
        firstName: data.get("firstName"),
        middleName: data.get("middleName"),
        lastName: data.get("lastName"),
        suffix: data.get("suffix"),
        email: data.get("email"),
      });
      setCredentials(response.credentials);
      setShowPassword(false);
      setCreateOpen(false);
      form.reset();
      setSuccess(response.message);
      setRevision((v) => v + 1);
    } catch (e) {
      window.alert(message(e));
      setRevision((v) => v + 1);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function accountAction(account: ProvincialAccount, action: string) {
    if (inFlight.current) return;
    if (
      action === "activate" &&
      account.verification_status !== "approved" &&
      !slotAvailable
    ) {
      window.alert(
        "Maximum of 2 active Provincial Admins reached, or slots are still loading. Refresh the list before activating this account.",
      );
      return;
    }
    const text =
      action === "recovery"
        ? `Send a reset link to ${account.email}? The owner needs access to this mailbox.`
        : `${action === "activate" ? "Activate" : "Deactivate"} ${account.full_name}?`;
    if (!window.confirm(text)) return;
    inFlight.current = true;
    setBusy(true);
    setSuccess("");
    try {
      const response = await superRequest<{ message: string }>(
        "/api/super/admins",
        { action, targetId: account.id },
      );
      setSuccess(response.message);
      window.alert(response.message);
      setRevision((v) => v + 1);
    } catch (e) {
      window.alert(message(e));
      setRevision((v) => v + 1);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function correctEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current || !recoveryTarget) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const newEmail = String(data.get("newEmail") || "")
      .trim()
      .toLowerCase();
    if (
      newEmail !==
      String(data.get("confirmEmail") || "")
        .trim()
        .toLowerCase()
    ) {
      window.alert("Email addresses do not match.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setSuccess("");
    try {
      const response = await superRequest<{
        message: string;
        warning?: string;
      }>("/api/super/recovery-email", {
        targetId: recoveryTarget.id,
        newEmail,
        reason: data.get("reason"),
        currentPassword: data.get("currentPassword"),
        identityVerified: data.get("identityVerified") === "on",
      });
      setRecoveryTarget(null);
      form.reset();
      setSuccess(response.message);
      setRevision((v) => v + 1);
      window.alert(response.warning || response.message);
    } catch (e) {
      window.alert(message(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function copyCredentials(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      window.alert("Copied successfully!");
    } catch {
      window.alert(
        "Unable to copy automatically. Select and copy the credentials manually.",
      );
    }
  }
  async function deleteAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current || !deleteTarget) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const confirmEmail = String(data.get("confirmEmail") || "")
      .trim()
      .toLowerCase();
    if (confirmEmail !== deleteTarget.email.trim().toLowerCase()) {
      window.alert(
        "The confirmation email does not match the selected account.",
      );
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setSuccess("");
    try {
      const response = await superRequest<{ message: string }>(
        "/api/super/admins/delete",
        {
          targetId: deleteTarget.id,
          confirmEmail,
          currentPassword: data.get("currentPassword"),
          reason: data.get("reason"),
          confirmPermanent: data.get("confirmPermanent") === "on",
        },
      );
      setDeleteTarget(null);
      setSelectedAdmin(null);
      form.reset();
      setSuccess(response.message);
      setRevision((v) => v + 1);
      window.alert(response.message);
    } catch (error) {
      window.alert(message(error));
      setRevision((v) => v + 1);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Account administration"
        title="Provincial Admins"
        description="Create administrator accounts, manage access, and help account owners recover their login."
        icon={Users}
      >
        <BackgroundDataSync
          onUpdate={() => setRevision((v) => v + 1)}
          disabled={loading || busy}
        />
        <button
          type="button"
          disabled={busy || !!credentials || !slotAvailable}
          className={primaryClass}
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Add Provincial Admin
        </button>
      </PageHeader>
      <section
        aria-label="Provincial Admin account limit"
        role="status"
        className={`rounded-2xl border p-5 ${capacity?.remaining === 0 ? "border-amber-200 bg-amber-50" : "border-indigo-100 bg-indigo-50/50"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Active Provincial Admins
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Maximum 2 active accounts. Inactive accounts are retained for
              history and do not use a slot.
            </p>
          </div>
          <span className="rounded-xl bg-white px-4 py-2 text-lg font-bold text-indigo-700">
            {capacity
              ? `${capacity.activeCount} / ${capacity.activeLimit}`
              : "— / 2"}
          </span>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          {loading
            ? "Checking available slots…"
            : error
              ? "Slots unavailable. Refresh before adding or activating an account."
              : capacity?.remaining === 0
                ? "Limit reached. Deactivate an existing Provincial Admin before adding or activating another."
                : `${capacity?.remaining ?? 0} available slot${capacity?.remaining === 1 ? "" : "s"}.`}
        </p>
      </section>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      {credentials && (
        <div
          ref={credentialsRef}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <h2 className="font-bold text-emerald-900">
            New Account Credentials
          </h2>
          <p className="mt-2 break-all text-sm">Email: {credentials.email}</p>
          <label className="mt-4 block text-sm font-semibold">
            Initial Password
            <input
              type={showPassword ? "text" : "password"}
              value={credentials.password}
              readOnly
              autoComplete="off"
              className={`${inputClass} font-mono`}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setShowPassword((v) => !v)}
              className={secondaryClass}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showPassword ? "Hide" : "Show"} Password
            </button>
            <button
              className={primaryClass}
              onClick={() =>
                void copyCredentials(
                  `Email: ${credentials.email}\nInitial Password: ${credentials.password}`,
                )
              }
            >
              <Copy className="h-4 w-4" />
              Copy Email and Password
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-emerald-800">
            Send privately. The owner must replace the initial password after
            signing in. Copy these credentials before refreshing or leaving this
            page.
          </p>
          <button
            onClick={() => {
              setCredentials(null);
              setShowPassword(false);
            }}
            className="mt-3 text-xs font-semibold text-emerald-800 underline"
          >
            Dismiss Credentials
          </button>
        </div>
      )}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Administrator Accounts</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {result.total} found
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <label className="relative">
              <span className="sr-only">Search name or email</span>
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or email…"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-indigo-400"
              />
            </label>
            <label>
              <span className="sr-only">Account status</span>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : result.admins.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto mb-3 h-9 w-9 text-slate-300" />
            <h3 className="font-semibold">No administrators found</h3>
            <p className="mt-2 text-sm text-slate-500">
              Adjust the filters or add a Provincial Admin.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {result.admins.map((account) => (
              <article
                key={account.id}
                className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                {/* Account name, creation date and status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                      {account.full_name?.charAt(0).toUpperCase() || "P"}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setSelectedAdmin(account)}
                          aria-haspopup="dialog"
                          className="max-w-full truncate rounded text-left hover:text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
                        >
                          {account.full_name || "Provincial Admin"}
                        </button>
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Created {formatDate(account.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={account.verification_status} />
                  </div>
                </div>

                {/* Email address */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 break-all">
                      {account.email || "No email address"}
                    </span>
                  </div>
                </div>

                {/* Existing actions, now inside each card */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setSelectedAdmin(account)}
                    aria-haspopup="dialog"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                    View Profile
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void accountAction(account, "recovery")}
                    className={secondaryClass}
                  >
                    <Mail className="h-4 w-4" />
                    Reset Email
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setRecoveryTarget(account)}
                    className={secondaryClass}
                  >
                    <MailCheck className="h-4 w-4" />
                    Update Email
                  </button>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      (account.verification_status !== "approved" &&
                        !slotAvailable)
                    }
                    title={
                      account.verification_status !== "approved" &&
                      !slotAvailable
                        ? "No active Provincial Admin slot available"
                        : undefined
                    }
                    onClick={() =>
                      void accountAction(
                        account,
                        account.verification_status === "approved"
                          ? "deactivate"
                          : "activate",
                      )
                    }
                    className={`${secondaryClass} ${account.verification_status === "approved" ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {account.verification_status === "approved"
                      ? "Deactivate"
                      : "Activate"}
                  </button>

                  {account.verification_status !== "approved" && (
                    <button
                      type="button"
                      disabled={busy}
                      className={`${secondaryClass} text-red-600`}
                      onClick={() => setDeleteTarget(account)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && (
          <Pagination
            page={page}
            total={result.total}
            pageSize={10}
            onChange={setPage}
          />
        )}
      </section>
      <Modal
        open={createOpen}
        busy={busy}
        title="Add Provincial Admin"
        description="Use an email address that the administrator controls."
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={create} className="space-y-4 p-5">
          <fieldset disabled={busy} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                First Name
                <input
                  name="firstName"
                  required
                  maxLength={100}
                  className={`${inputClass} font-normal`}
                  autoComplete="given-name"
                />
              </label>
              <label className="block text-sm font-semibold">
                Middle Name (optional)
                <input
                  name="middleName"
                  maxLength={100}
                  className={`${inputClass} font-normal`}
                  autoComplete="additional-name"
                />
              </label>
              <label className="block text-sm font-semibold">
                Last Name
                <input
                  name="lastName"
                  required
                  maxLength={100}
                  className={`${inputClass} font-normal`}
                  autoComplete="family-name"
                />
              </label>
              <label className="block text-sm font-semibold">
                Suffix (optional)
                <input
                  name="suffix"
                  maxLength={100}
                  className={`${inputClass} font-normal`}
                  autoComplete="honorific-suffix"
                  placeholder="e.g. Jr., III"
                />
              </label>
            </div>
            <label className="block text-sm font-semibold">
              Email Address
              <input
                type="email"
                name="email"
                required
                maxLength={254}
                className={`${inputClass} font-normal`}
                autoComplete="off"
              />
            </label>
            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              A strong initial password will be generated after account
              creation. The owner will be required to change it on first login.
            </p>
            {!slotAvailable && (
              <p role="alert" className="text-sm text-amber-800">
                No available slot. Refresh or deactivate an existing Provincial
                Admin before creating another.
              </p>
            )}
            <button
              className={`${primaryClass} w-full`}
              disabled={busy || !slotAvailable}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Creating…" : "Create Account"}
            </button>
          </fieldset>
          <button
            type="button"
            disabled={busy}
            className={`${secondaryClass} w-full`}
            onClick={() => setCreateOpen(false)}
          >
            Cancel
          </button>
        </form>
      </Modal>
      <Modal
        open={!!recoveryTarget}
        busy={busy}
        title="Update Recovery Email"
        description="Use this only after verifying the account owner's identity and the replacement address."
        onClose={() => setRecoveryTarget(null)}
      >
        <form onSubmit={correctEmail} className="space-y-4 p-5">
          <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            This changes the login email immediately. It does not send a
            verification email. After saving, use Reset Email to send the owner
            a password-reset link.
          </div>
          <div className="text-sm">
            <p className="font-semibold">{recoveryTarget?.full_name}</p>
            <p className="mt-1 break-all text-slate-500">
              Current email: {recoveryTarget?.email}
            </p>
          </div>
          <fieldset disabled={busy} className="space-y-4">
            <label className="block text-sm font-semibold">
              New Email
              <input
                name="newEmail"
                type="email"
                required
                maxLength={254}
                autoComplete="off"
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Confirm New Email
              <input
                name="confirmEmail"
                type="email"
                required
                maxLength={254}
                autoComplete="off"
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Reason for Correction
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={500}
                rows={3}
                placeholder="Explain the identity check and reason. Do not enter passwords, ID numbers, or document details."
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Your Super Admin Password
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
              <input
                name="identityVerified"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
              />
              I verified the account owner&apos;s identity and confirmed the
              replacement email address with them.
            </label>
            <button disabled={busy} className={`${primaryClass} w-full`}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Updating…" : "Confirm Email Correction"}
            </button>
          </fieldset>
          <button
            type="button"
            disabled={busy}
            className={`${secondaryClass} w-full`}
            onClick={() => setRecoveryTarget(null)}
          >
            Cancel
          </button>
        </form>
      </Modal>

      {/* Provincial Admin Profile Modal */}
      <Modal
        open={!!selectedAdmin}
        busy={false}
        title="Provincial Admin Profile"
        description="Administrator account information"
        onClose={() => setSelectedAdmin(null)}
      >
        {selectedAdmin && (
          <div className="space-y-0">
            {/* Profile Content */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6">
              {/* Profile Identity */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                  <UserRound size={27} />
                </div>

                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold text-slate-900">
                    {selectedAdmin.full_name || "Unnamed Admin"}
                  </h3>

                  <p className="text-sm text-slate-500">
                    Provincial Administrator
                  </p>

                  <div className="mt-2">
                    <StatusBadge status={selectedAdmin.verification_status} />
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                {/* Full Name */}
                <div className="flex items-start gap-3">
                  <UserRound
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Full Name
                    </p>

                    <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                      {selectedAdmin.full_name || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Email Address */}
                <div className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 shrink-0 text-slate-400" />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Email Address
                    </p>

                    <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                      {selectedAdmin.email || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Account Role / Status */}
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Account Role / Status
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Provincial Admin —{" "}
                      {selectedAdmin.verification_status === "approved"
                        ? "Active"
                        : selectedAdmin.verification_status === "inactive"
                          ? "Inactive"
                          : selectedAdmin.verification_status === "pending"
                            ? "Pending"
                            : selectedAdmin.verification_status === "rejected"
                              ? "Rejected"
                              : "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Registration Date */}
                <div className="flex items-start gap-3">
                  <CalendarDays
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Registration Date
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(selectedAdmin.created_at)}
                    </p>
                  </div>
                </div>

                {/* Account ID */}
                <div className="flex items-start gap-3">
                  <Fingerprint
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Account ID
                    </p>

                    <p className="mt-1 break-all font-mono text-xs text-slate-700">
                      {selectedAdmin.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedAdmin(null)}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        busy={busy}
        title="Delete Inactive Provincial Admin"
        description="Permanently remove an inactive administrator account."
        onClose={() => setDeleteTarget(null)}
      >
        <form
          key={deleteTarget?.id || "closed"}
          onSubmit={deleteAccount}
          className="space-y-4 p-5"
        >
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            This permanently deletes the login and profile. Audit history is
            retained. It cannot be undone. Linked records or uploaded files may
            prevent deletion.
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-900">
              {deleteTarget?.full_name}
            </p>
            <p className="mt-1 break-all text-slate-500">
              {deleteTarget?.email}
            </p>
          </div>
          <fieldset disabled={busy} className="space-y-4">
            <label className="block text-sm font-semibold">
              Type the Account Email
              <input
                name="confirmEmail"
                type="email"
                required
                maxLength={254}
                autoComplete="off"
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Reason for Deletion
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={500}
                rows={3}
                placeholder="e.g. Unused test account. Do not enter passwords or ID numbers."
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Your Super Admin Password
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
              <input
                name="confirmPermanent"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 shrink-0 accent-red-600"
              />
              I understand that this account will be permanently deleted.
            </label>
            <button
              disabled={busy}
              className={`${primaryClass} w-full bg-red-600 hover:bg-red-700`}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {busy ? "Deleting…" : "Delete Permanently"}
            </button>
          </fieldset>
          <button
            type="button"
            disabled={busy}
            className={`${secondaryClass} w-full`}
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </button>
        </form>
      </Modal>
    </>
  );
}
