"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/passwordPolicy";

export default function ResetPasswordPage() {
  const submitting = useRef(false);

  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setChecking(false);
        setError("");
      }

      if (event === "SIGNED_OUT") {
        setReady(false);
      }
    });

    async function checkSession() {
      try {
        const hash = new URLSearchParams(
          window.location.hash.slice(1)
        );
        const query = new URLSearchParams(window.location.search);

        if (
          hash.has("error") ||
          hash.has("error_code") ||
          query.has("error") ||
          query.has("error_code")
        ) {
          throw new Error(
            "This reset link is invalid or expired. Please request a new link."
          );
        }

        // The existing browser client processes the email-link session.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error(
            "No valid reset session was found. Please open the newest reset link from your email."
          );
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(
            "Your reset session has expired. Please request a new link."
          );
        }

        if (active) {
          setReady(true);
          setError("");
        }
      } catch (error) {
        if (active) {
          setReady(false);
          setError(
            error instanceof Error
              ? error.message
              : "Unable to verify the reset link."
          );
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current || !ready || done) return;

    setError("");

    if (!isStrongPassword(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    submitting.current = true;
    setBusy(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setPassword("");
      setConfirmation("");
      setDone(true);
      setReady(false);

      // End this browser session before signing in with the new password.
      await supabase.auth
        .signOut({ scope: "local" })
        .catch(() => {});

      window.alert(
        "Password reset successfully! Sign in using your new password."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to reset your password. Please try again.";

      setError(message);
      window.alert(message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          <KeyRound className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-slate-950">
          {done ? "Password updated" : "Reset your password"}
        </h1>

        {checking ? (
          <p role="status" className="mt-4 text-sm text-slate-600">
            Checking your reset link…
          </p>
        ) : done ? (
          <p
            role="status"
            className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            Your password was reset successfully. Sign in using your
            new password.
          </p>
        ) : (
          <>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {ready ? (
              <form onSubmit={handleSubmit} className="mt-6">
                <fieldset disabled={busy} className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    New Password
                    <input
                      type={showPasswords ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={16}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>

                  <p className="text-xs leading-5 text-slate-500">
                    Use 8–16 characters with an uppercase letter,
                    a lowercase letter, a number, and a special character.
                  </p>

                  <label className="block text-sm font-medium text-slate-700">
                    Confirm New Password
                    <input
                      type={showPasswords ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={16}
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(event) =>
                        setConfirmation(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPasswords((value) => !value)}
                    aria-pressed={showPasswords}
                    className="inline-flex items-center gap-2 text-sm text-slate-600"
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
                      !isStrongPassword(password) ||
                      password !== confirmation
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            ) : (
              <Link
                href="/forgot-password"
                className="mt-5 inline-block text-sm font-semibold text-emerald-700 underline"
              >
                Request a New Reset Link
              </Link>
            )}
          </>
        )}

        <Link
          href="/login"
          className="mt-6 block text-center text-sm font-semibold text-slate-600 hover:text-emerald-700"
        >
          Back to Sign In
        </Link>
      </section>
    </main>
  );
}