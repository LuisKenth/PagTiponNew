export type PreparationStatus =
  | "pending"
  | "preparing"
  | "prepared";

export type EventRow = {
  id: string;
  title: string | null;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  memo_url: string | null;
  memo_filename: string | null;
  status: string | null;
  created_at: string | null;
};

export type MunicipalVenue = {
  id: string;
  venue_name: string;
  municipality: string | null;
  capacity: number | null;
};

export type ReceivedEvent = {
  id: string;
  event_id: string;
  municipality: string | null;
  municipal_status: PreparationStatus | null;

  /*
   * Municipal venue assigned specifically
   * to this event_municipalities record.
   */
  local_venue_id: string | null;

  registration_open: boolean | null;
  local_instructions: string | null;
  created_at: string | null;
  registered_participants: number;

  event: EventRow | null;
};

export type MunicipalDashboardSummary = {
  received: number;
  pending: number;
  preparing: number;
  prepared: number;
  registrationOpen: number;
};