export type NotificationRow = {
    id: string;
    user_id: string;
    type: string | null;
    title: string;
    message: string;
    read: boolean;
    event_id: string | null;
    event_municipality_id: string | null;
    created_at: string;
};

export type NotificationFilter =
    | "all"
    | "unread"
    | "registrations"
    | "event_updates"
    | "cancellations"
    | "attendance";

export type NotificationCounts = {
    total: number;
    unread: number;
    registrations: number;
    eventUpdates: number;
    cancellations: number;
    attendance: number;
};

export type NotificationFilterOption = {
    value: NotificationFilter;
    label: string;
    count: number;
};
