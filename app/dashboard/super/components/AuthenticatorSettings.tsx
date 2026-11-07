"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Loader2,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { message } from "@/lib/super/client";
import { useSuperAccount } from "./SuperContext";
import {
  inputClass,
  primaryClass,
  secondaryClass,
  ErrorMessage,
  SuccessMessage,
} from "./ui";
type Factor = {
  id: string;
  friendly_name?: string;
  status: string;
  factor_type: string;
};
export default function AuthenticatorSettings() {
  const { refreshProfile } = useSuperAccount();
  const [factors, setFactors] = useState<Factor[]>([]),
    [factorId, setFactorId] = useState(""),
    [qr, setQr] = useState(""),
    [secret, setSecret] = useState(""),
    [code, setCode] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    setFactors(data.all.filter((f) => f.factor_type === "totp"));
  }, []);
  useEffect(() => {
    const timer = setTimeout(
      () => void load().catch((e) => setError(message(e))),
      0,
    );
    return () => clearTimeout(timer);
  }, [load]);
  const verified = factors.filter((f) => f.status === "verified").length;
  async function enroll() {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `PagTipon Backup ${new Date().toISOString().slice(0, 16)} ${Math.floor(Math.random() * 1000)}`,
      });
      if (error) throw error;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setCode("");
      await load();
    } catch (e) {
      setError(message(e));
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
      setFactorId("");
      setQr("");
      setSecret("");
      setCode("");
      setSuccess("Backup authenticator verified.");
      await load();
      await refreshProfile();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(factor: Factor) {
    if (busy) return;
    if (factor.status === "verified" && verified <= 1) {
      setError(
        "Add and verify a backup before removing your last authenticator.",
      );
      return;
    }
    if (
      !window.confirm(
        factor.status === "verified"
          ? "Remove this authenticator? Make sure you can access the other verified authenticator."
          : "Remove this unfinished authenticator setup?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });
      if (error) throw error;
      if (factor.id === factorId) {
        setFactorId("");
        setQr("");
        setSecret("");
        setCode("");
      }
      setSuccess("Authenticator removed. You may be asked to verify again.");
      await load();
      await refreshProfile();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Authenticator Protection
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Keep at least one verified authenticator. Add a backup on another
            trusted device before replacing or removing your current one.
          </p>
        </div>
        <button
          disabled={busy || !!factorId}
          className={secondaryClass}
          onClick={() => void enroll()}
        >
          <Plus className="h-4 w-4" />
          Add Backup
        </button>
      </div>
      {error && (
        <div className="mt-4">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      )}
      {success && (
        <div className="mt-4">
          <SuccessMessage>{success}</SuccessMessage>
        </div>
      )}
      <ul className="mt-5 space-y-3">
        {factors.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-500">
                <Smartphone className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">
                  {f.friendly_name || "Authenticator"}
                </p>
                <p
                  className={`mt-1 text-xs ${f.status === "verified" ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {f.status === "verified" ? "Verified" : "Unfinished setup"}
                </p>
              </div>
            </div>
            <button
              disabled={busy || (f.status === "verified" && verified <= 1)}
              title={
                f.status === "verified" && verified <= 1
                  ? "Verify a backup before removing the last authenticator"
                  : undefined
              }
              onClick={() => void remove(f)}
              className={`${secondaryClass} text-red-600`}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </li>
        ))}
      </ul>
      {factorId && (
        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
          <h3 className="font-semibold">Verify Your Backup Authenticator</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Scan the QR with your authenticator app or enter the setup key. Keep
            both private.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="Private backup authenticator setup QR"
            className="mx-auto my-4 h-44 w-44 rounded-lg bg-white p-2"
          />
          <p className="break-all rounded-lg bg-white p-3 font-mono text-xs text-slate-600">
            {secret}
          </p>
          <form onSubmit={verify} className="mt-4 space-y-3">
            <label className="block text-sm font-semibold">
              6-digit Code
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={inputClass}
              />
            </label>
            <button
              disabled={busy || code.length !== 6}
              className={primaryClass}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Verify Backup
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
