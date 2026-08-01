type AttendanceSummaryCardsProps = {
  totalRecords: number;
  totalPresent: number;
  selectedEventTitle: string | null;
};

export default function AttendanceSummaryCards({
  totalRecords,
  totalPresent,
  selectedEventTitle,
}: AttendanceSummaryCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <SummaryCard label="Total Records" value={String(totalRecords)} />
      <SummaryCard label="Present" value={String(totalPresent)} />
      <SummaryCard
        label="Selected Event"
        value={selectedEventTitle || "No event selected"}
        compact
      />
    </section>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  compact?: boolean;
};

function SummaryCard({ label, value, compact = false }: SummaryCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <h2
        className={`mt-2 font-bold text-slate-900 ${
          compact ? "line-clamp-2 text-base" : "text-2xl"
        }`}
      >
        {value}
      </h2>
    </div>
  );
}
