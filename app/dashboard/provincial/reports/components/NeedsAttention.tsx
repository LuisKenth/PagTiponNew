"use client";

import { useMemo } from "react";
import type { MunicipalityReport } from "../types";

type NeedsAttentionProps = {
  reports: MunicipalityReport[];
  loading: boolean;
};

type AttentionItem = {
  municipality: string;
  issues: string[];
  priority: "high" | "medium";
};

export default function NeedsAttention({
  reports,
  loading,
}: NeedsAttentionProps) {
  const attentionItems = useMemo<AttentionItem[]>(() => {
    return reports
      .map((report) => {
        const issues: string[] = [];

        // 1. Municipality still has unprepared event assignments
        if (report.preparationRate < 100) {
          const pendingCount =
            report.eventsReceived - report.prepared;

          issues.push(
            `${pendingCount} ${
              pendingCount === 1 ? "event" : "events"
            } still pending preparation`
          );
        }

        // 2. No participant registrations
        if (report.registrations === 0) {
          issues.push("No participant registrations yet");
        }

        // 3. Low attendance
        if (
          report.registrations > 0 &&
          report.attendanceRate < 50
        ) {
          issues.push(
            `Low attendance rate (${report.attendanceRate}%)`
          );
        }

        if (issues.length === 0) {
          return null;
        }

        return {
          municipality: report.municipality,
          issues,
          priority:
            issues.length >= 2 ? "high" : "medium",
        } satisfies AttentionItem;
      })
      .filter(
        (item): item is AttentionItem => item !== null
      )
      .sort((a, b) => {
        if (
          a.priority === "high" &&
          b.priority !== "high"
        ) {
          return -1;
        }

        if (
          a.priority !== "high" &&
          b.priority === "high"
        ) {
          return 1;
        }

        return b.issues.length - a.issues.length;
      });
  }, [reports]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Needs Attention
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Municipalities that may require follow-up based
            on preparation, registration, or attendance.
          </p>
        </div>

        {!loading && attentionItems.length > 0 && (
          <span className="w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            {attentionItems.length}{" "}
            {attentionItems.length === 1
              ? "municipality"
              : "municipalities"}
          </span>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Checking municipality status...
        </p>
      ) : reports.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="font-semibold text-slate-900">
            No municipality data available
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Try changing or resetting the selected report
            filters.
          </p>
        </div>
      ) : attentionItems.length === 0 ? (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">
          <p className="font-semibold text-green-800">
            All municipalities are on track
          </p>

          <p className="mt-1 text-sm text-green-700">
            No preparation, registration, or attendance
            issues were detected.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {attentionItems.map((item) => (
            <div
              key={item.municipality}
              className={`rounded-xl border p-4 ${
                item.priority === "high"
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {item.municipality}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.priority === "high"
                        ? "High Priority"
                        : "Needs Review"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {item.issues.map((issue) => (
                      <div
                        key={issue}
                        className="flex items-start gap-2"
                      >
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                            item.priority === "high"
                              ? "bg-red-500"
                              : "bg-amber-500"
                          }`}
                        />

                        <p className="text-sm text-slate-700">
                          {issue}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <span className="text-xs font-medium text-slate-500">
                  {item.issues.length}{" "}
                  {item.issues.length === 1
                    ? "issue"
                    : "issues"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}