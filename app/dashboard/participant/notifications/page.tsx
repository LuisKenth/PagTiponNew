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
                    loading={
                        notifications.loading
                    }
                    counts={
                        notifications.counts
                    }
                />

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <NotificationFilters
                        filters={
                            notifications.filters
                        }
                        activeFilter={
                            notifications.activeFilter
                        }
                        onChange={
                            notifications.setActiveFilter
                        }
                    />

                    <NotificationList
                        loading={
                            notifications.loading
                        }
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
                        onRetry={
                            notifications.reload
                        }
                    />

                    {!notifications.loading &&
                        !notifications.errorMessage &&
                        notifications.filteredCount >
                            0 && (
                            <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-500">
                                    Showing{" "}
                                    <span className="font-semibold text-slate-700">
                                        {
                                            notifications.firstVisibleItem
                                        }
                                    </span>
                                    {" - "}
                                    <span className="font-semibold text-slate-700">
                                        {
                                            notifications.lastVisibleItem
                                        }
                                    </span>{" "}
                                    of{" "}
                                    <span className="font-semibold text-slate-700">
                                        {
                                            notifications.filteredCount
                                        }
                                    </span>{" "}
                                    notifications
                                </p>

                                {notifications.totalPages >
                                    1 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                notifications.changePage(
                                                    notifications.currentPage -
                                                        1,
                                                )
                                            }
                                            disabled={
                                                notifications.currentPage ===
                                                1
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Previous
                                        </button>

                                        {Array.from(
                                            {
                                                length:
                                                    notifications.totalPages,
                                            },
                                            (
                                                _,
                                                index,
                                            ) => {
                                                const pageNumber =
                                                    index +
                                                    1;

                                                const selected =
                                                    notifications.currentPage ===
                                                    pageNumber;

                                                return (
                                                    <button
                                                        key={
                                                            pageNumber
                                                        }
                                                        type="button"
                                                        onClick={() =>
                                                            notifications.changePage(
                                                                pageNumber,
                                                            )
                                                        }
                                                        aria-current={
                                                            selected
                                                                ? "page"
                                                                : undefined
                                                        }
                                                        className={`min-w-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                                            selected
                                                                ? "bg-slate-950 text-white"
                                                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                        }`}
                                                    >
                                                        {
                                                            pageNumber
                                                        }
                                                    </button>
                                                );
                                            },
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                notifications.changePage(
                                                    notifications.currentPage +
                                                        1,
                                                )
                                            }
                                            disabled={
                                                notifications.currentPage ===
                                                notifications.totalPages
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                </section>
            </div>
        </main>
    );
}