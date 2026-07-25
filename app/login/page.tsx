"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDashboardPath, type UserRole } from "@/lib/routes";

type VerificationStatus = "pending" | "approved" | "rejected";

type Profile = {
  role: UserRole;
  verification_status: VerificationStatus;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      // 1. Authenticate the user.
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        alert(loginError.message);
        return;
      }

      const user = loginData.user;

      if (!user) {
        await supabase.auth.signOut();
        alert("Unable to find your account.");
        return;
      }

      // 2. Get the trusted role/status from public.profiles.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, verification_status")
        .eq("id", user.id)
        .maybeSingle<Profile>();

      if (profileError) {
        console.error("Profile error:", profileError.message);

        await supabase.auth.signOut();

        alert(
          "Unable to verify your account. Please contact the system administrator."
        );
        return;
      }

      // The database trigger should create a profile during signup.
      if (!profile) {
        await supabase.auth.signOut();

        alert(
          "Your account profile could not be found. Please contact the system administrator."
        );
        return;
      }

      // 3. Municipal Admin approval check.
      if (profile.role === "municipal_admin") {
        if (profile.verification_status === "pending") {
          await supabase.auth.signOut();

          alert(
            "Your municipal admin account is still pending provincial approval."
          );
          return;
        }

        if (profile.verification_status === "rejected") {
          await supabase.auth.signOut();

          alert(
            "Your municipal admin application has been rejected. Please contact the provincial administrator for assistance."
          );
          return;
        }

        if (profile.verification_status !== "approved") {
          await supabase.auth.signOut();

          alert(
            "Your municipal admin account is not authorized to access the system."
          );
          return;
        }
      }

      // 4. Safety check for rejected accounts.
      if (profile.verification_status === "rejected") {
        await supabase.auth.signOut();

        alert("Your account has been rejected.");
        return;
      }

      // 5. Redirect according to role.
      router.push(getDashboardPath(profile.role));
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);

      await supabase.auth.signOut();

      alert("An unexpected error occurred while logging in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Login
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Login to access your PagTipon account.
        </p>

        <form
          onSubmit={handleLogin}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-slate-900 hover:underline"
          >
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}