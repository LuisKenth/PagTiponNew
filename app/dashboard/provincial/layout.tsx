import ProvincialSidebar from "./components/ProvincialSidebar";

export default function ProvincialDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <ProvincialSidebar />

      <div className="min-w-0">
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 xl:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}