export type StatusFilter =
  | "all"
  | "pending"
  | "preparing"
  | "prepared";

export type EventStatusFilter =
  | "all"
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled";

export type RegistrationFilter =
  | "all"
  | "open"
  | "closed";

export type SortOption =
  | "newest_received"
  | "oldest_received"
  | "schedule_soonest"
  | "schedule_latest"
  | "title_asc";