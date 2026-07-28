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

export type ReceivedEvent = {
  id: string;
  event_id: string;
  municipality: string | null;
  municipal_status: PreparationStatus | null;
  registration_open: boolean | null;
  local_instructions: string | null;
  created_at: string | null;
  event: EventRow | null;
};

export type MunicipalDashboardSummary = {
  received: number;
  pending: number;
  preparing: number;
  prepared: number;
  registrationOpen: number;
};
