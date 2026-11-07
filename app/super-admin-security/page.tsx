"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ShieldCheck, Loader2, LifeBuoy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { verifyDashboardRole } from "@/lib/access/client";
import { AccessProblem, accessDeadline } from "@/lib/access/errors";
import AccountAccessNotice from "@/app/components/AccountAccessNotice";

type Factor = { id: string; friendly_name?: string };
export default function SuperAdminSecurity() {
  const [attempt, setAttempt] = useState(0);
  const [initProblem, setInitProblem] = useState<{
    status: "retry" | "denied";
    message: string;
  } | null>(null);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function check() {
      try {
        await verifyDashboardRole("super_admin", controller);
        if (!active) return;
        const { data: assurance, error: ae } = await accessDeadline(
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        );
        if (ae) throw ae;
        if (!active) return;
        if (assurance.currentLevel === "aal2") {
          window.location.replace("/dashboard/super");
          return;
        }
        const { data: list, error: le } = await accessDeadline(
          supabase.auth.mfa.listFactors(),
        );
        if (le) throw le;
        if (!active) return;
        setFactors(list.totp);
        setFactorId(list.totp[0]?.id ?? "");
        setReady(true);
      } catch (e) {
        if (active) {
          if (e instanceof AccessProblem && e.kind === "redirect") {
            window.location.replace(e.destination || "/login");
            return;
          }
          setInitProblem({
            status:
              e instanceof AccessProblem && e.kind === "denied"
                ? "denied"
                : "retry",
            message:
              e instanceof Error
                ? e.message
                : "Unable to verify access. Try again.",
          });
        }
      } finally {
        if (active) setChecking(false);
      }
    }
    void check();
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);
  async function enroll() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      // Reuse only verified factors. Clean abandoned enrollment from this browser's account.
      const {
        data: { user },
        error: ue,
      } = await supabase.auth.getUser();
      if (ue || !user) throw new Error("Please sign in again.");
      for (const f of user.factors ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          const { error } = await supabase.auth.mfa.unenroll({
            factorId: f.id,
          });
          if (error) throw error;
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `PagTipon Super Admin ${Date.now()}`,
      });
      if (error) throw error;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to enroll authenticator.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (error) throw error;
      setCode("");
      setSecret("");
      setQr("");
      window.location.replace("/dashboard/super");
    } catch {
      setError(
        "Code verification failed. Check your authenticator and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (checking || initProblem)
    return (
      <AccountAccessNotice
        status={checking ? "checking" : initProblem!.status}
        message={initProblem?.message}
        onRetry={() => {
          setChecking(true);
          setInitProblem(null);
          setAttempt((v) => v + 1);
        }}
        title="Super Admin Security"
      />
    );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-sm">
        <ShieldCheck className="mb-4 h-10 w-10 text-indigo-600" />
        <h1 className="text-2xl font-bold">Super Admin Security</h1>
        <p className="mt-2 text-sm text-slate-600">
          Verify with your authenticator app before managing administrator
          accounts.
        </p>
        {error && (
          <p
            role="alert"
            className="my-4 rounded-xl bg-red-50 p-3 text-red-700"
          >
            {error}
          </p>
        )}
        {checking ? (
          <p className="mt-5">Checking account…</p>
        ) : (
          ready && (
            <div className="mt-5">
              {!factorId && (
                <button
                  disabled={busy}
                  onClick={() => void enroll()}
                  className="rounded-xl bg-indigo-600 p-3 text-white disabled:opacity-50"
                >
                  Set Up Authenticator
                </button>
              )}
              {qr && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm">
                    Scan this QR with your authenticator, or enter the setup
                    key. Keep the key private.
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qr}
                    alt="Private authenticator enrollment QR"
                    className="mx-auto my-3 h-48 w-48"
                  />
                  <p className="break-all font-mono text-sm">{secret}</p>
                </div>
              )}
              {factorId && (
                <form onSubmit={verify} className="mt-4 space-y-4">
                  {factors.length > 1 && (
                    <label className="block text-sm">
                      Authenticator
                      <select
                        value={factorId}
                        onChange={(e) => setFactorId(e.target.value)}
                        className="mt-2 w-full rounded-xl border p-3"
                      >
                        {factors.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.friendly_name || "Authenticator"}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block text-sm font-semibold">
                    6-digit code
                    <input
                      required
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, ""))
                      }
                      className="mt-2 w-full rounded-xl border p-3 text-xl tracking-widest"
                    />
                  </label>
                  <button
                    disabled={busy || code.length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 p-3 font-semibold text-white disabled:opacity-50"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}Verify
                    and Continue
                  </button>
                </form>
              )}
            </div>
          )
        )}
        {ready && factors.length > 0 && (
          <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-indigo-700">
              <LifeBuoy
                aria-hidden="true"
                className="mr-2 inline-block h-4 w-4"
              />
              Lost your authenticator?
            </summary>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              <p>
                If you have a verified backup authenticator, choose it in the
                Authenticator dropdown above and enter its 6-digit code.
              </p>
              <p>
                If you cannot access any authenticator, contact the authorized
                PagTipon project maintainer. They must verify your identity
                before recovering your account.
              </p>
              <p className="text-xs leading-5">
                Email password reset alone does not remove MFA. Do not share
                your password, authenticator setup key, or 6-digit codes.
              </p>
            </div>
          </details>
        )}
        <p className="mt-5 text-xs leading-5 text-slate-500">
          Email password reset alone does not remove MFA. Contact the authorized
          project maintainer if no authenticator is accessible.
        </p>
        <button
          className="mt-5 text-sm underline"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.replace("/login");
          }}
        >
          Sign Out
        </button>
        {!ready && !checking && (
          <Link href="/login" className="ml-4 text-sm underline">
            Back to Sign In
          </Link>
        )}
      </section>
    </main>
  );
}
