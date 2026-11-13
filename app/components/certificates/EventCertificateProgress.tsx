"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLiveData } from "@/app/components/live/BackgroundDataSync";
import EventCertificateSetup from "./EventCertificateSetup";

type Progress = {
  eligible: number;
  issued: number;
  setupReady: boolean;
  canConfigure: boolean;
  assignmentId: string | null;
  municipal: boolean;
};

export default function EventCertificateProgress({
  eventId,
  assignmentId,
  completed,
}: {
  eventId: string;
  assignmentId?: string;
  completed: boolean;
}) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++generation.current;
    if (!completed) return;
    const { data, error } = await supabase.rpc(
      "get_event_certificate_progress",
      {
        p_event_id: eventId,
        p_assignment_id: assignmentId || null,
      },
    );
    if (!alive.current || ticket !== generation.current) return;
    setError(Boolean(error));
    setProgress(error ? null : (data as Progress | null));
  }, [eventId, assignmentId, completed]);

  useEffect(() => {
    alive.current = true;
    setProgress(null);
    setError(false);
    void load();
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, [load]);
  useLiveData({
    onUpdate: load,
    disabled: !completed,
    pauseWhileEditing: true,
  });

  if (!completed) return null;
  if (error)
    return (
      <span className="mt-2 block text-xs font-normal text-slate-500">
        Certificate status unavailable.
      </span>
    );
  if (!progress) return null;

  const pending = progress.issued < progress.eligible;
  const text = !progress.setupReady
    ? "Certificate setup required"
    : progress.eligible === 0
      ? "No eligible participants"
      : pending
        ? `Automatic generation pending · ${progress.issued}/${progress.eligible} issued`
        : `Certificates issued · ${progress.issued}/${progress.eligible}`;
  const reviewUrl = `/dashboard/municipal/certificates?assignmentId=${encodeURIComponent(progress.assignmentId || "")}`;
  const open = () => dialog.current?.showModal();

  return (
    <div className="mt-2 space-y-1 text-xs font-normal leading-5">
      <p
        className={
          !progress.setupReady || (pending && progress.eligible > 0)
            ? "text-amber-700"
            : progress.eligible
              ? "text-emerald-700"
              : "text-slate-500"
        }
      >
        {text}
      </p>
      {!progress.setupReady ? (
        progress.canConfigure ? (
          <button
            type="button"
            onClick={open}
            className="font-semibold text-indigo-700 underline underline-offset-2"
          >
            Set up certificate
          </button>
        ) : (
          <p className="text-slate-500">Awaiting Provincial Admin setup.</p>
        )
      ) : (
        progress.eligible > 0 &&
        (progress.municipal ? (
          <Link
            className="font-semibold text-indigo-700 underline underline-offset-2"
            href={reviewUrl}
          >
            {pending ? "View certificate progress" : "View certificates"}
          </Link>
        ) : (
          <button
            type="button"
            onClick={open}
            className="font-semibold text-indigo-700 underline underline-offset-2"
          >
            View issuance progress
          </button>
        ))
      )}
      <dialog
        ref={dialog}
        aria-label="Event certificates"
        className="m-auto max-h-[90dvh] w-[min(94vw,760px)] max-w-none overflow-y-auto rounded-2xl bg-white p-5 text-left shadow-xl backdrop:bg-slate-950/50"
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold"
          >
            Close
          </button>
        </div>
        {!progress.setupReady && progress.canConfigure ? (
          <EventCertificateSetup
            eventId={eventId}
            onSaved={() => {
              void load();
            }}
          />
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-900">
              Certificate issuance progress
            </h2>
            <p className="mt-3 text-sm text-slate-700">
              {progress.issued} of {progress.eligible} eligible participants
              have certificates.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              The system generates certificates automatically, checking every
              minute after event completion. Counts cover currently eligible
              participants with Present or Late attendance and complete Time-in and
              Time-out.
            </p>
          </>
        )}
      </dialog>
    </div>
  );
}
