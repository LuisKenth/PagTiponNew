"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const municipalities = [
  "Anini-y",
  "Barbaza",
  "Belison",
  "Bugasong",
  "Caluya",
  "Culasi",
  "Hamtic",
  "Laua-an",
  "Libertad",
  "Pandan",
  "Patnongon",
  "San Jose de Buenavista",
  "San Remigio",
  "Sebaste",
  "Sibalom",
  "Tibiao",
  "Tobias Fornier",
  "Valderrama",
];

type SignupRole =
  | "provincial_admin"
  | "municipal_admin"
  | "event_staff"
  | "participant";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [role, setRole] = useState<SignupRole>("participant");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const needsMunicipality =
    role === "municipal_admin" ||
    role === "event_staff" ||
    role === "participant";

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (needsMunicipality && !municipality) {
      alert("Please select your municipality.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          municipality: needsMunicipality ? municipality : null,
        },
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (role === "municipal_admin") {
      alert(
        "Municipal admin account created successfully. Your account is pending provincial approval."
      );
    } else {
      alert("Account created successfully. You can now login.");
    }

    router.push("/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Create PagTipon Account
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Register according to your role in the provincial-to-municipal event
          flow.
        </p>

        <form onSubmit={handleSignup} className="mt-6 space-y-4" autoComplete="off">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Role</label>
            <select
              value={role}
              onChange={(e) => {
                const selectedRole = e.target.value as SignupRole;
                setRole(selectedRole);

                if (selectedRole === "provincial_admin") {
                  setMunicipality("");
                }
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
              <option value="participant">Participant</option>
              <option value="municipal_admin">Municipal Admin</option>
              <option value="event_staff">Event Staff</option>
              <option value="provincial_admin">Provincial Admin</option>
            </select>
          </div>

          {needsMunicipality && (
            <div>
              <label className="text-sm font-medium text-slate-700">
                Municipality
              </label>
              <select
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              >
                <option value="">Select municipality</option>
                {municipalities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-slate-900">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}