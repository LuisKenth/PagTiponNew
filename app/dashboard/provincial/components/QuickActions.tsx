import Link from "next/link";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: string;
  iconStyle: string;
};

const quickActions: QuickAction[] = [
  {
    title: "Create Event",
    description:
      "Create a new provincial event and assign target municipalities.",
    href: "/dashboard/provincial/events/create",
    icon: "+",
    iconStyle: "bg-blue-50 text-blue-700",
  },
  {
    title: "Manage Events",
    description:
      "View, edit, publish, or manage existing provincial events.",
    href: "/dashboard/provincial/events",
    icon: "E",
    iconStyle: "bg-violet-50 text-violet-700",
  },
  {
    title: "Official Memos",
    description:
      "Review official memos attached to provincial events.",
    href: "/dashboard/provincial/memos",
    icon: "M",
    iconStyle: "bg-amber-50 text-amber-700",
  },
  {
    title: "Municipalities",
    description:
      "Monitor municipality preparation and registration readiness.",
    href: "/dashboard/provincial/municipalities",
    icon: "P",
    iconStyle: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Reports",
    description:
      "View attendance and municipality participation reports.",
    href: "/dashboard/provincial/reports",
    icon: "R",
    iconStyle: "bg-cyan-50 text-cyan-700",
  },
  {
    title: "Notifications",
    description:
      "Review provincial event updates and system notifications.",
    href: "/dashboard/provincial/notifications",
    icon: "N",
    iconStyle: "bg-rose-50 text-rose-700",
  },
];

export default function QuickActions() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* HEADER */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          Quick Actions
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Access frequently used provincial administration tools.
        </p>
      </div>

      {/* ACTIONS */}
      <div className="mt-5 space-y-3">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group flex items-start gap-4 rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
          >
            {/* ICON */}
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${action.iconStyle}`}
            >
              {action.icon}
            </div>

            {/* TEXT */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">
                  {action.title}
                </p>

                <span className="text-sm font-semibold text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700">
                  →
                </span>
              </div>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                {action.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}