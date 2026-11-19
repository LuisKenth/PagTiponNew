"use client";

import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import PasswordChangeCard from "@/app/dashboard/municipal/settings/components/PasswordChangeCard";
import { supabase } from "@/lib/supabase";

type StaffProfile = {
  full_name: string | null;
  municipality: string | null;
  verification_status: string | null;
};

export default function StaffSettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (!active) return;

        if (authError || !data.user?.email) {
          setError("Unable to verify your account. Please sign in again.");
          return;
        }

        setEmail(data.user.email);

        const { data: staffProfile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, municipality, verification_status")
          .eq("id", data.user.id)
          .eq("role", "event_staff")
          .maybeSingle();

        if (!active) return;

        if (profileError || !staffProfile) {
          setError("Unable to load your profile. Please refresh and try again.");
          return;
        }

        setProfile(staffProfile);
      } catch {
        if (active) {
          setError("Unable to load your account information. Please refresh and try again.");
        }
      }
    }

    void loadAccount();
    return () => {
      active = false;
    };
  }, []);

  const profileFields = profile
    ? [
        { label: "Full name", value: profile.full_name },
        { label: "Email address", value: email },
        { label: "Municipality", value: profile.municipality },
        { label: "Account role", value: "Event Staff" },
        {
          label: "Verification status",
          value: profile.verification_status?.replaceAll("_", " "),
        },
      ]
    : [];

  return (
    <div className="max-w-7xl space-y-5">
      <h1 className="text-2xl font-bold text-slate-950">Settings</h1>

      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section
          aria-labelledby="staff-profile-heading"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-start gap-4 border-b border-slate-200 p-6">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <UserRound className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="staff-profile-heading" className="text-lg font-semibold text-slate-950">
                Profile Information
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                View your Event Staff account details and assigned municipality.
              </p>
            </div>
          </div>

          {error ? (
            <p role="alert" className="p-6 text-sm text-red-700">{error}</p>
          ) : profile ? (
            <dl className="grid gap-4 p-6 sm:grid-cols-2">
              {profileFields.map(({ label, value }) => (
                <div
                  key={label}
                  className={`min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 ${label === "Full name" ? "sm:col-span-2" : ""}`}
                >
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {label}
                  </dt>
                  <dd className={`mt-2 break-words text-sm text-slate-950 ${label === "Verification status" ? "capitalize" : ""}`}>
                    {value?.trim() || "Not set"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p role="status" className="p-6 text-sm text-slate-600">
              Loading profile information...
            </p>
          )}
        </section>

        {email && <PasswordChangeCard email={email} />}
      </div>
    </div>
  );
}
