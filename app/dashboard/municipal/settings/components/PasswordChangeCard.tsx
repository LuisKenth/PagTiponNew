"use client";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  FormEvent,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type PasswordChangeCardProps = {
  email: string;
};

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export default function PasswordChangeCard({
  email,
}: PasswordChangeCardProps) {
  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] =
    useState<MessageState>(null);

  function clearMessage() {
    if (message) {
      setMessage(null);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!email) {
      setMessage({
        type: "error",
        text: "No email address is associated with this account.",
      });
      return;
    }

    if (!currentPassword) {
      setMessage({
        type: "error",
        text: "Enter your current password.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "The new password must contain at least eight characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "The new password and confirmation do not match.",
      });
      return;
    }

    if (newPassword === currentPassword) {
      setMessage({
        type: "error",
        text: "The new password must be different from your current password.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

      if (signInError) {
        throw new Error(
          "The current password you entered is incorrect.",
        );
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) {
        throw updateError;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage({
        type: "success",
        text: "Your password was changed successfully.",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to change your password.";

      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <KeyRound className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Account Security
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Change your password to keep your account
              secure.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 p-5 sm:p-6"
      >
        <PasswordInput
          id="municipal-current-password"
          label="Current password"
          value={currentPassword}
          showPassword={showCurrentPassword}
          disabled={saving}
          autoComplete="current-password"
          onChange={(value) => {
            setCurrentPassword(value);
            clearMessage();
          }}
          onToggleVisibility={() =>
            setShowCurrentPassword((current) => !current)
          }
        />

        <PasswordInput
          id="municipal-new-password"
          label="New password"
          value={newPassword}
          showPassword={showNewPassword}
          disabled={saving}
          autoComplete="new-password"
          onChange={(value) => {
            setNewPassword(value);
            clearMessage();
          }}
          onToggleVisibility={() =>
            setShowNewPassword((current) => !current)
          }
        />

        <PasswordInput
          id="municipal-confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          showPassword={showConfirmPassword}
          disabled={saving}
          autoComplete="new-password"
          onChange={(value) => {
            setConfirmPassword(value);
            clearMessage();
          }}
          onToggleVisibility={() =>
            setShowConfirmPassword(
              (current) => !current,
            )
          }
        />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

            <p className="text-sm leading-6 text-slate-600">
              Use at least eight characters and avoid using
              the same password from another account.
            </p>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className={
              message.type === "success"
                ? "flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                : "flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            }
          >
            {message.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}

            <span>{message.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={
            saving ||
            !currentPassword ||
            !newPassword ||
            !confirmPassword
          }
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Changing Password...
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              Change Password
            </>
          )}
        </button>
      </form>
    </section>
  );
}

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  showPassword: boolean;
  disabled: boolean;
  autoComplete:
    | "current-password"
    | "new-password";
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
};

function PasswordInput({
  id,
  label,
  value,
  showPassword,
  disabled,
  autoComplete,
  onChange,
  onToggleVisibility,
}: PasswordInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <div className="relative mt-2">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder={`Enter ${label.toLowerCase()}`}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={onToggleVisibility}
          aria-label={
            showPassword
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
