"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type ProvincialAdmin = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  verification_status: string | null;
};

export default function ProvincialAdminsPage() {
  const [admins, setAdmins] = useState<
    ProvincialAdmin[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] =
    useState(false);

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [createError, setCreateError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  async function loadProvincialAdmins(
    isRefresh = false
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            email,
            role,
            verification_status
          `
        )
        .eq("role", "provincial_admin")
        .order("full_name", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setAdmins(
        (data ?? []) as ProvincialAdmin[]
      );
    } catch (error) {
      console.error(
        "Load provincial admins error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load Provincial Administrator accounts."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadProvincialAdmins();
  }, []);

  useEffect(() => {
    if (!createOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape" &&
        !creating
      ) {
        closeCreateModal();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [createOpen, creating]);

  const filteredAdmins = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return admins;
    }

    return admins.filter((admin) => {
      const name =
        admin.full_name?.toLowerCase() ??
        "";

      const email =
        admin.email?.toLowerCase() ?? "";

      const status =
        admin.verification_status?.toLowerCase() ??
        "";

      return (
        name.includes(query) ||
        email.includes(query) ||
        status.includes(query)
      );
    });
  }, [admins, search]);

  const approvedCount = useMemo(
    () =>
      admins.filter(
        (admin) =>
          admin.verification_status ===
          "approved"
      ).length,
    [admins]
  );

  function openCreateModal() {
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setCreateError("");
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (creating) {
      return;
    }

    setCreateOpen(false);
    setCreateError("");
  }

  async function handleCreateAdmin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (creating) {
      return;
    }

    setCreateError("");
    setSuccessMessage("");

    const normalizedFullName =
      fullName.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedFullName) {
      setCreateError(
        "Full name is required."
      );
      return;
    }

    if (!normalizedEmail) {
      setCreateError(
        "Email address is required."
      );
      return;
    }

    if (password.length < 8) {
      setCreateError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setCreateError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setCreating(true);

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
      ) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        "/api/provincial/admins",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${sessionData.session.access_token}`,
          },

          body: JSON.stringify({
            fullName:
              normalizedFullName,

            email:
              normalizedEmail,

            password,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create Provincial Administrator."
        );
      }

      setCreateOpen(false);

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setSuccessMessage(
        "Provincial Administrator account created successfully."
      );

      await loadProvincialAdmins(true);

      window.setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (error) {
      console.error(
        "Create provincial admin error:",
        error
      );

      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create Provincial Administrator."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800 shadow-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Account created
              </p>

              <p className="mt-0.5 text-sm">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">
                  Administration
                </p>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Provincial Admin Management
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                View and manage authorized
                Provincial Administrator
                accounts for PagTipon.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800"
            >
              <UserPlus className="h-4 w-4" />

              Add Provincial Admin
            </button>
          </div>
        </section>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Provincial Admins
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loading
                    ? "—"
                    : admins.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Approved Admins
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loading
                    ? "—"
                    : approvedCount}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
          </div>
        </section>

        {/* Admin list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Provincial
                  Administrators
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Accounts currently assigned
                  the Provincial Administrator
                  role.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadProvincialAdmins(
                    true
                  )
                }
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search by name, email, or status..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

          {error && (
            <div className="border-b border-red-200 bg-red-50 px-5 py-4">
              <p className="text-sm font-semibold text-red-700">
                Unable to load Provincial
                Administrators
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-56 items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin" />

                Loading Provincial
                Administrators...
              </div>
            </div>
          ) : filteredAdmins.length ===
            0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Users className="h-6 w-6" />
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                {search
                  ? "No matching administrator"
                  : "No Provincial Administrator found"}
              </h3>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Administrator
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Email
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Role
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredAdmins.map(
                      (admin) => (
                        <tr
                          key={admin.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold uppercase text-indigo-700">
                                {admin.full_name
                                  ?.trim()
                                  .charAt(
                                    0
                                  ) ||
                                  "A"}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {admin.full_name ||
                                    "Provincial Administrator"}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-500">
                                  Authorized
                                  account
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {admin.email ||
                              "—"}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              Provincial Admin
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                admin.verification_status
                              }
                            />
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {filteredAdmins.map(
                  (admin) => (
                    <div
                      key={admin.id}
                      className="p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold uppercase text-indigo-700">
                          {admin.full_name
                            ?.trim()
                            .charAt(0) ||
                            "A"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">
                            {admin.full_name ||
                              "Provincial Administrator"}
                          </p>

                          <p className="mt-1 break-all text-sm text-slate-500">
                            {admin.email ||
                              "—"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              Provincial Admin
                            </span>

                            <StatusBadge
                              status={
                                admin.verification_status
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}

          {!loading &&
            filteredAdmins.length > 0 && (
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {
                      filteredAdmins.length
                    }
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {admins.length}
                  </span>{" "}
                  Provincial Administrator
                  account
                  {admins.length === 1
                    ? ""
                    : "s"}
                  .
                </p>
              </div>
            )}
        </section>
      </div>

      {/* Create Provincial Admin Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            onClick={closeCreateModal}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-admin-title"
            className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-indigo-700" />

                  <h2
                    id="create-admin-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    Add Provincial Admin
                  </h2>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Create an authorized
                  Provincial Administrator
                  account.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateAdmin}
            >
              <div className="space-y-4 px-5 py-5">
                {createError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-700">
                      {createError}
                    </p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="admin-full-name"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="admin-full-name"
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    disabled={creating}
                    maxLength={100}
                    required
                    autoComplete="name"
                    placeholder="Enter full name"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-email"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Email Address
                  </label>

                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    disabled={creating}
                    required
                    autoComplete="email"
                    placeholder="admin@example.com"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Initial Password
                  </label>

                  <div className="relative">
                    <input
                      id="admin-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      disabled={creating}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (previous) =>
                            !previous
                        )
                      }
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 transition hover:text-slate-700"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-500">
                    The new administrator
                    should change this password
                    after signing in.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="admin-confirm-password"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Confirm Password
                  </label>

                  <input
                    id="admin-confirm-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    disabled={creating}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function StatusBadge({
  status,
}: {
  status: string | null;
}) {
  const normalizedStatus =
    status?.toLowerCase() ?? "";

  if (normalizedStatus === "approved") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Approved
      </span>
    );
  }

  if (normalizedStatus === "pending") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Pending
      </span>
    );
  }

  if (normalizedStatus === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      {status || "Unknown"}
    </span>
  );
}