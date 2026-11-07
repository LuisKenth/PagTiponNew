export const ACTIVITY_ACTIONS = {
  municipal_admin_created: "Municipal Admin created",
  municipal_admin_activated: "Municipal Admin activated",
  municipal_admin_deactivated: "Municipal Admin deactivated",
  municipal_admin_deleted: "Municipal Admin deleted",
  draft_saved: "Draft saved",
  event_published: "Event published",
  event_updated: "Event updated",
  event_cancelled: "Event cancelled",
  event_status_changed: "Event status changed",
  event_deleted: "Event deleted",
  event_municipality_added: "Municipality added to event",
  event_municipality_removed: "Municipality removed from event",
  memo_uploaded: "Memo uploaded",
  memo_replaced: "Memo replaced",
  memo_deleted: "Memo deleted",
} as const;
export const ACTIVITY_CATEGORIES = {
  municipal_admin: "Municipal Admins",
  event: "Events",
  memo: "Official Memos",
} as const;
export type ActivityEntry = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_email: string | null;
  category: keyof typeof ACTIVITY_CATEGORIES;
  action: keyof typeof ACTIVITY_ACTIONS;
  target_id: string;
  target_name: string;
  municipality: string | null;
  event_id: string | null;
  event_title: string | null;
  details: Record<string, unknown>;
  created_at: string;
};
export type ActivityResult = {
  entries: ActivityEntry[];
  total: number;
  page: number;
  pageSize: number;
};
export function activityDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}
export function philippineDateBoundary(value: string, endExclusive = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Use a valid date in YYYY-MM-DD format.");
  const calendar = new Date(value + "T00:00:00Z");
  if (
    Number.isNaN(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== value
  )
    throw new Error("Use a valid calendar date.");
  const date = new Date(value + "T00:00:00+08:00");
  return new Date(date.getTime() + (endExclusive ? 86400000 : 0)).toISOString();
}
