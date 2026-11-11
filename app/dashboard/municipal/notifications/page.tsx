"use client";
import MunicipalNotificationFilters from "./components/MunicipalNotificationFilters";
import MunicipalNotificationList from "./components/MunicipalNotificationList";
import MunicipalNotificationsHeader from "./components/MunicipalNotificationsHeader";

import { useMunicipalNotifications } from "./hooks/useMunicipalNotifications";

export default function MunicipalNotificationsPage() {
  const {
    notifications,
    filteredNotifications,
    activeFilter,
    setActiveFilter,
    unreadCount,
    loading,
    refreshing,
    markingAll,
    updatingId,
    deletingId,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    openNotification,
  } = useMunicipalNotifications();

  return (
    <div className="space-y-6">
      <MunicipalNotificationsHeader
          unreadCount={unreadCount}
          refreshing={refreshing}
          markingAll={markingAll}
          onRefresh={refreshNotifications}
          onMarkAllAsRead={markAllAsRead}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Notification Filters */}
        <MunicipalNotificationFilters
          activeFilter={activeFilter}
          unreadCount={unreadCount}
          onFilterChange={setActiveFilter}
        />

        {/* Notification List */}
        <MunicipalNotificationList
          notifications={filteredNotifications}
          totalNotifications={notifications.length}
          activeFilter={activeFilter}
          loading={loading}
          error={error}
          updatingId={updatingId}
          deletingId={deletingId}
          onOpen={openNotification}
          onMarkAsRead={markAsRead}
          onDelete={deleteNotification}
        />
      </section>
    </div>
  );
}
