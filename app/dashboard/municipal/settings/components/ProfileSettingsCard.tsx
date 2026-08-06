"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] =
    useState<MessageState>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedFullName = fullName
      .trim()
      .replace(/\s+/g, " ");

    if (normalizedFullName.length < 2) {
      setMessage({
        type: "error",
        text: "Full name must contain at least two characters.",
      });
      return;
    }

    if (normalizedFullName.length > 100) {
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
          full_name: normalizedFullName,
        })
        .eq("id", user.id)
        .select("full_name")
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedFullName =
        updatedProfile?.full_name ??
        normalizedFullName;

      setFullName(updatedFullName);

      onProfileUpdated({
        ...profile,
        fullName: updatedFullName,
      });

      setMessage({
        type: "success",
        text: "Your profile was updated successfully.",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to update your profile.";

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <UserRound className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Profile Information
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Update your name and review your assigned
              account information.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 p-5 sm:p-6"
      >
        <div>
          <label
            htmlFor="municipal-full-name"
            className="text-sm font-semibold text-slate-700"
          >
            Full name
          </label>

          <div className="relative mt-2">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="municipal-full-name"
              type="text"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);

                if (message) {
                  setMessage(null);
                }
              }}
              disabled={saving}
              maxLength={100}
              autoComplete="name"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Enter your full name"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ReadOnlyField
            icon={<Mail className="h-4 w-4" />}
            label="Email address"
            value={profile.email}
          />

          <ReadOnlyField
            icon={<Building2 className="h-4 w-4" />}
            label="Municipality"
            value={formatDisplayValue(
              profile.municipality,
            )}
          />

          <ReadOnlyField
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Account role"
            value={formatDisplayValue(profile.role)}
          />

          <ReadOnlyField
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Verification status"
            value={formatDisplayValue(
              profile.verificationStatus,
            )}
          />
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-blue-800">
            Municipality, account role, email address, and
            verification status are managed by the system
            and cannot be changed from this page.
          </p>
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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              saving ||
              fullName.trim().replace(/\s+/g, " ") ===
                profile.fullName
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
