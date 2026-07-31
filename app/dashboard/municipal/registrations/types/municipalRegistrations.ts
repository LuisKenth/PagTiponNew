export type RegistrationStatusFilter =
  | "all"
  | "registered"
  | "pending";

export type MunicipalRegistration = {
  rsvp_id: string;
  event_municipality_id: string;
  event_id: string;
  event_title: string;
  event_status: string | null;
  municipal_status: string | null;
  registration_open: boolean;
  participant_id: string;
  participant_name: string;
  participant_email: string;
  participant_municipality: string | null;
  rsvp_status: string | null;
  registered_at: string | null;
  qr_available: boolean;
};

export type RegistrationEventOption = {
  event_municipality_id: string;
  event_id: string;
  event_title: string;
  event_status: string | null;
  municipal_status: string | null;
  registration_open: boolean;
  registration_count: number;
};
