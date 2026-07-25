export type DatabaseId = string | number;

export type EventRow = {
  id: DatabaseId;
  title: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  created_at: string | null;
};

export type EventMunicipalityRow = {
  id: DatabaseId;
  event_id: DatabaseId;
  municipality: string;
  municipal_status: string | null;
};

export type RsvpRow = {
  id: DatabaseId;
  event_municipality_id: DatabaseId;
  status: string | null;
};

export type AttendanceRow = {
  id: DatabaseId;
  rsvp_id: DatabaseId;
  status: string | null;
};

export type EventReport = {
  event: EventRow;
  municipalities: string[];
  registrations: number;
  present: number;
  absent: number;
  attendanceRate: number;
};

export type MunicipalityReport = {
  municipality: string;
  eventsReceived: number;
  prepared: number;
  preparationRate: number;
  registrations: number;
  present: number;
  attendanceRate: number;
};

export type EventStatusSummary = {
  draft: number;
  published: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
};

export type PreparedPendingSummary = {
  prepared: number;
  pending: number;
  preparedRate: number;
  pendingRate: number;
  total: number;
};
