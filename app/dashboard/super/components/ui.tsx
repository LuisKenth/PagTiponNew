"use client";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
export const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100";
export const primaryClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 xl:flex-row xl:items-center">
      <div className="min-w-0">
        <div className="mb-4 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-indigo-600">
          <span className="rounded-xl bg-indigo-50 p-2.5">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          {eyebrow}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
      )}
    </section>
  );
}
export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      {children}
    </div>
  );
}
export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-14 text-sm text-slate-500"
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      Loading account information…
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === "approved" ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {status === "approved" ? "Active" : "Inactive"}
    </span>
  );
}
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
      <p>
        Showing{" "}
        <strong className="text-slate-700">
          {total ? (page - 1) * pageSize + 1 : 0}–
          {Math.min(page * pageSize, total)}
        </strong>{" "}
        of <strong className="text-slate-700">{total}</strong>
      </p>
      <div className="flex items-center gap-2">
        <button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={secondaryClass}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2">
          {page} / {pages}
        </span>
        <button
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className={secondaryClass}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  open,
  title,
  description,
  busy,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const d = ref.current;
    if (!d) return;
    d.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d.close();
      document.body.style.overflow = before;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (busy || e.target !== e.currentTarget) return;
        const b = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < b.left ||
          e.clientX > b.right ||
          e.clientY < b.top ||
          e.clientY > b.bottom
        )
          onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white p-5">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>
        <button
          aria-label="Close dialog"
          type="button"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
          disabled={busy}
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
