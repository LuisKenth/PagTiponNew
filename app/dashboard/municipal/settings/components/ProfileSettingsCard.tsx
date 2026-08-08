"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Pencil,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
  MunicipalSettingsProfile,
} from "../types/municipalSettings";

type ProfileSettingsCardProps = {
  profile: MunicipalSettingsProfile;
  onProfileUpdated: (
    profile: MunicipalSettingsProfile,
  ) => void;
};

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

type ReadOnlyFieldProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function formatDisplayValue(value: string) {
  if (!value) {
    return "Not available";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function ReadOnlyField({
  icon,
  label,
  value,
}: ReadOnlyFieldProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-slate-500">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-medium text-slate-800">
            {value || "Not available"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSettingsCard({
  profile,
  onProfileUpdated,
}: ProfileSettingsCardProps) {
  const [fullName, setFullName] = useState(
    profile.fullName,
  );

  const [isEditing, setIsEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState<MessageState>(null);

  const fullNameInputRef =
    useRef<HTMLInputElement>(null);

  const normalizedCurrentName = fullName
    .trim()
    .replace(/\s+/g, " ");

  const normalizedSavedName =
    profile.fullName
      .trim()
      .replace(/\s+/g, " ");

  const hasChanges =
    normalizedCurrentName !==
    normalizedSavedName;

  const validFullName =
    normalizedCurrentName.length >= 2 &&
    normalizedCurrentName.length <= 100;

  /*
   * Automatically hide successful
   * save messages after 4 seconds.
   */
  useEffect(() => {
    if (message?.type !== "success") {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  /*
   * Warn when refreshing or closing
   * the browser while changes are unsaved.
   */
  useEffect(() => {
    if (!hasChanges) {
      return;
    }

    function handleBeforeUnload(
      event: BeforeUnloadEvent,
    ) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
    };
  }, [hasChanges]);

  /*
   * Warn when clicking another page/link
   * while the Full Name has unsaved changes.
   */
  useEffect(() => {
    if (!hasChanges) {
      return;
    }

    function handleDocumentClick(
      event: MouseEvent,
    ) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");

      if (!anchor) {
        return;
      }

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const href =
        anchor.getAttribute("href");

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      const destination = new URL(
        anchor.href,
        window.location.href,
      );

      const current = new URL(
        window.location.href,
      );

      if (
        destination.href === current.href
      ) {
        return;
      }

      const shouldLeave =
        window.confirm(
          "You have unsaved profile changes. Leave this page without saving?",
        );

      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }

    document.addEventListener(
      "click",
      handleDocumentClick,
      true,
    );

    return () => {
      document.removeEventListener(
        "click",
        handleDocumentClick,
        true,
      );
    };
  }, [hasChanges]);

  /*
   * Edit / Cancel Full Name.
   */
  function handleEditToggle() {
    if (saving) {
      return;
    }

    if (isEditing) {
      /*
       * Ask before discarding an
       * unsaved name change.
       */
      if (hasChanges) {
        const shouldDiscard =
          window.confirm(
            "Discard your unsaved name changes?",
          );

        if (!shouldDiscard) {
          return;
        }
      }

      setFullName(profile.fullName);
      setMessage(null);
      setIsEditing(false);

      return;
    }

    setMessage(null);
    setIsEditing(true);

    /*
     * Wait until React has made
     * the input editable.
     */
    window.setTimeout(() => {
      fullNameInputRef.current?.focus();
      fullNameInputRef.current?.select();
    }, 0);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!isEditing) {
      return;
    }

    if (normalizedCurrentName.length < 2) {
      setMessage({
        type: "error",
        text: "Full name must contain at least two characters.",
      });

      return;
    }

    if (normalizedCurrentName.length > 100) {
      setMessage({
        type: "error",
        text: "Full name must not exceed 100 characters.",
      });

      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Your session has expired. Please sign in again.",
        );
      }

      if (user.id !== profile.id) {
        throw new Error(
          "You are not authorized to update this profile.",
        );
      }

      const {
        data: updatedProfile,
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          full_name:
            normalizedCurrentName,
        })
        .eq("id", user.id)
        .select("full_name")
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedFullName =
        updatedProfile?.full_name ??
        normalizedCurrentName;

      setFullName(updatedFullName);

      onProfileUpdated({
        ...profile,
        fullName: updatedFullName,
      });

      /*
       * Return to read-only mode
       * after successful save.
       */
      setIsEditing(false);

      setMessage({
        type: "success",
        text: "Your profile was updated successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update your profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <UserRound className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Profile Information
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Update your name and review your
              assigned account information.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 p-5 sm:p-6"
      >
        {/* Full Name */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="municipal-full-name"
              className="text-sm font-semibold text-slate-700"
            >
              Full name
            </label>

            <button
              type="button"
              onClick={handleEditToggle}
              disabled={saving}
              className={
                isEditing
                  ? "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  : "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {isEditing ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </>
              )}
            </button>
          </div>

          <div className="relative mt-2">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              ref={fullNameInputRef}
              id="municipal-full-name"
              type="text"
              value={fullName}
              readOnly={!isEditing}
              onChange={(event) => {
                setFullName(
                  event.target.value,
                );

                if (message) {
                  setMessage(null);
                }
              }}
              disabled={saving}
              maxLength={100}
              autoComplete="name"
              placeholder="Enter your full name"
              className={`h-11 w-full rounded-xl border pl-10 pr-4 text-sm text-slate-900 outline-none transition ${
                isEditing
                  ? "border-blue-400 bg-white ring-4 ring-blue-50 focus:border-blue-500 focus:ring-blue-100"
                  : "cursor-default border-slate-200 bg-slate-50"
              } disabled:cursor-not-allowed disabled:bg-slate-100`}
            />
          </div>

          {!isEditing && (
            <p className="mt-2 text-xs text-slate-500">
              Select Edit to change your full name.
            </p>
          )}

          {isEditing && !hasChanges && (
            <p className="mt-2 text-xs text-blue-600">
              Edit your full name, then select
              Save Changes.
            </p>
          )}
        </div>

        {/* Unsaved changes indicator */}
        {hasChanges && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <p className="text-sm font-semibold text-amber-800">
                Unsaved changes
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                Your Full Name has been changed.
                Save your changes before leaving
                this page.
              </p>
            </div>
          </div>
        )}

        {/* Read-only account details */}
        <div className="grid gap-3 sm:grid-cols-2">
          <ReadOnlyField
            icon={
              <Mail className="h-4 w-4" />
            }
            label="Email address"
            value={profile.email}
          />

          <ReadOnlyField
            icon={
              <Building2 className="h-4 w-4" />
            }
            label="Municipality"
            value={formatDisplayValue(
              profile.municipality,
            )}
          />

          <ReadOnlyField
            icon={
              <ShieldCheck className="h-4 w-4" />
            }
            label="Account role"
            value={formatDisplayValue(
              profile.role,
            )}
          />

          <ReadOnlyField
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            label="Verification status"
            value={formatDisplayValue(
              profile.verificationStatus,
            )}
          />
        </div>

        {/* Managed-fields notice */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-blue-800">
            Municipality, account role,
            email address, and verification
            status are managed by the system
            and cannot be changed from this
            page.
          </p>
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
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <p className="hidden text-xs text-slate-500 sm:block">
            Only your full name can be edited here.
          </p>

          <button
            type="submit"
            disabled={
              saving ||
              !isEditing ||
              !hasChanges ||
              !validFullName
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}