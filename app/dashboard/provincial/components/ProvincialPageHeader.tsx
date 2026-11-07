import type { ReactNode } from "react";

export const provincialHeaderButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50";
export const provincialHeaderPrimaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-500 bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  icon: ReactNode;
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
};

export default function ProvincialPageHeader({
  icon,
  eyebrow,
  title,
  description,
  actions,
  footer,
}: Props) {
  return (
    <header
      className="min-w-0 rounded-2xl border p-5 shadow-sm sm:p-7"
      style={{ backgroundColor: "#172554", borderColor: "#1E3A8A" }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "20px",
          minWidth: 0,
        }}
      >
        <div style={{ flex: "1 1 420px", minWidth: 0 }}>
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: "#263869", color: "#FFFFFF" }}
            >
              {icon}
            </span>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#BFDBFE" }}
            >
              {eyebrow}
            </span>
          </div>
          <h1
            className="mt-4 break-words text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: "#FFFFFF", overflowWrap: "break-word" }}
          >
            {title}
          </h1>
          <div
            className="mt-2 max-w-3xl break-words text-sm leading-6"
            style={{ color: "#E2E8F0", overflowWrap: "break-word" }}
          >
            {description}
          </div>
        </div>
        {actions && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "8px",
              flex: "0 1 auto",
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            {actions}
          </div>
        )}
      </div>
      {footer && (
        <div
          className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4 text-xs leading-5"
          style={{ color: "#CBD5E1" }}
        >
          {footer}
        </div>
      )}
    </header>
  );
}
