type StaffDashboardHeaderProps = {
  municipality: string;
};

export default function StaffDashboardHeader({
  municipality,
}: StaffDashboardHeaderProps) {
  return (
    <header className="rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Staff Dashboard</h1>

      <p className="mt-2 text-sm text-slate-600">
        Control event check-in, scan participant QR codes, and record
        attendance for{" "}
        <span className="font-semibold text-slate-900">
          {municipality || "your municipality"}
        </span>
        .
      </p>
    </header>
  );
}
