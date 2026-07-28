import type { MunicipalDashboardSummary as Summary } from "../types/municipalDashboard";

type MunicipalDashboardSummaryProps = {
  summary: Summary;
};

export default function MunicipalDashboardSummary({
  summary,
}: MunicipalDashboardSummaryProps) {
  const cards = [
    {
      label: "Received Events",
      value: summary.received,
      valueClass: "text-slate-900",
      description: "Total provincial events received",
    },
    {
      label: "Pending",
      value: summary.pending,
      valueClass: "text-amber-700",
      description: "Preparation has not started",
    },
    {
      label: "Preparing",
      value: summary.preparing,
      valueClass: "text-blue-700",
      description: "Municipality is working on preparation",
    },
    {
      label: "Prepared",
      value: summary.prepared,
      valueClass: "text-green-700",
      description: "Municipality is ready for the event",
    },
    {
      label: "Registration Open",
      value: summary.registrationOpen,
      valueClass: "text-slate-900",
      description: "Events accepting participant registration",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          <p className="text-sm text-slate-500">
            {card.label}
          </p>

          <h2 className={`mt-2 text-2xl font-bold ${card.valueClass}`}>
            {card.value}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {card.description}
          </p>
        </div>
      ))}
    </div>
  );
}
