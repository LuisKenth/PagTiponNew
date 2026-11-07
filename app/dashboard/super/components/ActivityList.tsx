"use client";
import { Activity, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { auditActions, formatDate, type AuditEntry } from "@/lib/super/types";
export default function ActivityList({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length)
    return (
      <div className="py-10 text-center">
        <Activity className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">
          No account activity to display.
        </p>
      </div>
    );
  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((entry) => {
        const Icon =
          entry.action.includes("email") || entry.action.includes("recovery")
            ? Mail
            : entry.action === "account_created"
              ? UserPlus
              : ShieldCheck;
        return (
          <li key={entry.id} className="flex items-start gap-3 py-4">
            <span className="mt-0.5 rounded-xl bg-indigo-50 p-2.5 text-indigo-500">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">
                {auditActions[entry.action] ||
                  entry.action.replaceAll("_", " ")}
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                {entry.actor_name}{" "}
                <span className="mx-1 text-slate-300">→</span>{" "}
                {entry.target_name}
              </p>
              <time className="mt-1 block text-[11px] text-slate-400">
                {formatDate(entry.created_at)}
              </time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
