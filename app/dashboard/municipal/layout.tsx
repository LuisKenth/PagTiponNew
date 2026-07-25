"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDashboardPath, type UserRole } from "@/lib/routes";

type VerificationStatus = "pending" | "approved" | "rejected";

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

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // 1. Check logged-in user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setAllowed(false);
          router.replace("/login");
          return;
        }

        // 2. Get trusted role/status from profiles
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, verification_status")
          .eq("id", user.id)
          .maybeSingle<Profile>();

        if (profileError || !profile) {
          console.error(
            "Municipal access check error:",
            profileError?.message
          );

          await supabase.auth.signOut();

          setAllowed(false);
          router.replace("/login");
          return;
        }

        // 3. Block users with the wrong role
        if (profile.role !== "municipal_admin") {
          setAllowed(false);

          router.replace(getDashboardPath(profile.role));
          return;
        }

        // 4. Block pending municipal admins
        if (profile.verification_status === "pending") {
          await supabase.auth.signOut();

          alert(
            "Your municipal admin account is still pending provincial approval."
          );

          setAllowed(false);
          router.replace("/login");
          return;
        }

        // 5. Block rejected municipal admins
        if (profile.verification_status === "rejected") {
          await supabase.auth.signOut();

          alert(
            "Your municipal admin application has been rejected."
          );

          setAllowed(false);
          router.replace("/login");
          return;
        }

        // 6. Only approved Municipal Admin reaches here
        if (profile.verification_status !== "approved") {
          await supabase.auth.signOut();

          setAllowed(false);
          router.replace("/login");
          return;
        }

        setAllowed(true);
      } catch (error) {
        console.error("Municipal route protection error:", error);

        await supabase.auth.signOut();

        setAllowed(false);
        router.replace("/login");
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
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

  return <>{children}</>;
}