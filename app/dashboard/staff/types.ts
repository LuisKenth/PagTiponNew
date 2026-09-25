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

  // Check-In control
  check_in_opened_at: string | null;
  check_in_closed_at: string | null;
  check_in_opened_by: string | null;
  check_in_closed_by: string | null;

  // Check-Out control
  check_out_opened_at: string | null;
  check_out_closed_at: string | null;
  check_out_opened_by: string | null;
  check_out_closed_by: string | null;

  event: EventDetails;
};

export type RawEventAssignment = {
  id: DatabaseId;
  event_id: DatabaseId;
  municipality: string;

  // Check-In control
  check_in_opened_at: string | null;
  check_in_closed_at: string | null;
  check_in_opened_by: string | null;
  check_in_closed_by: string | null;

  // Check-Out control
  check_out_opened_at: string | null;
  check_out_closed_at: string | null;
  check_out_opened_by: string | null;
  check_out_closed_by: string | null;

  events: EventDetails | EventDetails[] | null;
};

export type RSVP = {
  id: string;
  event_municipality_id: DatabaseId;
  user_id: string;
  municipality: string;

  qr_token: string | null;
  attendance_code?: string | null;

  status: string | null;
  registered_at: string | null;
};

export type AttendanceMethod =
  | "qr"
  | "manual";

export type AttendanceActionMode =
  | "check_in"
  | "check_out";

export type AttendanceRecord = {
  id: string;
  rsvp_id: string;
  event_municipality_id: DatabaseId;
  user_id: string;

  status: string | null;
  method: string | null;

  // Time In
  checked_in_at: string | null;
  checked_in_by: string | null;

  // Time Out
  checked_out_at: string | null;
  checked_out_by: string | null;

  participant_name?: string | null;
  participant_email?: string | null;
};

export type MessageTone =
  | "info"
  | "success"
  | "error";

export type DashboardMessage = {
  text: string;
  tone: MessageTone;
};

export type SupabaseErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

/**
 * Shared result returned by:
 *
 * open_event_check_in()
 * close_event_check_in()
 * open_event_check_out()
 * close_event_check_out()
 */
export type AttendanceControlRpcResult = {
  success?: boolean;

  already_open?: boolean;
  already_closed?: boolean;

  message?: string;

  opened_at?: string | null;
  closed_at?: string | null;
};

/**
 * Keep the old name so existing Check-In
 * code does not break.
 */
export type CheckInRpcResult =
  AttendanceControlRpcResult;

export type CheckOutRpcResult =
  AttendanceControlRpcResult;

/**
 * Result returned by:
 *
 * process_attendance_token()
 */
export type AttendanceCheckInTokenResult = {
  success: boolean;

  result_code: string;
  result_message: string;

  attendance_id: string | null;

  participant_id: string | null;
  participant_name: string | null;
  participant_email: string | null;

  event_title: string | null;

  attendance_status: string | null;
  attendance_checked_in_at: string | null;

  already_checked_in: boolean;
};

/**
 * Result returned by:
 *
 * process_attendance_check_out_token()
 */
export type AttendanceCheckOutTokenResult = {
  success: boolean;

  result_code: string;
  result_message: string;

  attendance_id: string | null;

  participant_id: string | null;
  participant_name: string | null;
  participant_email: string | null;

  event_title: string | null;

  attendance_status: string | null;

  attendance_checked_in_at: string | null;
  attendance_checked_out_at: string | null;

  already_checked_out: boolean;
};

/**
 * Result returned by:
 *
 * process_attendance_check_out()
 *
 * Kept for the attendance-id based fallback RPC.
 */
export type AttendanceCheckOutResult = {
  success: boolean;

  result_code: string;
  result_message: string;

  attendance_id: string | null;

  participant_id: string | null;
  participant_name: string | null;

  event_title: string | null;

  attendance_checked_in_at: string | null;
  attendance_checked_out_at: string | null;

  already_checked_out: boolean;
};