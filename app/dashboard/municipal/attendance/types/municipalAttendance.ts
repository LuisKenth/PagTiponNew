export type AttendanceStatus =
  | "pending"
  | "present"
  | "absent"
  | "late";

export type AttendanceMethod =
  | "qr"
  | "manual";

export type AttendanceStatusFilter =
  | "all"
  | AttendanceStatus;

export type AttendanceMethodFilter =
  | "all"
  | AttendanceMethod
  | "not_checked_in";

export type MunicipalAttendanceRecord = {
  rsvp_id: string;
  event_municipality_id: string;
  event_id: string;
  event_title: string;
  event_status: string;
  event_start_date: string | null;
  event_end_date: string | null;
  municipality: string;
  municipal_status: string;
  registration_open: boolean;

  participant_id: string;
  participant_name: string;
  participant_email: string;
  participant_municipality: string | null;

  registration_status: string;
  registered_at: string | null;

  attendance_id: string | null;
  attendance_status: AttendanceStatus;
  attendance_method: AttendanceMethod | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  checked_in_by_name: string | null;
};

export type AttendanceEventOption = {
  event_municipality_id: string;
  event_id: string;
  event_title: string;
  event_status: string;
  event_start_date: string | null;
  event_end_date: string | null;
  municipal_status: string;
  registration_open: boolean;
};

export type AttendanceSummary = {
  total: number;
  present: number;
  late: number;
  absent: number;
  pending: number;
  qrCheckIns: number;
  manualCheckIns: number;
};
