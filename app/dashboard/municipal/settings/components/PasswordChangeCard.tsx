"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useMemo,
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

type PasswordRequirement = {
  label: string;
  met: boolean;
};

export default function PasswordChangeCard({
  email,
}: PasswordChangeCardProps) {
  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState<MessageState>(null);

  /*
   * Live password requirements.
   */
  const requirements =
    useMemo<PasswordRequirement[]>(
      () => [
        {
          label: "At least 8 characters",
          met: newPassword.length >= 8,
        },
        {
          label:
            "At least one uppercase letter",
          met: /[A-Z]/.test(newPassword),
        },
        {
          label:
            "At least one lowercase letter",
          met: /[a-z]/.test(newPassword),
        },
        {
          label: "At least one number",
          met: /\d/.test(newPassword),
        },
        {
          label:
            "At least one special character",
          met: /[^A-Za-z0-9]/.test(
            newPassword,
          ),
        },
      ],
      [newPassword],
    );

  const metRequirementCount =
    requirements.filter(
      (requirement) =>
        requirement.met,
    ).length;

  const allRequirementsMet =
    metRequirementCount ===
    requirements.length;

  const passwordsMatch =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const confirmHasMismatch =
    confirmPassword.length > 0 &&
    newPassword !== confirmPassword;

  /*
   * Password strength.
   */
  const strength = useMemo(() => {
    if (metRequirementCount <= 2) {
      return {
        label: "Weak",
        bars: 1,
        textClass: "text-red-600",
        barClass: "bg-red-500",
      };
    }

    if (metRequirementCount <= 4) {
      return {
        label: "Medium",
        bars: 2,
        textClass: "text-amber-600",
        barClass: "bg-amber-500",
      };
    }

    return {
      label: "Strong",
      bars: 3,
      textClass: "text-emerald-600",
      barClass: "bg-emerald-500",
    };
  }, [metRequirementCount]);

  /*
   * Automatically hide success
   * message after 4 seconds.
   */
  useEffect(() => {
    if (message?.type !== "success") {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setMessage(null);
      },
      4000,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

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

    if (!allRequirementsMet) {
      setMessage({
        type: "error",
        text: "Your new password does not meet all password requirements.",
      });

      return;
    }

    if (!passwordsMatch) {
      setMessage({
        type: "error",
        text: "The new password and confirmation do not match.",
      });

      return;
    }

    if (
      newPassword === currentPassword
    ) {
      setMessage({
        type: "error",
        text: "The new password must be different from your current password.",
      });

      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      /*
       * Confirm current password.
       */
      const { error: signInError } =
        await supabase.auth
          .signInWithPassword({
            email,
            password:
              currentPassword,
          });

      if (signInError) {
        throw new Error(
          "The current password you entered is incorrect.",
        );
      }

      /*
       * Update password.
       */
      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) {
        throw updateError;
      }

      /*
       * Clear password fields.
       */
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage({
        type: "success",
        text: "Password changed successfully. Use your new password the next time you sign in.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to change your password.",
      });
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    Boolean(currentPassword) &&
    allRequirementsMet &&
    passwordsMatch &&
    newPassword !==
      currentPassword &&
    !saving;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <KeyRound className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Account Security
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Change your password to keep
              your account secure.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-5 sm:p-6"
      >
        {/* Current password */}
        <PasswordInput
          id="municipal-current-password"
          label="Current password"
          value={currentPassword}
          showPassword={
            showCurrentPassword
          }
          disabled={saving}
          autoComplete="current-password"
          onChange={(value) => {
            setCurrentPassword(value);
            clearMessage();
          }}
          onToggleVisibility={() =>
            setShowCurrentPassword(
              (current) => !current,
            )
          }
        />

        {/* New password */}
        <div>
          <PasswordInput
            id="municipal-new-password"
            label="New password"
            value={newPassword}
            showPassword={
              showNewPassword
            }
            disabled={saving}
            autoComplete="new-password"
            onChange={(value) => {
              setNewPassword(value);
              clearMessage();
            }}
            onToggleVisibility={() =>
              setShowNewPassword(
                (current) => !current,
              )
            }
          />

          {/* Compact helper when empty */}
          {newPassword.length === 0 && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Use 8+ characters with
              uppercase, lowercase, a number,
              and a special character.
            </p>
          )}

          {/* Password strength - only show when typing */}
          {newPassword.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Password strength
                </p>

                <span
                  className={`text-sm font-semibold ${strength.textClass}`}
                >
                  {strength.label}
                </span>
              </div>

              {/* Strength bars */}
              <div
                className="mt-2 grid grid-cols-3 gap-1.5"
                aria-hidden="true"
              >
                {[1, 2, 3].map(
                  (bar) => (
                    <div
                      key={bar}
                      className={`h-1.5 rounded-full ${
                        bar <=
                        strength.bars
                          ? strength.barClass
                          : "bg-slate-200"
                      }`}
                    />
                  ),
                )}
              </div>

              {/* Requirements */}
              <div className="mt-3 space-y-1.5">
                {requirements.map(
                  (requirement) => (
                    <div
                      key={
                        requirement.label
                      }
                      className="flex items-center gap-2 text-[12px]"
                    >
                      {requirement.met ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      )}

                      <span
                        className={
                          requirement.met
                            ? "text-emerald-700"
                            : "text-slate-500"
                        }
                      >
                        {
                          requirement.label
                        }
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <PasswordInput
            id="municipal-confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            showPassword={
              showConfirmPassword
            }
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

          {/* Live password matching */}
          {passwordsMatch && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Passwords match.
            </p>
          )}

          {confirmHasMismatch && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              Passwords do not match.
            </p>
          )}
        </div>

        {/* Security reminder */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

            <p className="text-xs leading-5 text-slate-600">
              Use a strong password that you
              do not reuse for another
              account.
            </p>
          </div>
        </div>

        {/* Success / Error */}
        {message && (
          <div
            role="status"
            className={
              message.type === "success"
                ? "flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                : "flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            }
          >
            {message.type ===
            "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}

            <span>
              {message.text}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
        </div>
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
  onChange: (
    value: string,
  ) => void;
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
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={`Enter ${label.toLowerCase()}`}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <button
          type="button"
          disabled={disabled}
          onClick={
            onToggleVisibility
          }
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