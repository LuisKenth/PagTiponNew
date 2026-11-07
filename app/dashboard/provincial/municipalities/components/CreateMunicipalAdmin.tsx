"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  UserPlus,
  UserRound,
  ShieldCheck,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { MUNICIPALITIES } from "@/lib/municipalities";
import {
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/passwordPolicy";

import {
  MUNICIPAL_ADMIN_LIMIT,
  MUNICIPAL_ADMIN_LIMIT_MESSAGE,
  municipalityAdminCount,
} from "@/lib/municipalAdminLimit";

type Props = {
  onCreated: () => Promise<void>;
  approvedAdmins: { municipality: string | null }[];
  loadingSlots: boolean;
};

type CreatedAccount = {
  email: string;
  password: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

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

export default function CreateMunicipalAdmin({
  onCreated,
  approvedAdmins,
  loadingSlots,
}: Props) {
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const countFor = (municipality: string) =>
    municipalityAdminCount(approvedAdmins, municipality);
  const totalAvailableSlots = MUNICIPALITIES.reduce(
    (total, m) => total + Math.max(0, MUNICIPAL_ADMIN_LIMIT - countFor(m)),
    0,
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notice, setNotice] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(
    null,
  );

  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [detailsComplete, setDetailsComplete] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;

    if (!dialog.open) {
      dialog.showModal();
    }

    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closeModal() {
    if (busy) return;

    setOpen(false);
    setPassword("");
    setShowPassword(false);
    setError("");
    setNotice("");
  }

  function toggleForm() {
    if (busy || loadingSlots || totalAvailableSlots === 0) return;
    setSelectedMunicipality("");

    setError("");
    setNotice("");
    setPassword("");
    setShowPassword(false);
    setDetailsComplete(false);
    setOpen(true);
  }
  function checkFormDetails(form: HTMLFormElement) {
    const formData = new FormData(form);

    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const municipality = String(formData.get("municipality") || "").trim();

    const emailInput = form.elements.namedItem("email");

    const emailValid =
      emailInput instanceof HTMLInputElement &&
      emailInput.value.trim() !== "" &&
      emailInput.validity.valid;

    const complete =
      firstName !== "" &&
      lastName !== "" &&
      MUNICIPALITIES.some((item) => item === municipality) &&
      emailValid &&
      countFor(municipality) < MUNICIPAL_ADMIN_LIMIT &&
      !loadingSlots;

    setDetailsComplete(complete);

    if (!complete) {
      setPassword("");
      setShowPassword(false);
      return;
    }

    if (!password) {
      try {
        setPassword(generatePassword());
        setError("");
      } catch {
        setError("Unable to generate a password. Please try again.");
      }
    }
  }
  function regeneratePassword() {
    try {
      setPassword(generatePassword());
      setError("");
      setNotice("");
    } catch {
      setError("Unable to generate a new password. Please try again.");
    }
  }

  async function copyText(value: string) {
    setNotice("");

    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied to clipboard.");
    } catch {
      setNotice(
        "Unable to copy automatically. Show the password and copy it manually.",
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const municipality = String(formData.get("municipality") || "").trim();
    if (loadingSlots || countFor(municipality) >= MUNICIPAL_ADMIN_LIMIT) {
      setError(
        loadingSlots
          ? "Please wait while slots are loading."
          : MUNICIPAL_ADMIN_LIMIT_MESSAGE,
      );
      return;
    }
    if (!isStrongPassword(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    setBusy(true);
    setError("");
    setSuccess("");
    setNotice("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch("/api/provincial/municipal-admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...Object.fromEntries(formData.entries()),
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to create account.");
      }

      setCreatedAccount({ email, password });
      setShowCreatedPassword(false);
      setSuccess("Municipal Admin created successfully.");

      form.reset();
      setOpen(false);
      setPassword("");
      setShowPassword(false);

      // Close the native dialog before showing the success alert.
      dialogRef.current?.close();

      window.alert(
        "Municipal Admin account created successfully!\n\nCopy the account credentials and send them privately to the assigned Municipal Admin.",
      );

      // Account creation has already succeeded.
      // A list-refresh failure must not invite duplicate creation.
      try {
        await onCreated();
      } catch {
        setNotice(
          "Account created, but the administrator list could not refresh. Refresh the page after copying the credentials.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create account.";

      setError(message);

      window.alert(`Unable to create Municipal Admin account.\n\n${message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>

            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">
              Administration
            </p>
          </div>

          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Municipal Admin Management
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create and assign authorized Municipal Administrator accounts for
            each municipality.
          </p>
        </div>

        <button
          type="button"
          disabled={busy || loadingSlots || totalAvailableSlots === 0}
          onClick={toggleForm}
          aria-haspopup="dialog"
          aria-controls="create-municipal-admin-modal"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add Municipal Admin
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-indigo-900">
          Maximum {MUNICIPAL_ADMIN_LIMIT} approved Municipal Admins per
          municipality
        </p>
        <p className="mt-1">
          {loadingSlots
            ? "Loading available slots…"
            : `${totalAvailableSlots} available slots across ${MUNICIPALITIES.length} municipalities.`}{" "}
          Pending and rejected accounts do not use an approved slot.
        </p>
      </div>

      {success && (
        <p role="status" className="mt-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      {!open && error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!open && notice && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {notice}
        </p>
      )}

      {createdAccount && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="font-semibold text-emerald-950">
            New Account Credentials
          </h3>

          <p className="mt-2 break-all text-sm text-emerald-900">
            <span className="font-semibold">Email:</span> {createdAccount.email}
          </p>

          <label
            htmlFor="created-admin-password"
            className="mt-3 block text-sm font-semibold text-emerald-900"
          >
            Initial Password
          </label>

          <div className="mt-2 flex items-center gap-2">
            <input
              id="created-admin-password"
              type={showCreatedPassword ? "text" : "password"}
              readOnly
              autoComplete="off"
              value={createdAccount.password}
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
              onClick={() => void copyText(createdAccount.password)}
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
                  `Email: ${createdAccount.email}\nInitial Password: ${createdAccount.password}`,
                );

                setNotice("Copied to clipboard.");

                window.alert("Email and password copied successfully!");
              } catch {
                window.alert(
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
            Give these credentials privately to the Municipal Admin. Ask them to
            change the initial password in Settings. This password display
            disappears when you refresh or leave this page.
          </p>

          <button
            type="button"
            onClick={() => {
              setCreatedAccount(null);
              setShowCreatedPassword(false);
              setNotice("");
            }}
            className="mt-3 text-xs font-semibold text-emerald-900 underline"
          >
            Dismiss Credentials
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        id="create-municipal-admin-modal"
        aria-labelledby="create-municipal-admin-title"
        aria-describedby="create-municipal-admin-description"
        onCancel={(event) => {
          event.preventDefault();
          closeModal();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;

          const bounds = event.currentTarget.getBoundingClientRect();

          const clickedOutside =
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom;

          if (clickedOutside) closeModal();
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>

            <h2
              id="create-municipal-admin-title"
              className="text-xl font-bold tracking-tight text-slate-950"
            >
              Add Municipal Admin
            </h2>

            <p
              id="create-municipal-admin-description"
              className="mt-1 text-sm leading-6 text-slate-500"
            >
              Create an administrator account and assign its municipality.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            disabled={busy}
            aria-label="Close modal"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={submit}
          onChange={(event) => checkFormDetails(event.currentTarget)}
          className="p-5 sm:p-6"
        >
          {error && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {notice && (
            <p
              role="status"
              className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"
            >
              {notice}
            </p>
          )}
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "firstName", label: "First Name", required: true },
              {
                name: "middleName",
                label: "Middle Name (optional)",
                required: false,
              },
              { name: "lastName", label: "Last Name", required: true },
              {
                name: "suffix",
                label: "Suffix (optional)",
                required: false,
              },
            ].map((field) => (
              <label key={field.name} className="text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                  <UserRound
                    className="h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  {field.label}
                </span>

                <input
                  name={field.name}
                  required={field.required}
                  maxLength={100}
                  className={inputClass}
                />
              </label>
            ))}

            <label className="text-sm">
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Email
              </span>

              <input
                name="email"
                type="email"
                required
                className={inputClass}
              />
            </label>

            <label className="text-sm">
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Municipality
              </span>

              <select
                name="municipality"
                required
                value={selectedMunicipality}
                onChange={(e) => setSelectedMunicipality(e.target.value)}
                className={inputClass}
              >
                <option value="">Select municipality</option>

                {MUNICIPALITIES.map((municipality) => (
                  <option
                    key={municipality}
                    value={municipality}
                    disabled={countFor(municipality) >= MUNICIPAL_ADMIN_LIMIT}
                  >
                    {municipality} — {countFor(municipality)}/
                    {MUNICIPAL_ADMIN_LIMIT} approved
                    {countFor(municipality) >= MUNICIPAL_ADMIN_LIMIT
                      ? " (Full)"
                      : ""}
                  </option>
                ))}
              </select>
              {selectedMunicipality && (
                <span className="mt-2 block text-xs text-slate-600">
                  {countFor(selectedMunicipality)}/{MUNICIPAL_ADMIN_LIMIT}{" "}
                  approved ·{" "}
                  {Math.max(
                    0,
                    MUNICIPAL_ADMIN_LIMIT - countFor(selectedMunicipality),
                  )}{" "}
                  available{" "}
                  {MUNICIPAL_ADMIN_LIMIT - countFor(selectedMunicipality) === 1
                    ? "slot"
                    : "slots"}
                </span>
              )}
            </label>

            {detailsComplete && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <label
                  htmlFor="generated-admin-password"
                  className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                >
                  <KeyRound
                    className="h-4 w-4 text-emerald-600"
                    aria-hidden="true"
                  />
                  Auto-generated Initial Password
                </label>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="generated-admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    readOnly
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3 font-mono text-sm"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="rounded-xl border border-slate-300 bg-white p-3"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>

                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void copyText(password)}
                      aria-label="Copy generated password"
                      className="rounded-xl border border-slate-300 bg-white p-3 transition hover:bg-slate-100"
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <span
                      role="status"
                      aria-live="polite"
                      className="text-xs font-semibold text-emerald-700"
                    >
                      {notice === "Copied to clipboard." ? "Copied!" : ""}
                    </span>
                  </div>
                </div>

                {notice && notice !== "Copied to clipboard." && (
                  <p role="status" className="mt-2 text-xs text-amber-700">
                    {notice}
                  </p>
                )}

                <button
                  type="button"
                  onClick={regeneratePassword}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Generate Again
                </button>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Automatically generates 16 characters with uppercase letters,
                  lowercase letters, numbers, and special characters.
                </p>
              </div>
            )}
            <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
              The account will be approved immediately. A maximum of 2 approved
              Municipal Admins are allowed per municipality. Both have the same
              access.
            </p>

            <button
              type="submit"
              disabled={busy || !detailsComplete || !isStrongPassword(password)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 p-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}

              {busy ? "Creating..." : "Create Account"}
            </button>
          </fieldset>

          <button
            type="button"
            onClick={closeModal}
            disabled={busy}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </form>
      </dialog>
    </section>
  );
}
