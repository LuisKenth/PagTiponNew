"use client";

import { useEffect, useId, useRef } from "react";
import { CheckCircle2 } from "lucide-react";

export default function VenueCreatedPopup({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      style={{ width: "calc(100% - 2rem)", maxWidth: "28rem" }}
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-900 shadow-xl backdrop:bg-slate-950/50"
    >
      <CheckCircle2
        aria-hidden="true"
        className="mx-auto mb-4 h-14 w-14 text-emerald-600"
      />
      <h2 id={titleId} className="text-xl font-bold">
        Venue created successfully!
      </h2>
      <p id={messageId} className="mt-3 text-sm leading-6 text-slate-600">
        {message}
      </p>
      <button
        type="button"
        autoFocus
        onClick={onClose}
        className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        OK
      </button>
    </dialog>
  );
}
