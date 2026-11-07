"use client";
import { useRef, useState, type FormEvent } from "react";
import { Loader2, Power, Trash2, X } from "lucide-react";
import type { MunicipalAdmin } from "../types/municipality";
import { manageMunicipalAdmin } from "../utils/manageMunicipalAdmin";

export function municipalAdminStatus(
  status: MunicipalAdmin["verification_status"],
) {
  if (status === "approved") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";
  return "Unknown";
}
export default function MunicipalAdminActions({
  admin,
  onChanged,
}: {
  admin: MunicipalAdmin;
  onChanged: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const active = admin.verification_status === "approved";
  async function changeAccess() {
    if (
      !window.confirm(
        `${active ? "Deactivate" : "Activate"} ${admin.full_name || admin.email}?${active ? " This will block municipal portal access and release their admin slot." : " This uses one of the municipality’s 2 admin slots."}`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const message = await manageMunicipalAdmin(
        admin.id,
        active ? "deactivate" : "activate",
      );
      await onChanged();
      window.alert(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update account.");
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    if (
      String(values.get("confirmEmail")).trim().toLowerCase() !==
      admin.email?.trim().toLowerCase()
    ) {
      setError("The confirmation email does not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const message = await manageMunicipalAdmin(admin.id, "delete", {
        confirmEmail: values.get("confirmEmail"),
        currentPassword: values.get("currentPassword"),
        confirmPermanent: values.get("confirmPermanent") === "on",
      });
      dialog.current?.close();
      form.current?.reset();
      await onChanged();
      window.alert(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete account.");
    } finally {
      setBusy(false);
    }
  }
  const button =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={changeAccess}
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Power size={16} />
          )}{" "}
          {active ? "Deactivate" : "Activate"}
        </button>
        {admin.verification_status === "inactive" && (
          <button
            type="button"
            disabled={busy}
            className={button + " border-red-200 text-red-700 hover:bg-red-50"}
            onClick={() => {
              setError("");
              dialog.current?.showModal();
            }}
          >
            <Trash2 size={16} /> Delete
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={`delete-title-${admin.id}`}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else {
            setError("");
            form.current?.reset();
          }
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/60 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={`delete-title-${admin.id}`} className="text-xl font-bold">
            Delete Municipal Admin
          </h2>
          <button
            type="button"
            aria-label="Close delete dialog"
            disabled={busy}
            onClick={() => {
              dialog.current?.close();
              setError("");
              form.current?.reset();
            }}
            className="rounded-lg p-1 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>
        <p className="mt-3 break-words text-sm text-slate-600">
          Permanently delete {admin.full_name || "this admin"} ({admin.email})
          from {admin.municipality}? They will no longer be able to sign in.
          Event, attendance, and staff assignment records will be kept.
        </p>
        <form ref={form} onSubmit={deleteAccount} className="mt-5 space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <label className="block text-sm font-semibold">
              Type the admin’s email to confirm
              <input
                name="confirmEmail"
                type="email"
                required
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Your Provincial Admin password
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                maxLength={128}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                name="confirmPermanent"
                type="checkbox"
                required
                className="mt-1"
              />{" "}
              I understand that deleting this account is permanent.
            </label>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              className={button}
              onClick={() => {
                dialog.current?.close();
                setError("");
                form.current?.reset();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy && <Loader2 size={16} className="animate-spin" />} Delete
              Account
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
