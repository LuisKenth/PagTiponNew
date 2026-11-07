"use client";
import { Copy, Eye, EyeOff } from "lucide-react";
import { isStrongPassword } from "@/lib/passwordPolicy";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  UserX,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import EventStaffAssignmentsPanel from "./components/EventStaffAssignmentsPanel";
import CheckOutDeadlineExtensionPanel from "./components/CheckOutDeadlineExtensionPanel";

type EventStaffProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  verification_status: string;
  municipality: string | null;
};

type StaffListResponse = {
  staff?: EventStaffProfile[];
  municipality?: string;
  error?: string;
};

type CreateStaffResponse = {
  message?: string;
  staff?: EventStaffProfile;
  error?: string;
};

type UpdateStaffResponse = {
  message?: string;
  staff?: EventStaffProfile;
  error?: string;
};

type StaffForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  email: string;
};

const initialForm: StaffForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  email: "",
};

function getStatusStyles(status: string) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: string) {
  if (status === "rejected") {
    return "Deactivated";
  }
  if (!status) {
    return "Unknown";
  }
  return status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ");
}

function generatePassword() {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*?";
  // Reject excess values to avoid biased character selection.
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  while (true) {
    let password = "";
    while (password.length < 16) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      for (const byte of bytes) {
        if (byte >= limit) continue;
        password += alphabet[byte % alphabet.length];
        if (password.length === 16) break;
      }
    }
    if (isStrongPassword(password)) {
      return password;
    }
  }
}

export default function EventStaffManagementPage() {
  const [staffProfiles, setStaffProfiles] = useState<EventStaffProfile[]>([]);
  const [municipality, setMunicipality] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionStaffId, setActionStaffId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<StaffForm>(initialForm);
  const approvedCount = useMemo(
    () =>
      staffProfiles.filter((staff) => staff.verification_status === "approved")
        .length,
    [staffProfiles],
  );
  const loadStaff = useCallback(async (initialLoad = false) => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setPageError("");
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("Your session has expired. Please sign in again.");
      }
      const response = await fetch("/api/municipal/event-staff", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        cache: "no-store",
      });
      const result = (await response.json()) as StaffListResponse;
      if (!response.ok) {
        throw new Error(result.error || "Unable to load Event Staff accounts.");
      }
      setStaffProfiles(result.staff ?? []);
      setMunicipality(result.municipality ?? "");
    } catch (error) {
      console.error("Load Event Staff page error:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load Event Staff accounts.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStaff(true);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadStaff]);
  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [successMessage]);
  useEffect(() => {
    if (!dialogOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        setDialogOpen(false);
        setFormError("");
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [dialogOpen, submitting]);
  function updateForm(field: keyof StaffForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }
  function openDialog() {
    if (loading || approvedCount >= 5) return;
    setForm(initialForm);
    setFormError("");
    setDialogOpen(true);
  }
  function closeDialog() {
    if (submitting) {
      return;
    }
    setDialogOpen(false);
    setFormError("");
  }
  async function handleStaffAction(staff: EventStaffProfile, remove = false) {
    const isApproved = staff.verification_status === "approved";
    const action = remove ? "delete" : isApproved ? "deactivate" : "reactivate";
    const staffName =
      staff.full_name || staff.email || "this Event Staff account";
    const confirmed = window.confirm(
      remove
        ? `Permanently delete ${staffName}? Their staff assignments will also be removed.`
        : isApproved
          ? `Deactivate ${staffName}? This account will no longer be able to sign in as Event Staff.`
          : `Reactivate ${staffName}? This account will regain access to the Event Staff portal.`,
    );
    if (!confirmed) {
      return;
    }
    setPageError("");
    setSuccessMessage("");
    setActionStaffId(staff.id);
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("Your session has expired. Please sign in again.");
      }
      const response = await fetch("/api/municipal/event-staff", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: staff.id,
          action,
        }),
      });
      const result = (await response.json()) as UpdateStaffResponse;
      if (!response.ok) {
        throw new Error(
          result.error || "Unable to update the Event Staff account.",
        );
      }
      setSuccessMessage(
        result.message ||
          (isApproved
            ? "Event Staff account deactivated successfully."
            : "Event Staff account reactivated successfully."),
      );
      await loadStaff(false);
    } catch (error) {
      console.error("Update Event Staff page error:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to update the Event Staff account.",
      );
    } finally {
      setActionStaffId(null);
    }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fullName = [
      form.firstName,
      form.middleName,
      form.lastName,
      form.suffix,
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
    const email = form.email.trim().toLowerCase();
    setFormError("");
    setSuccessMessage("");
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("First and last names are required.");
      return;
    }
    if (fullName.length > 100) {
      setFormError("Full name must not exceed 100 characters.");
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    const password = generatePassword();
    try {
      setSubmitting(true);
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("Your session has expired. Please sign in again.");
      }
      const response = await fetch("/api/municipal/event-staff", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
        }),
      });
      const result = (await response.json()) as CreateStaffResponse;
      if (!response.ok) {
        throw new Error(
          result.error || "Unable to create the Event Staff account.",
        );
      }
      setDialogOpen(false);
      setForm(initialForm);
      setShowCreatedPassword(false);
      setCopyMessage("");
      setCredentials({ email, password });
      setSuccessMessage(
        result.message || "Event Staff account created successfully.",
      );
      await loadStaff(false);
    } catch (error) {
      console.error("Create Event Staff page error:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create the Event Staff account.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main className="w-full">
      <div className="space-y-5">
        {/* Compact page header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Municipal Administration
                </p>
                <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
                  Event Staff
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Assign staff to events and manage staff accounts.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadStaff(false)}
                disabled={loading || refreshing || actionStaffId !== null}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                type="button"
                onClick={openDialog}
                disabled={
                  loading || approvedCount >= 5 || actionStaffId !== null
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                Add Event Staff
              </button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <span>
              <strong className="text-slate-900">
                {loading ? "—" : `${approvedCount} / 5`}
              </strong>{" "}
              active staff
            </span>
            <span>
              <strong className="text-slate-900">
                {loading ? "—" : staffProfiles.length}
              </strong>{" "}
              total accounts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-400" />
              {loading
                ? "Loading municipality..."
                : municipality || "Municipality unavailable"}
            </span>
            {approvedCount >= 5 && (
              <span className="text-amber-700">Staff limit reached</span>
            )}
          </div>
        </section>
        {/* Messages */}
        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {pageError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p>{pageError}</p>
              <button
                type="button"
                onClick={() => void loadStaff(false)}
                className="mt-2 font-bold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}
        {credentials && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-semibold text-emerald-950">
              New Account Credentials
            </h3>
            <p className="mt-2 break-all text-sm text-emerald-900">
              <span className="font-semibold">Email:</span> {credentials.email}
            </p>
            <label
              htmlFor="created-staff-password"
              className="mt-3 block text-sm font-semibold text-emerald-900"
            >
              Initial Password
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="created-staff-password"
                type={showCreatedPassword ? "text" : "password"}
                readOnly
                autoComplete="off"
                value={credentials.password}
                className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowCreatedPassword((value) => !value)}
                aria-label={
                  showCreatedPassword ? "Hide password" : "Show password"
                }
                className="rounded-lg border border-emerald-200 bg-white p-2.5"
              >
                {showCreatedPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(credentials.password);
                    setCopyMessage("Copied to clipboard.");
                  } catch {
                    setCopyMessage(
                      "Unable to copy automatically. Show the password to copy it manually.",
                    );
                  }
                }}
                aria-label="Copy initial password"
                className="rounded-lg border border-emerald-200 bg-white p-2.5"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `Email: ${credentials.email}\nInitial Password: ${credentials.password}`,
                  );
                  setCopyMessage("Copied to clipboard.");
                } catch {
                  setCopyMessage(
                    "Unable to copy automatically. Please copy the email and password manually.",
                  );
                }
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy Email and Password
            </button>
            <p className="mt-3 text-xs leading-5 text-emerald-900">
              Give these credentials privately to the staff member. They will
              change the initial password on first login. This password display
              disappears when you refresh or leave this page.
            </p>
            <p role="status" className="text-sm text-emerald-900">
              {copyMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                setCredentials(null);
                setShowCreatedPassword(false);
                setCopyMessage("");
              }}
              className="mt-3 text-xs font-semibold text-emerald-900 underline"
            >
              Dismiss Credentials
            </button>
          </div>
        )}
        {/* Event Staff Assignments */}
        <EventStaffAssignmentsPanel />

        {/* Authorized Check-Out Extension */}
        <CheckOutDeadlineExtensionPanel />
        {/* Staff list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-bold text-slate-950">Staff Accounts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Approved, pending, and deactivated accounts for your municipality.
            </p>
          </div>
          {loading ? (
            <div className="space-y-3 p-5 sm:p-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : staffProfiles.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No Event Staff yet
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create the first Event Staff account for{" "}
                {municipality || "your municipality"}.
              </p>
              <button
                type="button"
                onClick={openDialog}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <UserPlus className="h-4 w-4" />
                Add Event Staff
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Staff Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Municipality
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffProfiles.map((staff) => {
                      const isApproved =
                        staff.verification_status === "approved";
                      const updating = actionStaffId === staff.id;
                      return (
                        <tr
                          key={staff.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <UserRound className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {staff.full_name || "Unnamed Staff"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Event Staff
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {staff.email || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {staff.municipality || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusStyles(
                                staff.verification_status,
                              )}`}
                            >
                              {formatStatus(staff.verification_status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => void handleStaffAction(staff)}
                              disabled={actionStaffId !== null}
                              className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                isApproved
                                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {updating ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : isApproved ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                              {updating
                                ? "Updating..."
                                : isApproved
                                  ? "Deactivate"
                                  : "Reactivate"}
                            </button>
                            {staff.verification_status === "rejected" && (
                              <button
                                type="button"
                                disabled={actionStaffId !== null}
                                onClick={() =>
                                  void handleStaffAction(staff, true)
                                }
                                className="mt-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {staffProfiles.map((staff) => {
                  const isApproved = staff.verification_status === "approved";
                  const updating = actionStaffId === staff.id;
                  return (
                    <article key={staff.id} className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <UserRound className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900">
                            {staff.full_name || "Unnamed Staff"}
                          </p>
                          <p className="mt-1 truncate text-sm text-slate-500">
                            {staff.email || "—"}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusStyles(
                                staff.verification_status,
                              )}`}
                            >
                              {formatStatus(staff.verification_status)}
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                              {staff.municipality || "—"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleStaffAction(staff)}
                            disabled={actionStaffId !== null}
                            className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              isApproved
                                ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {updating ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : isApproved ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            {updating
                              ? "Updating..."
                              : isApproved
                                ? "Deactivate Account"
                                : "Reactivate Account"}
                          </button>
                          {staff.verification_status === "rejected" && (
                            <button
                              type="button"
                              disabled={actionStaffId !== null}
                              onClick={() =>
                                void handleStaffAction(staff, true)
                              }
                              className="mt-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
      {/* Add Event Staff dialog */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-event-staff-title"
        >
          <button
            type="button"
            aria-label="Close Add Event Staff dialog"
            onClick={closeDialog}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <div className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="add-event-staff-title"
                  className="text-xl font-bold text-slate-950"
                >
                  Add Event Staff
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  The account will automatically be assigned to{" "}
                  <span className="font-semibold text-slate-700">
                    {municipality || "your municipality"}
                  </span>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["firstName", "First Name"],
                    ["middleName", "Middle Name (optional)"],
                    ["lastName", "Last Name"],
                    ["suffix", "Suffix (optional)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-sm text-slate-700">
                    <span className="mb-2 flex items-center gap-2">
                      <UserRound size={16} aria-hidden="true" />
                      {label}
                    </span>
                    <input
                      value={form[key]}
                      onChange={(event) => updateForm(key, event.target.value)}
                      required={key === "firstName" || key === "lastName"}
                      disabled={submitting}
                      maxLength={100}
                      className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-sm"
                    />
                  </label>
                ))}
                <label className="block text-sm text-slate-700">
                  <span className="mb-2 flex items-center gap-2">
                    <Mail size={16} aria-hidden="true" />
                    Email
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    disabled={submitting}
                    className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-sm"
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  <span className="mb-2 block">Municipality</span>
                  <input
                    readOnly
                    value={municipality}
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm"
                  />
                </label>
              </div>
              <p className="text-sm text-slate-500">
                A temporary password is generated when you create the account.
              </p>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-800">
                The account will be approved immediately and restricted to{" "}
                <span className="font-bold">
                  {municipality || "the Municipal Admin's municipality"}
                </span>
                .
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create Staff Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
