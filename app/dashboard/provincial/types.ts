export type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  municipality: string | null;
};

export type EventRow = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  status?: string | null;
  created_by?: string | null;
  [key: string]: unknown;
};

export type EventMunicipalityRow = {
  id?: string | number;
  event_id?: string | number | null;
  municipality?: string | null;
  status?: string | null;
  registration_status?: string | null;
  [key: string]: unknown;
};

export type RSVPRow = {
  id?: string | number;
  event_municipality_id?: string | number | null;
  user_id?: string | null;
  qr_token?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

export type AttendanceRow = {
  id?: string | number;
  rsvp_id?: string | number | null;
  status?: string | null;
  checked_in_at?: string | null;
  [key: string]: unknown;
};

export type ProvincialDashboardStats = {
  totalEvents: number;
  upcomingEvents: number;
  activeMunicipalities: number;
  totalTargetMunicipalities: number;
  preparedMunicipalities: number;
  openRegistrations: number;
  totalRegistrations: number;
  presentAttendance: number;
  attendanceRate: number;
};