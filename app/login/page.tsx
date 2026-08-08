"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarCheck2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
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
        if (
          loginError.message
            .toLowerCase()
            .includes("invalid login credentials")
        ) {
          setErrorMessage(
            "Incorrect email or password. Please check your credentials and try again."
          );
        } else {
          setErrorMessage(loginError.message);
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10 sm:px-6">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-slate-200/70 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-slate-200/70 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/10">
            <CalendarCheck2
              className="h-7 w-7 text-white"
              aria-hidden="true"
            />
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
            PagTipon
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Integrated Event Operations
            and Attendance
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Welcome back
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to continue to your
              PagTipon account.
            </p>
          </div>

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
                      setErrorMessage(null);
                    }
                  }}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
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
                      setErrorMessage(null);
                    }
                  }}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                />

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an
              account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-slate-900 transition hover:text-slate-700 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          Provincial and municipal event
          coordination platform
        </p>
      </div>
    </main>
  );
}