import type { PreparationStatus } from "../../types/municipalDashboard";

export type StatusFilter =
  | "all"
  | PreparationStatus
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
