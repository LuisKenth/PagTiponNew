import type { MunicipalAdmin } from "../../types/municipality";

export type ProvincialEvent = {
  id: string;
  title: string | null;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string | null;
  created_at: string | null;
};

export type EventMunicipalityAssignment = {
  id: string;
  event_id: string;
  municipality: string | null;
  municipal_status: string | null;
};

export type MunicipalityEventItem = {
  id: string;
  event_id: string;
  municipality: string | null;
  preparation_status: string | null;
  event: ProvincialEvent | null;
};

export type MunicipalityDetailData = {
  municipalityName: string;
  admins: MunicipalAdmin[];
  events: MunicipalityEventItem[];
};