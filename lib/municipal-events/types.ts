export type MunicipalEvent = {
  certificates_enabled: boolean;
  id: string;
  title: string;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string;
  owner_municipality: string;
  created_by: string;
  updated_at: string;
  audience_type: "all" | "categories" | null;
  audience_categories: string[];
  audience_category_other: string | null;
  memo_url: string | null;
  memo_filename: string | null;
  municipal_approval_recorded_at: string | null;
  event_municipalities: {
    id: string;
    local_venue_id: string | null;
    local_instructions: string | null;
    registration_open: boolean;
    municipal_status: string;
  }[];
};
export type EventVenue = {
  id: string;
  venue_name: string;
  capacity: number;
  status: string;
};
export type EventPayload = {
  certificates_enabled?: boolean;
  action: "draft" | "published" | "cancelled";
  title: string;
  description: string;
  start_at: string | null;
  end_at: string | null;
  audience_type: "all" | "categories" | null;
  audience_categories: string[];
  audience_category_other: string;
  venue_id: string;
  local_instructions: string;
  approval_confirmed: boolean;
};
