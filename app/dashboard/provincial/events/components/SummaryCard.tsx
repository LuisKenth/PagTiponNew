type SummaryCardProps = {
  label: string;
  value: number;
  description: string;
  badgeClass: string;
};

export default function SummaryCard({
  label,
  value,
  description,
  badgeClass,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${badgeClass}`}
        >
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}
