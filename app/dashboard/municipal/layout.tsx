"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import {
  getDashboardPath,
  type UserRole,
} from "@/lib/routes";

import MunicipalSidebar from "./components/MunicipalSidebar";

type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected";

type Profile = {
  role: UserRole;
  verification_status: VerificationStatus;
};

export default function MunicipalDashboardLayout({
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
            "role, verification_status",
          )
          .eq("id", user.id)
          .maybeSingle<Profile>();

        if (profileError || !profile) {
          console.error(
            "Municipal access check error:",
            profileError?.message,
          );

          await supabase.auth.signOut();

          if (mounted) {
            setAllowed(false);
          }

          router.replace("/login");
          return;
        }

        if (
          profile.role !== "municipal_admin"
        ) {
          if (mounted) {
            setAllowed(false);
          }

          router.replace(
            getDashboardPath(profile.role),
          );

          return;
        }

        if (
          profile.verification_status ===
          "pending"
        ) {
          await supabase.auth.signOut();

          alert(
            "Your municipal admin account is still pending provincial approval.",
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
            "Your municipal admin application has been rejected.",
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
          "Municipal route protection error:",
          error,
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
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-medium text-slate-600">
            Checking account access...
          </p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <MunicipalSidebar />

      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}