"use client";

import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
  MunicipalSettingsProfile,
} from "../types/municipalSettings";
import PasswordChangeCard from "./PasswordChangeCard";
import ProfileSettingsCard from "./ProfileSettingsCard";
import SettingsHeader from "./SettingsHeader";

type ProfileRow = {
  id: string;
  full_name: string | null;
  municipality: string | null;
  role: string | null;
  verification_status: string | null;
};

export default function MunicipalSettingsClient() {
  const [profile, setProfile] =
    useState<MunicipalSettingsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

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

      const {
        data,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            municipality,
            role,
            verification_status
          `,
        )
        .eq("id", user.id)
        .single();

      if (profileError || !data) {
        throw new Error(
          profileError?.message ??
          "Unable to load your profile.",
        );
      }

      const profileRow = data as ProfileRow;

      if (
        profileRow.role !== "municipal_admin" ||
        profileRow.verification_status !== "approved"
      ) {
        throw new Error(
          "This page is available only to approved municipal administrators.",
        );
      }

      setProfile({
        id: profileRow.id,
        fullName: profileRow.full_name ?? "",
        email: user.email ?? "",
        municipality: profileRow.municipality ?? "",
        role: profileRow.role ?? "",
        verificationStatus:
          profileRow.verification_status ?? "",
      });
    } catch (error) {
      setProfile(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load municipal settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return <SettingsLoadingState />;
  }

  if (errorMessage || !profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-slate-900">
          Unable to load settings
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          {errorMessage ??
            "Your municipal profile could not be loaded."}
        </p>

        <button
          type="button"
          onClick={() => {
            void loadProfile();
          }}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsHeader />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(400px,0.85fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(430px,0.8fr)]">
        <ProfileSettingsCard
          profile={profile}
          onProfileUpdated={setProfile}
        />

        <PasswordChangeCard email={profile.email} />
      </div>
    </div>
  );
}

function SettingsLoadingState() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-200" />

          <div className="space-y-2">
            <div className="h-6 w-52 rounded bg-slate-200" />
            <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(400px,0.85fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(430px,0.8fr)]">
        <LoadingCard rows={5} />
        <LoadingCard rows={4} />
      </div>
    </div>
  );
}

function LoadingCard({
  rows,
}: {
  rows: number;
}) {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-6 w-44 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-64 max-w-full rounded bg-slate-100" />

      <div className="mt-7 space-y-4">
        {Array.from({ length: rows }).map(
          (_, index) => (
            <div
              key={index}
              className="h-12 rounded-xl bg-slate-100"
            />
          ),
        )}
      </div>
    </div>
  );
}
