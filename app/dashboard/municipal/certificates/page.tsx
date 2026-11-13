"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Award } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLiveData } from "@/app/components/live/BackgroundDataSync";
import EventCertificateSetup from "@/app/components/certificates/EventCertificateSetup";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";

type Choice = {
  id: string;
  title: string;
  source: string;
  status: string;
  municipalStatus: string | null;
};

type CertificateSummary = {
  eventId: string;
  source: string;
  municipality: string;
  enabled: boolean;
  completed: boolean;
  canConfigure: boolean;
  signatories: {
    position: number;
    name: string;
    title: string;
  }[];
  participants: {
    certificate_number: string | null;
  }[];
};

export default function MunicipalCertificatesPage() {
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selected, setSelected] = useState("");
  const [summary, setSummary] = useState<CertificateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const alive = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    alive.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Please sign in again.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role,verification_status,municipality")
          .eq("id", user.id)
          .single();

        if (
          profileError ||
          profile?.role !== "municipal_admin" ||
          profile.verification_status !== "approved" ||
          !profile.municipality
        ) {
          throw new Error(
            "An approved Municipal Admin account is required.",
          );
        }

        const rows: Choice[] = [];

        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase
            .from("event_municipalities")
            .select(
              "id,municipal_status,events(title,event_origin,status)",
            )
            .eq("municipality", profile.municipality)
            .order("id")
            .range(offset, offset + 499);

          if (error) throw error;
          if (cancelled) return;

          for (const row of data ?? []) {
            const event = Array.isArray(row.events)
              ? row.events[0]
              : row.events;

            if (event && event.status !== "draft") {
              rows.push({
                id: row.id,
                title: event.title,
                source:
                  event.event_origin === "municipal"
                    ? "Municipal"
                    : "Provincial",
                status: event.status,
                municipalStatus: row.municipal_status,
              });
            }
          }

          if ((data?.length ?? 0) < 500) break;
        }

        if (cancelled) return;

        setChoices(
          rows.sort((a, b) => a.title.localeCompare(b.title)),
        );

        const requested = new URL(
          window.location.href,
        ).searchParams.get("assignmentId");

        if (requested && rows.some((row) => row.id === requested)) {
          setSelected(requested);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            (e as { message?: string }).message ||
              "Unable to load events.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      alive.current = false;
      generation.current++;
    };
  }, []);

  const load = useCallback(async () => {
    if (!selected || !alive.current) return;

    const ticket = ++generation.current;

    try {
      const { data, error } = await supabase.rpc(
        "review_event_certificates",
        {
          p_assignment_id: selected,
        },
      );

      if (error) throw error;

      if (!data) {
        throw new Error("Certificate details are unavailable.");
      }

      if (!alive.current || ticket !== generation.current) return;

      setSummary(data as CertificateSummary);
      setError("");
    } catch (e) {
      if (alive.current && ticket === generation.current) {
        setError(
          (e as { message?: string }).message ||
            "Unable to load certificate details.",
        );
      }
    }
  }, [selected]);

  useEffect(() => {
    generation.current++;
    setSummary(null);
    setError("");

    if (selected) void load();
  }, [selected, load]);

  useLiveData({
    onUpdate: load,
    disabled: loading || !selected,
  });

  const choice = choices.find((row) => row.id === selected);

  const cancelled =
    choice?.status === "cancelled" ||
    choice?.municipalStatus === "cancelled";

  const signatoryReady = Boolean(
    summary?.signatories.some(
      (row) =>
        row.position === 1 &&
        row.name.trim() &&
        row.title.trim(),
    ),
  );

  const total = summary?.participants.length ?? 0;

  const issued =
    summary?.participants.filter((row) =>
      Boolean(row.certificate_number),
    ).length ?? 0;

  let status = "Waiting for event completion";
  let explanation =
    "Certificates will be generated automatically after the event is marked Completed and eligible Time-in and Time-out records are available.";
  let tone = "bg-indigo-50 text-indigo-900";

  if (summary && !summary.enabled) {
    status = "Certificates disabled";
    explanation =
      "Participation certificates are not enabled for this event.";
    tone = "bg-slate-100 text-slate-700";
  } else if (cancelled) {
    status = "Event cancelled";
    explanation =
      "Automatic certificates are not generated for cancelled events or assignments.";
    tone = "bg-slate-100 text-slate-700";
  } else if (summary && !signatoryReady) {
    status = "Certificate setup required";
    explanation =
      summary.canConfigure && summary.source === "municipal"
        ? "Complete Signatory 1 below. The system will generate eligible certificates after event completion."
        : "The Provincial Admin must configure Signatory 1 before certificates can be generated.";
    tone = "bg-amber-50 text-amber-900";
  } else if (summary?.completed) {
    status = `${issued}/${total} certificates issued`;

    if (!total) {
      explanation =
        "No eligible participants yet. Eligibility requires approved verification and Present or Late attendance with complete, valid Time-in and Time-out.";
      tone = "bg-slate-100 text-slate-700";
    } else if (issued < total) {
      explanation =
        "Automatic generation is pending. The system checks every minute; participants receive an in-app notification when their certificate is ready.";
    } else {
      explanation =
        "All currently eligible participants have certificates available in My Certificates.";
      tone = "bg-emerald-50 text-emerald-900";
    }
  }

  return (
    <div className="space-y-5">
      <MunicipalPageHeader
        title="Participation Certificates"
        description="Configure municipal event signatories and check automatic certificate status."
        icon={<Award className="h-5 w-5" />}
        backHref="/dashboard/municipal/local-events"
        backLabel="Back to Municipal Events"
      />

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label className="block text-sm font-semibold">
          Event
          <select
            className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={loading}
            value={selected}
            onChange={(e) => {
              generation.current++;
              setSummary(null);
              setError("");
              setSelected(e.target.value);
            }}
          >
            <option value="">Select an event</option>

            {choices.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title} · {row.source}
              </option>
            ))}
          </select>
        </label>

        {loading && (
          <p role="status" className="text-sm text-slate-500">
            Loading events…
          </p>
        )}

        {!loading && !choices.length && !error && (
          <p className="text-sm text-slate-500">
            No published events available.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {selected && !summary && !error && (
          <p role="status" className="text-sm text-slate-500">
            Loading certificate status…
          </p>
        )}

        {summary && !error && (
          <>
            <p className="text-sm text-slate-600">
              {summary.source === "municipal"
                ? "Municipal"
                : "Provincial"}{" "}
              event · {summary.municipality}
            </p>

            <div
              role="status"
              className={`rounded-xl p-4 ${tone}`}
            >
              <p className="font-semibold">{status}</p>
              <p className="mt-1 text-sm leading-6">
                {explanation}
              </p>
            </div>

            {summary.source !== "municipal" && (
              <p className="text-sm text-slate-500">
                Signatories for provincial events are managed by
                the Provincial Admin.
              </p>
            )}
          </>
        )}
      </section>

      {summary?.canConfigure &&
        summary.source === "municipal" &&
        !cancelled &&
        !error && (
          <EventCertificateSetup
            key={summary.eventId}
            eventId={summary.eventId}
            onSaved={() => void load()}
          />
        )}
    </div>
  );
}