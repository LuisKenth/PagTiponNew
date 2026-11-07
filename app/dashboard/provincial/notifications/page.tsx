"use client";

import NotificationFilters from "./components/NotificationFilters";
import NotificationList from "./components/NotificationList";
import NotificationStats from "./components/NotificationStats";
import NotificationsHeader from "./components/NotificationsHeader";
import { useProvincialNotifications } from "./hooks/useProvincialNotifications";

export default function ProvincialNotificationsPage() {
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
  } = useProvincialNotifications();

  return (
    <div className="space-y-6">
      <NotificationsHeader
        unreadCount={unreadCount}
        refreshing={refreshing}
        markingAll={markingAll}
        onRefresh={refreshNotifications}
        onMarkAllAsRead={markAllAsRead}
      />

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <NotificationStats
          totalCount={notifications.length}
          unreadCount={unreadCount}
        />
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <NotificationFilters
          activeFilter={activeFilter}
          unreadCount={unreadCount}
          onFilterChange={setActiveFilter}
        />

        <NotificationList
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
