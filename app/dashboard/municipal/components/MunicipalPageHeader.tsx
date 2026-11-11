import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Shared presentation only: leaves each page's actions and data untouched. */
type MunicipalPageHeaderProps = {
  title: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  footer?: ReactNode;
  children?: ReactNode;
  id?: string;
};

export default function MunicipalPageHeader({
  title,
  description,
  icon,
  eyebrow = "Municipal Administration",
  actions,
  backHref,
  backLabel = "Back to Dashboard",
  footer,
  children,
  id,
}: MunicipalPageHeaderProps) {
  return (
    <header
      aria-labelledby={id}
      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 border-t-4 border-t-indigo-600 bg-white shadow-sm"
    >
      <div className="p-5 sm:p-6">
        {backHref && (
          <Link
            href={backHref}
            className="mb-4 inline-flex min-h-8 items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
        )}
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                {eyebrow}
              </p>
              <h1 id={id} className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {title}
              </h1>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {description}
              </div>
            </div>
          </div>
          {actions && (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto">
              {actions}
            </div>
          )}
        </div>
      </div>
      {footer && (
        <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-sm text-slate-600 sm:px-6">
          {footer}
        </div>
      )}
      {children}
    </header>
  );
}
