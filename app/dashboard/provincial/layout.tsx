import ProvincialSidebar from "./components/ProvincialSidebar";

export default function ProvincialDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <ProvincialSidebar />

      <main className="min-h-screen flex-1 p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}