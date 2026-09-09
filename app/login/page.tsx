"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  getDashboardPath,
  type UserRole,
} from "@/lib/routes";

type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected";

type Profile = {
  role: UserRole;
  verification_status: VerificationStatus;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const validateForm = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage(
        "Please enter your email address."
      );
      return false;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedEmail)) {
      setErrorMessage(
        "Please enter a valid email address."
      );
      return false;
    }

    if (!password) {
      setErrorMessage(
        "Please enter your password."
      );
      return false;
    }

    return true;
  };

  const handleLogin = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (loading) return;

    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 1. Authenticate the user.
      const {
        data: loginData,
        error: loginError,
      } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        const loginErrorMessage =
          loginError.message.toLowerCase();

        if (
          loginErrorMessage.includes(
            "invalid login credentials"
          )
        ) {
          setErrorMessage(
            "Incorrect email or password. Please check your credentials and try again."
          );
        } else if (
          loginErrorMessage.includes("banned")
        ) {
          setErrorMessage(
            "This account has been deactivated. Please contact your administrator for assistance."
          );
        } else {
          setErrorMessage(
            "Unable to sign in. Please try again or contact the system administrator."
          );
        }

        return;
      }

      const user = loginData.user;

      if (!user) {
        await supabase.auth.signOut();

        setErrorMessage(
          "Unable to find your account."
        );

        return;
      }

      // 2. Get the trusted role/status
      // from public.profiles.
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "role, verification_status"
        )
        .eq("id", user.id)
        .maybeSingle<Profile>();

      if (profileError) {
        console.error(
          "Profile error:",
          profileError.message
        );

        await supabase.auth.signOut();

        setErrorMessage(
          "Unable to verify your account. Please contact the system administrator."
        );

        return;
      }

      // The database trigger should create
      // a profile during signup.
      if (!profile) {
        await supabase.auth.signOut();

        setErrorMessage(
          "Your account profile could not be found. Please contact the system administrator."
        );

        return;
      }

      // 3. Municipal Admin approval check.
      if (
        profile.role ===
        "municipal_admin"
      ) {
        if (
          profile.verification_status ===
          "pending"
        ) {
          await supabase.auth.signOut();

          setErrorMessage(
            "Your municipal admin account is still pending provincial approval."
          );

          return;
        }

        if (
          profile.verification_status ===
          "rejected"
        ) {
          await supabase.auth.signOut();

          setErrorMessage(
            "Your municipal admin application has been rejected. Please contact the provincial administrator for assistance."
          );

          return;
        }

        if (
          profile.verification_status !==
          "approved"
        ) {
          await supabase.auth.signOut();

          setErrorMessage(
            "Your municipal admin account is not authorized to access the system."
          );

          return;
        }
      }

      // 4. Safety check for rejected accounts.
      if (
        profile.verification_status ===
        "rejected"
      ) {
        await supabase.auth.signOut();

        setErrorMessage(
          "Your account has been rejected."
        );

        return;
      }

      // 5. Redirect according to role.
      router.push(
        getDashboardPath(profile.role)
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      await supabase.auth.signOut();

      setErrorMessage(
        "An unexpected error occurred while logging in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('/images/pagtipon-bg.png')",
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-slate-950/60" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/45" />

      {/* Decorative Glow */}
      <div className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Page Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="flex items-center gap-3 text-white"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
              <CalendarCheck2
                className="h-5 w-5"
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-xl font-bold tracking-tight">
                PagTipon
              </p>

              <p className="hidden text-xs text-slate-300 sm:block">
                Event Management System
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              Back to Home
            </span>
            <span className="sm:hidden">
              Home
            </span>
          </Link>
        </header>

        {/* Main Section */}
        <section className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_460px] lg:px-10 lg:py-8">
          {/* Left Content */}
          <div className="hidden max-w-2xl lg:block">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur-md">
              <MapPin className="h-4 w-4 text-emerald-400" />

              Province of Antique
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight text-white xl:text-6xl">
              Welcome back to
              <span className="block text-emerald-400">
                PagTipon.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Sign in to access your event
              management, municipal coordination,
              registration, and attendance tools.
            </p>

            <div className="mt-8 max-w-lg space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Secure account access
                  </p>

                  <p className="text-xs text-slate-400">
                    Role-based dashboards and
                    authorization
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <CalendarCheck2 className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Centralized event operations
                  </p>

                  <p className="text-xs text-slate-400">
                    Provincial and municipal
                    coordination in one system
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Area */}
          <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            {/* Mobile Brand Intro */}
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/30">
                <CalendarCheck2
                  className="h-7 w-7"
                  aria-hidden="true"
                />
              </div>

              <h1 className="mt-4 text-2xl font-bold text-white">
                Welcome back
              </h1>

              <p className="mt-1 text-sm text-slate-300">
                Sign in to your PagTipon account
              </p>
            </div>

            {/* Login Card */}
            <div className="rounded-3xl border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="hidden lg:block">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-950/20">
                  <LockKeyhole
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                  Sign in to PagTipon
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your account credentials
                  to continue.
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                >
                  <AlertCircle
                    className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                    aria-hidden="true"
                  />

                  <p className="text-sm leading-5 text-red-700">
                    {errorMessage}
                  </p>
                </div>
              )}

              <form
                onSubmit={handleLogin}
                className="mt-6 space-y-5"
                noValidate
                autoComplete="off"
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />

                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={email}
                      disabled={loading}
                      onChange={(e) => {
                        setEmail(
                          e.target.value
                        );

                        if (errorMessage) {
                          setErrorMessage(
                            null
                          );
                        }
                      }}
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Enter your password"
                      autoComplete="off"
                      value={password}
                      disabled={loading}
                      onChange={(e) => {
                        setPassword(
                          e.target.value
                        );

                        if (errorMessage) {
                          setErrorMessage(
                            null
                          );
                        }
                      }}
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    />

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />

                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              {/* Signup Link */}
              <div className="mt-6 border-t border-slate-200 pt-6">
                <p className="text-center text-sm text-slate-500">
                  Don&apos;t have an
                  account?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-emerald-600 transition hover:text-emerald-700 hover:underline"
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-slate-300">
              Provincial and municipal event
              coordination platform
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-5 py-4 text-center text-xs text-slate-400 sm:flex-row sm:px-8 lg:px-10">
            <p>
              © {new Date().getFullYear()}{" "}
              PagTipon. All rights reserved.
            </p>

            <p>
              Province of Antique Event
              Management System
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}