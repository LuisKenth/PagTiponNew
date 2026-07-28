export type MunicipalNotificationId = string | number;

export type MunicipalNotificationFilter =
  | "all"
  | "unread"
  | "invitations"
  | "reminders"
  | "system";

export type MunicipalNotificationRecord = {
  id: MunicipalNotificationId;
  user_id: string | null;
  event_id: string | null;
  event_municipality_id: string | null;
  type: string | null;
  title: string | null;
  message: string;
  read: boolean;
  created_at: string;
};

export type MunicipalNotification =
  MunicipalNotificationRecord & {
    eventTitle?: string | null;
  };
