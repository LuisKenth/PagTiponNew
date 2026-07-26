export type EventItem = {
  id: string;
  title: string | null;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  memo_url: string | null;
  memo_filename: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type EventMunicipality = {
  id: string;
  event_id: string;
  municipality: string;
  preparation_status?: string | null;
  memo_status?: string | null;
};

export type EventWithMunicipalities = EventItem & {
  municipalities: EventMunicipality[];
};

export type EventStatusFilter =
  | "all"
  | "draft"
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled";

  export type EventSortOption =
  | "newest"
  | "soonest"
  | "latest"
  | "title_asc";