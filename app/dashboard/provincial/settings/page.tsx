"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  BadgeCheck,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type ProvincialProfile = {
  full_name: string | null;
  role: string | null;
  municipality: string | null;
  verification_status: string | null;
};

type PasswordFieldName = "current" | "new" | "confirm";

export default function ProvincialSettingsPage() {
  const [profile, setProfile] = useState<ProvincialProfile | null>(null);
  const [email, setEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [editingName, setEditingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [visibleFields, setVisibleFields] = useState<
    Record<PasswordFieldName, boolean>
  >({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setProfileError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (active) {
          setProfileError("Hindi ma-load ang account. Mag-log in ulit.");
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role, municipality, verification_status")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (error) {
        setProfileError(error.message || "Hindi ma-load ang profile.");
        setLoading(false);
        return;
      }

      const loadedProfile = data as ProvincialProfile;

      setProfile(loadedProfile);
      setFullName(loadedProfile.full_name ?? "");
      setEmail(user.email ?? "");
      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const passwordChecks = useMemo(
    () => [
      {
        label: "Hindi bababa sa 8 character",
        valid: newPassword.length >= 8,
      },
      {
        label: "May malaking titik (A–Z)",
        valid: /[A-Z]/.test(newPassword),
      },
      {
        label: "May maliit na titik (a–z)",
        valid: /[a-z]/.test(newPassword),
      },
      {
        label: "May numero (0–9)",
        valid: /\d/.test(newPassword),
      },
      {
        label: "May special character",
        valid: /[^A-Za-z0-9]/.test(newPassword),
      },
    ],
    [newPassword]
  );

  const isPasswordValid = passwordChecks.every((check) => check.valid);
  const hasNameChanged =
    fullName.trim() !== (profile?.full_name ?? "").trim();

  const roleLabel = (profile?.role ?? "provincial_admin")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const statusLabel = (profile?.verification_status ?? "approved")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  function togglePasswordVisibility(field: PasswordFieldName) {
    setVisibleFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    const nextName = fullName.trim();

    if (!nextName) {
      setProfileError("Ilagay ang buong pangalan.");
      return;
    }

    if (!hasNameChanged) {
      setEditingName(false);
      return;
    }

    setSavingProfile(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProfileError("Hindi ma-verify ang account. Mag-log in ulit.");
      setSavingProfile(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: nextName })
      .eq("id", user.id);

    if (error) {
      setProfileError(error.message || "Hindi na-save ang pangalan.");
      setSavingProfile(false);
      return;
    }

    setProfile((current) =>
      current ? { ...current, full_name: nextName } : current
    );
    setFullName(nextName);
    setEditingName(false);
    setProfileSuccess("Na-save na ang profile.");
    setSavingProfile(false);
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!email) {
      setPasswordError("Walang email address ang account na ito.");
      return;
    }

    if (!currentPassword) {
      setPasswordError("Ilagay ang current password.");
      return;
    }

    if (!isPasswordValid) {
      setPasswordError("Sundin muna ang lahat ng password requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Hindi magkapareho ang new at confirm password.");
      return;
    }

    setSavingPassword(true);

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (verifyError) {
      setPasswordError("Hindi tama ang current password.");
      setSavingPassword(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setPasswordError(updateError.message || "Hindi napalitan ang password.");
      setSavingPassword(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSuccess("Matagumpay na napalitan ang password.");
    setSavingPassword(false);
  }

  function renderPasswordInput(
    field: PasswordFieldName,
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string
  ) {
    const isVisible = visibleFields[field];
    const inputId = `password-${field}`;

    return (
      <div>
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-semibold text-slate-700"
        >
          {label}
        </label>

        <div className="relative">
          <KeyRound
            aria-hidden="true"
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            id={inputId}
            type={isVisible ? "text" : "password"}
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setPasswordError("");
              setPasswordSuccess("");
            }}
            autoComplete={
              field === "current" ? "current-password" : "new-password"
            }
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility(field)}
            aria-label={isVisible ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading account settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <SlidersHorizontal className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Provincial Settings
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage your provincial administrator profile and account
              security.
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Protected account
        </span>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <UserRound className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Profile Information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Update your name and review your assigned account information.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6 p-6">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="provincial-full-name"
                  className="text-sm font-semibold text-slate-700"
                >
                  Full name
                </label>

                {!editingName ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(true);
                      setProfileError("");
                      setProfileSuccess("");
                    }}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFullName(profile?.full_name ?? "");
                      setEditingName(false);
                      setProfileError("");
                      setProfileSuccess("");
                    }}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <input
                id="provincial-full-name"
                type="text"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setProfileError("");
                  setProfileSuccess("");
                }}
                readOnly={!editingName}
                autoComplete="name"
                placeholder="Enter your full name"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                  editingName
                    ? "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              />
              <p className="mt-2 text-xs text-slate-500">
                {editingName
                  ? "Save your changes when you are finished."
                  : "Select Edit to change your full name."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile
                icon={<Mail className="h-4 w-4" />}
                label="Email address"
                value={email || "No email address"}
              />
              <InfoTile
                icon={<Building2 className="h-4 w-4" />}
                label="Admin scope"
                value="Province-wide"
              />
              <InfoTile
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Account role"
                value={roleLabel}
              />
              <InfoTile
                icon={<BadgeCheck className="h-4 w-4" />}
                label="Verification status"
                value={statusLabel}
              />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-800">
              Email address, account role, admin scope, and verification status
              are managed by the system and cannot be changed from this page.
            </div>

            {profileError && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {profileError}
              </p>
            )}

            {profileSuccess && (
              <p
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {profileSuccess}
              </p>
            )}

            {editingName && (
              <div className="flex justify-end border-t border-slate-200 pt-5">
                <button
                  type="submit"
                  disabled={savingProfile || !hasNameChanged}
                  className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <KeyRound className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Account Security
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Change your password to keep your account secure.
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5 p-6">
            {renderPasswordInput(
              "current",
              "Current password",
              currentPassword,
              setCurrentPassword,
              "Enter current password"
            )}

            {renderPasswordInput(
              "new",
              "New password",
              newPassword,
              setNewPassword,
              "Enter new password"
            )}

            {newPassword && (
              <ul className="grid gap-1 text-xs sm:grid-cols-2">
                {passwordChecks.map((check) => (
                  <li
                    key={check.label}
                    className={
                      check.valid ? "text-emerald-700" : "text-slate-500"
                    }
                  >
                    {check.valid ? "✓" : "•"} {check.label}
                  </li>
                ))}
              </ul>
            )}

            {renderPasswordInput(
              "confirm",
              "Confirm new password",
              confirmPassword,
              setConfirmPassword,
              "Enter confirm new password"
            )}

            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-amber-700">
                Hindi magkapareho ang new at confirm password.
              </p>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              Gumamit ng malakas na password na hindi mo ginagamit sa ibang
              account.
            </div>

            {passwordError && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {passwordError}
              </p>
            )}

            {passwordSuccess && (
              <p
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {passwordSuccess}
              </p>
            )}

            <div className="border-t border-slate-200 pt-5">
              <button
                type="submit"
                disabled={
                  savingPassword ||
                  !currentPassword ||
                  !isPasswordValid ||
                  newPassword !== confirmPassword
                }
                className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {savingPassword ? "Updating password..." : "Update password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

type InfoTileProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function InfoTile({ icon, label, value }: InfoTileProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}