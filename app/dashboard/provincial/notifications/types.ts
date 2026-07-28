export type NotificationId = number | string;

export type NotificationFilter =
  | "all"
  | "unread"
  | "events"
  | "municipalities"
  | "memos";

export type NotificationRecord = {
  id: NotificationId;
  user_id: string | null;
  type: string | null;
  message: string;
  read: boolean;
  event_id: number | null;
  created_at: string;
};

export type ProvincialNotification = NotificationRecord & {
  eventTitle?: string | null;
};
