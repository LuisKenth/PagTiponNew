import { Bell } from "lucide-react";

export default function MunicipalNotificationsEmptyState() {
  return (
    <div className="flex min-h-72 items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Bell className="h-6 w-6 text-slate-500" />
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-900">
          No notifications found
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          There are currently no municipal notifications under
          the selected filter.
        </p>
      </div>
    </div>
  );
}
