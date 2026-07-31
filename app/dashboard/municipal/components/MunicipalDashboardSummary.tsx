import {
  CalendarDays,
  CheckCircle2,
  ClipboardClock,
  LoaderCircle,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";

import type {
  MunicipalDashboardSummary as Summary,
} from "../types/municipalDashboard";

type MunicipalDashboardSummaryProps = {
  summary: Summary;
};

type SummaryCard = {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  accentClass: string;
  progressClass: string;
  showProgress?: boolean;
};

export default function MunicipalDashboardSummary({
  summary,
}: MunicipalDashboardSummaryProps) {
  const totalReceived = Math.max(
    summary.received,
    0,
  );

  const getPercentage = (value: number) => {
    if (totalReceived === 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (value / totalReceived) * 100,
      ),
    );
  };

  const cards: SummaryCard[] = [
    {
      label: "Received Events",
      value: summary.received,
      description:
        "Total provincial events received",
      icon: CalendarDays,
      iconClass:
        "bg-slate-100 text-slate-700",
      accentClass: "bg-slate-700",
      progressClass: "bg-slate-700",
    },
    {
      label: "Pending",
      value: summary.pending,
      description:
        "Preparation has not started",
      icon: ClipboardClock,
      iconClass:
        "bg-amber-100 text-amber-700",
      accentClass: "bg-amber-500",
      progressClass: "bg-amber-500",
      showProgress: true,
    },
    {
      label: "Preparing",
      value: summary.preparing,
      description:
        "Local preparation is in progress",
      icon: LoaderCircle,
      iconClass:
        "bg-blue-100 text-blue-700",
      accentClass: "bg-blue-500",
      progressClass: "bg-blue-500",
      showProgress: true,
    },
    {
      label: "Prepared",
      value: summary.prepared,
      description:
        "Municipality is ready for the event",
      icon: CheckCircle2,
      iconClass:
        "bg-emerald-100 text-emerald-700",
      accentClass: "bg-emerald-500",
      progressClass: "bg-emerald-500",
      showProgress: true,
    },
    {
      label: "Registration Open",
      value: summary.registrationOpen,
      description:
        "Events accepting participant registration",
      icon: UserRoundCheck,
      iconClass:
        "bg-violet-100 text-violet-700",
      accentClass: "bg-violet-500",
      progressClass: "bg-violet-500",
      showProgress: true,
    },
  ];

  return (
    <section aria-labelledby="municipal-summary-heading">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2
            id="municipal-summary-heading"
            className="text-base font-bold text-slate-900"
          >
            Event Overview
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            Current status of received municipal
            event assignments.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;

          const percentage =
            getPercentage(card.value);

          return (
            <article
              key={card.label}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 ${card.accentClass}`}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-500">
                    {card.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                </div>

                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">
                {card.description}
              </p>

              {card.showProgress && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-medium">
                    <span className="text-slate-400">
                      Share of received events
                    </span>

                    <span className="text-slate-600">
                      {percentage}%
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${card.progressClass}`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {!card.showProgress && (
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />

                  Provincial assignments
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}