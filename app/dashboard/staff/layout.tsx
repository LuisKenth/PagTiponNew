"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import {
  getDashboardPath,
  type UserRole,
} from "@/lib/routes";

import StaffSidebar from "./components/StaffSidebar";
import { StaffAttendanceProvider } from "./context/StaffAttendanceContext";

type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected";

type Profile = {
  role: UserRole;
  verification_status: VerificationStatus;
};

export default function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [checkingAccess, setCheckingAccess] =
    useState(true);

  const [allowed, setAllowed] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (mounted) {
            setAllowed(false);
          }

          router.replace("/login");
          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "role, verification_status"
          )
          .eq("id", user.id)
          .maybeSingle<Profile>();

        if (profileError || !profile) {
          console.error(
            "Staff access check error:",
            profileError?.message
          );

          await supabase.auth.signOut();

          if (mounted) {
            setAllowed(false);
          }

          router.replace("/login");
          return;
        }

        /*
         * Redirect authenticated users to the
         * correct dashboard for their role.
         */
        if (profile.role !== "event_staff") {
          if (mounted) {
            setAllowed(false);
          }

          router.replace(
            getDashboardPath(profile.role)
          );

          return;
        }

        /*
         * Event staff must be approved before
         * accessing attendance tools.
         */
        if (
          profile.verification_status ===
          "pending"
        ) {
          await supabase.auth.signOut();

          alert(
            "Your event staff account is still pending approval."
          );

          if (mounted) {
            setAllowed(false);
          }

          router.replace("/login");
          return;
        }

        if (
          profile.verification_status ===
          "rejected"
        ) {
          await supabase.auth.signOut();

          alert(
            "Your event staff application has been rejected."
          );

          if (mounted) {
            setAllowed(false);
          }

          router.replace("/login");
          return;
        }

        if (
          profile.verification_status !==
          "approved"
        ) {
          await supabase.auth.signOut();

          if (mounted) {
            setAllowed(false);
          }

          router.replace("/login");
          return;
        }

        if (mounted) {
          setAllowed(true);
        }
      } catch (error) {
        console.error(
          "Staff route protection error:",
          error
        );

        await supabase.auth.signOut();

        if (mounted) {
          setAllowed(false);
        }

        router.replace("/login");
      } finally {
        if (mounted) {
          setCheckingAccess(false);
        }
      }
    }

    void checkAccess();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

          <h1 className="mt-5 text-base font-bold text-slate-900">
            PagTipon Staff Portal
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Checking your account access...
          </p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <StaffAttendanceProvider>
      <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <StaffSidebar />

        <div className="min-w-0">
          <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 xl:p-10">
            {children}
          </main>
        </div>
      </div>
    </StaffAttendanceProvider>
  );
}