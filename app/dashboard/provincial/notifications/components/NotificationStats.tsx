type NotificationStatsProps = {
  totalCount: number;
  unreadCount: number;
};

export default function NotificationStats({
  totalCount,
  unreadCount,
}: NotificationStatsProps) {
  const readCount = totalCount - unreadCount;

  return (
    <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-500">
          Total Notifications
        </p>

        <p className="mt-2 text-2xl font-bold text-slate-900">
          {totalCount}
        </p>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-700">
          Unread Notifications
        </p>

        <p className="mt-2 text-2xl font-bold text-blue-900">
          {unreadCount}
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2 lg:col-span-1">
        <p className="text-sm font-medium text-emerald-700">
          Read Notifications
        </p>

        <p className="mt-2 text-2xl font-bold text-emerald-900">
          {readCount}
        </p>
      </div>
    </div>
  );
}
