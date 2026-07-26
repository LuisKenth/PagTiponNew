"use client";

import AttendanceOverview from "./components/AttendanceOverview";
import DashboardHeader from "./components/DashboardHeader";
import DashboardStats from "./components/DashboardStats";
import EventStatusOverview from "./components/EventStatusOverview";
import ImportantAlerts from "./components/ImportantAlerts";
import MunicipalityPreparation from "./components/MunicipalityPreparation";
import QuickActions from "./components/QuickActions";
import RecentEvents from "./components/RecentEvents";
import { useProvincialDashboard } from "./hooks/useProvincialDashboard";

export default function ProvincialDashboardPage() {
  const {
    profile,
    events,
    eventMunicipalities,
    rsvps,
    loading,
    message,
    stats,
  } = useProvincialDashboard();

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 overflow-x-hidden pb-8 sm:space-y-6">
      {/* HEADER */}
      <DashboardHeader profile={profile} />

      {/* ERROR MESSAGE */}
      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {message}
        </div>
      )}

      {/* STATISTICS */}
      <DashboardStats
        loading={loading}
        stats={stats}
      />

      {/* EVENT STATUS */}
      <EventStatusOverview
        loading={loading}
        events={events}
      />

      {/* IMPORTANT ALERTS */}
      <ImportantAlerts
        loading={loading}
        events={events}
        eventMunicipalities={eventMunicipalities}
        rsvps={rsvps}
      />

      {/* RECENT EVENTS */}
      <RecentEvents
        loading={loading}
        events={events}
        eventMunicipalities={eventMunicipalities}
      />

      {/* QUICK ACTIONS + ATTENDANCE */}
      <section className="grid min-w-0 gap-5 lg:grid-cols-2 sm:gap-6">
        <QuickActions />

        <AttendanceOverview
          loading={loading}
          stats={stats}
        />
      </section>

      {/* MUNICIPALITY PREPARATION */}
      <MunicipalityPreparation
        loading={loading}
        events={events}
        eventMunicipalities={eventMunicipalities}
      />
    </div>
  );
}