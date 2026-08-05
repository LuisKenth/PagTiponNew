"use client";

import NotificationFilters from "./components/NotificationFilters";
import NotificationList from "./components/NotificationList";
import NotificationSummaryCards from "./components/NotificationSummaryCards";
import NotificationsHeader from "./components/NotificationsHeader";
import { useParticipantNotifications } from "./hooks/useParticipantNotifications";

export default function ParticipantNotificationsPage() {
    const notifications =
        useParticipantNotifications();

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <NotificationsHeader
                    unreadCount={
                        notifications.counts.unread
                    }
                    refreshing={
                        notifications.refreshing
                    }
                    markingAllRead={
                        notifications.markingAllRead
                    }
                    onRefresh={
                        notifications.refresh
                    }
                    onMarkAllRead={
                        notifications.markAllAsRead
                    }
                />

                <NotificationSummaryCards
                    loading={notifications.loading}
                    counts={notifications.counts}
                />

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <NotificationFilters
                        filters={notifications.filters}
                        activeFilter={
                            notifications.activeFilter
                        }
                        onChange={
                            notifications.setActiveFilter
                        }
                    />

                    <NotificationList
                        loading={notifications.loading}
                        errorMessage={
                            notifications.errorMessage
                        }
                        allCount={
                            notifications.items.length
                        }
                        notifications={
                            notifications.filteredItems
                        }
                        actionNotificationId={
                            notifications.actionNotificationId
                        }
                        onOpen={
                            notifications.openNotification
                        }
                        onMarkAsRead={
                            notifications.markAsRead
                        }
                        onDelete={
                            notifications.deleteNotification
                        }
                        onRetry={notifications.reload}
                    />
                </section>
            </div>
        </main>
    );
}
