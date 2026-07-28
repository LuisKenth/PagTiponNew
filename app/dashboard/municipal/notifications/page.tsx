"use client";

import MunicipalNotificationFilters from "./components/MunicipalNotificationFilters";
import MunicipalNotificationList from "./components/MunicipalNotificationList";
import MunicipalNotificationStats from "./components/MunicipalNotificationStats";
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
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <MunicipalNotificationsHeader
          unreadCount={unreadCount}
          refreshing={refreshing}
          markingAll={markingAll}
          onRefresh={refreshNotifications}
          onMarkAllAsRead={markAllAsRead}
        />

        <MunicipalNotificationStats
          totalCount={notifications.length}
          unreadCount={unreadCount}
        />
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <MunicipalNotificationFilters
          activeFilter={activeFilter}
          unreadCount={unreadCount}
          onFilterChange={setActiveFilter}
        />

        <MunicipalNotificationList
          notifications={filteredNotifications}
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
