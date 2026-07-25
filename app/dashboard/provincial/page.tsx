"use client";

import AttendanceOverview from "./components/AttendanceOverview";
import DashboardHeader from "./components/DashboardHeader";
import DashboardStats from "./components/DashboardStats";
import EventStatusOverview from "./components/EventStatusOverview";
import MunicipalityPreparation from "./components/MunicipalityPreparation";
import QuickActions from "./components/QuickActions";
import RecentEvents from "./components/RecentEvents";
import { useProvincialDashboard } from "./hooks/useProvincialDashboard";

export default function ProvincialDashboardPage() {
  const {
    profile,
    events,
    eventMunicipalities,
    loading,
    message,
    stats,
  } = useProvincialDashboard();

  return (
    <div className="space-y-6">
      <DashboardHeader profile={profile} />

      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {message}
        </div>
      )}

      <DashboardStats
        loading={loading}
        stats={stats}
      />

      <EventStatusOverview
        loading={loading}
        events={events}
      />

      <section className="grid gap-6 xl:grid-cols-3">
        <RecentEvents
          loading={loading}
          events={events}
          eventMunicipalities={eventMunicipalities}
        />

        <div className="space-y-6">
          <QuickActions />

          <AttendanceOverview
            loading={loading}
            stats={stats}
          />
        </div>
      </section>

      <MunicipalityPreparation
        loading={loading}
        events={events}
        eventMunicipalities={eventMunicipalities}
      />
    </div>
  );
}