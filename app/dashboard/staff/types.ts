export type DatabaseId = number | string;

export type EventDetails = {
  id: DatabaseId;
  title: string;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
};

export type EventAssignment = {
  id: DatabaseId;
  event_id: DatabaseId;
  municipality: string;
  check_in_opened_at: string | null;
  check_in_closed_at: string | null;
  check_in_opened_by: string | null;
  check_in_closed_by: string | null;
  event: EventDetails;
};

export type RawEventAssignment = {
  id: DatabaseId;
  event_id: DatabaseId;
  municipality: string;
  check_in_opened_at: string | null;
  check_in_closed_at: string | null;
  check_in_opened_by: string | null;
  check_in_closed_by: string | null;
  events: EventDetails | EventDetails[] | null;
};

export type RSVP = {
  id: string;
  event_municipality_id: DatabaseId;
  user_id: string;
  municipality: string;
  qr_token: string | null;
  status: string | null;
  registered_at: string | null;
};

export type AttendanceMethod = "qr" | "manual";

export type AttendanceRecord = {
  id: string;
  rsvp_id: string;
  event_municipality_id: DatabaseId;
  user_id: string;
  status: string | null;
  method: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;

  participant_name?: string | null;
  participant_email?: string | null;
};

export type MessageTone = "info" | "success" | "error";

export type DashboardMessage = {
  text: string;
  tone: MessageTone;
};

export type SupabaseErrorLike = {
  message?: string | null;
  details?: string | null;
};

export type CheckInRpcResult = {
  success?: boolean;
  already_open?: boolean;
  already_closed?: boolean;
  message?: string;
  opened_at?: string;
  closed_at?: string;
};
