"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { getDashboardPath, type UserRole } from "@/lib/routes";
import {
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/passwordPolicy";

export default function ChangePasswordPage() {
  const router = useRouter();
  const submitting = useRef(false);

  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, verification_status")
          .eq("id", user.id)
          .single();

        if (!active) return;

        if (profileError || !profile) {
          throw new Error(
            "Unable to verify your account. Please reload this page.",
          );
        }

        if (
          ![
            "super_admin",
            "provincial_admin",
            "municipal_admin",
            "event_staff",
          ].includes(profile.role)
        ) {
          router.replace(getDashboardPath(profile.role as UserRole));
          return;
        }

        // Require email verification for Event Staff
        // and Provincial Admin before password change.
        if (
          ["event_staff", "provincial_admin", "municipal_admin"].includes(profile.role) &&
          !user.email_confirmed_at
        ) {
          await supabase.auth.signOut();

          if (active) {
            router.replace("/login");
          }

          return;
        }

        if (profile.verification_status !== "approved") {
          await supabase.auth.signOut();

          if (active) router.replace("/login");
          return;
        }

        if (user.app_metadata?.must_change_password !== true) {
          router.replace(getDashboardPath(profile.role as UserRole));
          return;
        }

        setReady(true);
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to verify your account. Please reload this page.",
          );
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current || !ready || completed) return;

    setError("");

    if (!isStrongPassword(newPassword)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (newPassword !== confirmation) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("Choose a password different from your initial password.");
      return;
    }

    submitting.current = true;
    setBusy(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/auth/change-initial-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update your password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setCompleted(true);

      // Sign in again to obtain a fresh session after the password change.
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update your password. Please try again.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const requirements = [
    {
      label: "8–16 characters",
      valid: newPassword.length >= 8 && newPassword.length <= 16,
    },
    { label: "One uppercase letter", valid: /[A-Z]/.test(newPassword) },
    { label: "One lowercase letter", valid: /[a-z]/.test(newPassword) },
    { label: "One number", valid: /[0-9]/.test(newPassword) },
    {
      label: "One special character",
      valid: /[^A-Za-z0-9\s]/.test(newPassword),
    },
  ];

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <KeyRound className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-slate-950">
          {completed ? "Password updated" : "Change your initial password"}
        </h1>

        {checking ? (
          <p role="status" className="mt-4 text-sm text-slate-600">
            Checking your account…
          </p>
        ) : completed ? (
          <div className="mt-4">
            <p role="status" className="text-sm leading-6 text-emerald-700">
              Your password was changed successfully. Sign in using your new
              password to access the PagTipon portal.
            </p>

            <button
              type="button"
              disabled={busy}
              onClick={() => router.replace("/login")}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              Continue to Sign In
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Replace your initial password before accessing the PagTipon
              portal.
            </p>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {ready && (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <fieldset disabled={busy} className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Current / Initial Password
                    <input
                      type={showPasswords ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    New Password
                    <input
                      type={showPasswords ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={16}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className={inputClass}
                    />
                  </label>

                  <ul className="space-y-1 text-xs">
                    {requirements.map((requirement) => (
                      <li
                        key={requirement.label}
                        className={
                          requirement.valid
                            ? "text-emerald-700"
                            : "text-slate-500"
                        }
                      >
                        {requirement.valid ? "✓" : "○"} {requirement.label}
                      </li>
                    ))}
                  </ul>

                  <label className="block text-sm font-medium text-slate-700">
                    Confirm New Password
                    <input
                      type={showPasswords ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={16}
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      className={inputClass}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPasswords((value) => !value)}
                    aria-pressed={showPasswords}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"
                  >
                    {showPasswords ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                    {showPasswords ? "Hide passwords" : "Show passwords"}
                  </button>

                  <button
                    type="submit"
                    disabled={
                      busy ||
                      !currentPassword ||
                      !isStrongPassword(newPassword) ||
                      newPassword !== confirmation ||
                      newPassword === currentPassword
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy && (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    {busy ? "Updating…" : "Save New Password"}
                  </button>
                </fieldset>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
