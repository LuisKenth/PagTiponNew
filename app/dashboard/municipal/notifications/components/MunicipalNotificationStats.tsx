import {
  BellRing,
  CheckCheck,
  Mail,
} from "lucide-react";

type MunicipalNotificationStatsProps = {
  totalCount: number;
  unreadCount: number;
};

export default function MunicipalNotificationStats({
  totalCount,
  unreadCount,
}: MunicipalNotificationStatsProps) {
  const readCount = Math.max(
    0,
    totalCount - unreadCount,
  );

  const stats = [
    {
      label: "Total Notifications",
      value: totalCount,
      icon: BellRing,
      cardClass:
        "border-slate-200 bg-slate-50",
      iconClass:
        "bg-white text-slate-700 ring-slate-200",
      labelClass: "text-slate-500",
      valueClass: "text-slate-900",
    },
    {
      label: "Unread Notifications",
      value: unreadCount,
      icon: Mail,
      cardClass:
        "border-blue-200 bg-blue-50",
      iconClass:
        "bg-white text-blue-700 ring-blue-200",
      labelClass: "text-blue-700",
      valueClass: "text-blue-900",
    },
    {
      label: "Read Notifications",
      value: readCount,
      icon: CheckCheck,
      cardClass:
        "border-emerald-200 bg-emerald-50",
      iconClass:
        "bg-white text-emerald-700 ring-emerald-200",
      labelClass: "text-emerald-700",
      valueClass: "text-emerald-900",
    },
  ];

  return (
    <div
      className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3"
      aria-label="Notification summary"
    >
      {stats.map((stat, index) => {
        const StatIcon = stat.icon;

        return (
          <div
            key={stat.label}
            className={`rounded-2xl border p-4 ${
              index === 2
                ? "sm:col-span-2 lg:col-span-1"
                : ""
            } ${stat.cardClass}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${stat.labelClass}`}
                >
                  {stat.label}
                </p>

                <p
                  className={`mt-1 text-2xl font-bold ${stat.valueClass}`}
                >
                  {stat.value}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ${stat.iconClass}`}
                aria-hidden="true"
              >
                <StatIcon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}