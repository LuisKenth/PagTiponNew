import Link from "next/link";

type MunicipalDashboardHeaderProps = {
  municipality: string;
};

export default function MunicipalDashboardHeader({
  municipality,
}: MunicipalDashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Municipal Dashboard
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Received provincial events and official memos for{" "}
          <span className="font-semibold text-slate-900">
            {municipality || "your municipality"}
          </span>
          .
        </p>
      </div>

      <Link
        href="/dashboard/municipal/venues"
        className="rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Manage Venues
      </Link>
    </div>
  );
}
