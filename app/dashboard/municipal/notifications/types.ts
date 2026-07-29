export type MunicipalNotificationId = string | number;

export type MunicipalNotificationFilter =
  | "all"
  | "unread"
  | "invitations"
  | "updates"
  | "cancellations"
  | "reminders"
  | "system";

export type MunicipalNotificationType =
  | "event_invitation"
  | "event_reminder"
  | "event_updated"
  | "event_cancelled"
  | "system"
  | "municipal_preparation_update";

export type MunicipalNotificationRecord = {
  id: MunicipalNotificationId;
  user_id: string | null;
  event_id: string | null;
  event_municipality_id: string | null;
  type: MunicipalNotificationType | string | null;
  title: string | null;
  message: string;
  read: boolean;
  created_at: string;
};

export type MunicipalNotification =
  MunicipalNotificationRecord & {
    eventTitle?: string | null;
  };