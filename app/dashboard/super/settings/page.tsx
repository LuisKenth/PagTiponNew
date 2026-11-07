"use client";
import { useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Save,
  UserRoundCog,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { superRequest, message } from "@/lib/super/client";
import {
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/passwordPolicy";
import { useSuperAccount } from "../components/SuperContext";
import {
  PageHeader,
  ErrorMessage,
  SuccessMessage,
  inputClass,
  primaryClass,
  secondaryClass,
} from "../components/ui";
import AuthenticatorSettings from "../components/AuthenticatorSettings";
export default function SuperSettings() {
  const { profile, refreshProfile } = useSuperAccount();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [newPassword, setNewPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [show, setShow] = useState(false);
  async function saveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await superRequest<{ message: string }>(
        "/api/super/me",
        { action: "name", fullName: new FormData(form).get("fullName") },
      );
      setSuccess(response.message);
      await refreshProfile();
    } catch (e) {
      setError(message(e));
      window.alert(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function updateEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") || "")
      .trim()
      .toLowerCase();
    if (
      !window.confirm(
        `Request an email change to ${email}? Complete the confirmation instructions sent by Supabase before using the new address.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await superRequest("/api/super/me", {
        action: "email-request-log",
        email,
      });
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: `${window.location.origin}/login` },
      );
      if (error) throw error;
      form.reset();
      setSuccess(
        "Email change requested. Follow the confirmation instructions in your mailbox(es). Your login email changes after confirmation.",
      );
      window.alert(
        "Email change requested. Check the current and new mailbox for confirmation instructions.",
      );
      await refreshProfile();
    } catch (e) {
      setError(message(e));
      window.alert(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    if (!isStrongPassword(newPassword)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await superRequest<{
        message: string;
        warning?: string;
      }>("/api/super/me", {
        action: "password",
        currentPassword: new FormData(form).get("currentPassword"),
        newPassword,
      });
      setNewPassword("");
      setConfirmPassword("");
      form.reset();
      window.alert(response.warning || response.message);
      await supabase.auth.signOut().catch(() => {});
      window.location.replace("/login");
    } catch (e) {
      setError(message(e));
      window.alert(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Personal account"
        title="My Account & Security"
        description="Manage your own profile, recovery email, password, and authenticators."
        icon={UserRoundCog}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">Profile Information</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your name is shown in the sidebar and account activity.
          </p>
          <form onSubmit={saveName} className="mt-5 space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              <label className="block text-sm font-semibold">
                Full Name
                <input
                  key={profile.full_name}
                  name="fullName"
                  defaultValue={profile.full_name}
                  required
                  maxLength={100}
                  autoComplete="name"
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-semibold">
                Account Role
                <input
                  readOnly
                  value="Super Admin"
                  className={`${inputClass} bg-slate-50 text-slate-500`}
                />
              </label>
              <button disabled={busy} className={primaryClass}>
                <Save className="h-4 w-4" />
                Save Profile
              </button>
            </fieldset>
          </form>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Mail className="h-5 w-5 text-indigo-600" />
            Recovery Email
          </h2>
          <p className="mt-2 break-all text-sm text-slate-600">
            {profile.email}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Use an address you control. This uses email confirmation; your
            address will not change just by submitting this form.
          </p>
          {profile.pendingEmail && (
            <p className="mt-3 break-all rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              Pending confirmation: {profile.pendingEmail}
            </p>
          )}
          <form onSubmit={updateEmail} className="mt-5 space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              <label className="block text-sm font-semibold">
                New Email Address
                <input
                  type="email"
                  name="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  className={inputClass}
                />
              </label>
              <button disabled={busy} className={secondaryClass}>
                <Mail className="h-4 w-4" />
                Request Email Change
              </button>
            </fieldset>
          </form>
        </section>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <KeyRound className="h-5 w-5 text-indigo-600" />
          Change Password
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Confirm your current password. You will sign in again after saving.
        </p>
        <form onSubmit={changePassword} className="mt-5 space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm font-semibold">
                Current Password
                <input
                  name="currentPassword"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-semibold">
                New Password
                <input
                  type={show ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={16}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-semibold">
                Confirm New Password
                <input
                  type={show ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={16}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              {PASSWORD_POLICY_MESSAGE}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                aria-pressed={show}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
                onClick={() => setShow((v) => !v)}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {show ? "Hide" : "Show"} passwords
              </button>
              <button
                disabled={
                  busy ||
                  !isStrongPassword(newPassword) ||
                  newPassword !== confirmPassword
                }
                className={primaryClass}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save New
                Password
              </button>
            </div>
          </fieldset>
        </form>
      </section>
      <AuthenticatorSettings />
    </>
  );
}
