"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import CertificateOption from "./CertificateOption";
type Signature = { position: number; name: string; title: string };
export default function EventCertificateSetup({
  eventId,
  onSaved,
}: {
  eventId: string;
  onSaved?: () => void;
}) {
  const [enabled, setEnabled] = useState(false),
    [rows, setRows] = useState<Signature[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [locked, setLocked] = useState(false),
    [issued, setIssued] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const requestGeneration = useRef(0);
  const alive = useRef(false),
    saving = useRef(false);
  const load = useCallback(async () => {
    const ticket = ++requestGeneration.current;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        "get_event_certificate_setup",
        { p_event_id: eventId },
      );
      if (error) throw error;
      if (!alive.current || ticket !== requestGeneration.current) return;
      setEnabled(data.enabled);
      setIssued(data.hasIssued);
      setLocked(Boolean(data.optionLocked));
      setRows(
        [1, 2, 3].map(
          (position) =>
            data.signatories.find(
              (s: Signature) => s.position === position,
            ) || { position, name: "", title: "" },
        ),
      );
      setError("");
    } catch (e) {
      if (alive.current && ticket === requestGeneration.current)
        setError(
          (e as { message?: string }).message ||
            "Unable to load certificate setup.",
        );
    } finally {
      if (alive.current && ticket === requestGeneration.current)
        setLoading(false);
    }
  }, [eventId]);
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      requestGeneration.current++;
    };
  }, [load]);
  async function save() {
    if (saving.current || issued || loading) return;
    const selected = rows.filter((r) => r.name.trim() || r.title.trim());
    if (
      enabled &&
      (!selected.some((r) => r.position === 1) ||
        selected.some((r) => !r.name.trim() || !r.title.trim()))
    ) {
      setError(
        "Complete Signatory 1 and both fields for any additional signatory.",
      );
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await supabase.rpc("configure_event_certificates", {
        p_event_id: eventId,
        p_enabled: enabled,
        p_signatories: selected,
      });
      if (error) throw error;
      setMessage(
        "Certificate setup saved. After event completion, eligible participants automatically receive certificates on the next system check.",
      );
      await load();
      onSaved?.();
    } catch (e) {
      setError(
        (e as { message?: string }).message ||
          "Unable to save certificate setup.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold">Certificate Setup</h2>
      {loading ? (
        <p role="status">Loading certificate setup…</p>
      ) : (
        <>
          <CertificateOption
            enabled={enabled}
            onChange={setEnabled}
            disabled={
              busy || locked || issued || Boolean(error && rows.length === 0)
            }
          />
          {issued && (
            <p className="text-sm text-slate-600">
              Certificates have been issued. Settings and signatories are
              locked; issued copies keep their saved signatories.
            </p>
          )}
          {locked && !issued && (
            <p className="text-sm text-slate-600">
              Certificate availability is locked after event start. Signatories
              can still be configured before issuance.
            </p>
          )}
          {enabled &&
            rows.map((r, index) => (
              <fieldset
                key={r.position}
                disabled={busy || issued}
                className="grid gap-3 sm:grid-cols-2"
              >
                <legend className="mb-2 text-sm font-semibold">
                  Signatory {r.position}
                  {r.position === 1 ? " (required)" : " (optional)"}
                </legend>
                {(["name", "title"] as const).map((field) => (
                  <label key={field} className="min-w-0 text-xs font-semibold">
                    {field === "name" ? "Full name" : "Designation"}
                    <input
                      maxLength={field === "name" ? 160 : 200}
                      className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm font-normal"
                      value={r[field]}
                      onChange={(e) =>
                        setRows((old) =>
                          old.map((s, i) =>
                            i === index ? { ...s, [field]: e.target.value } : s,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          {!issued && (
            <button
              type="button"
              disabled={busy || rows.length === 0}
              onClick={() => void save()}
              className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save Certificate Setup"}
            </button>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-700">
          {message}
        </p>
      )}
    </section>
  );
}
