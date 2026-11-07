"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const submitting = useRef(false);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (resetError) {
        if (resetError.status === 429) {
          throw new Error(
            "Too many requests. Please wait before trying again."
          );
        }

        throw new Error(
          "Unable to request a reset email. Please try again later."
        );
      }

      setSent(true);

      window.alert(
        "If an account exists for this email, you will receive a password reset link. Please check your inbox and spam folder."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to request a reset email. Please try again.";

      setError(message);
      window.alert(message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          <Mail className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-slate-950">
          Forgot password?
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter your account email to request a password reset link.
        </p>

        {sent ? (
          <p
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
          >
            If an account exists for this email, you will receive a
            password reset link. Check your inbox and spam folder.
            If you request another link, use the newest email.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {busy ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Sign In
        </Link>
      </section>
    </main>
  );
}