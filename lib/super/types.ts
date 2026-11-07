export type SuperProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "super_admin";
  verification_status: string;
  created_at: string;
  pendingEmail: string | null;
  factorCount: number;
};
export type ProvincialAccount = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  full_name: string;
  email: string;
  verification_status: string;
  created_at: string;
};
export type AuditEntry = {
  id: string;
  actor_id: string | null;
  target_id: string;
  action: string;
  created_at: string;
  actor_name: string;
  target_name: string;
  details: Record<string, unknown>;
};
export type ProvincialCapacity = {
  activeCount: number;
  activeLimit: number;
  remaining: number;
};
export type AccountResult = {
  admins: ProvincialAccount[];
  total: number;
  page: number;
  pageSize: number;
  capacity: ProvincialCapacity | null;
};
export type AuditResult = {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
};
export type OverviewResult = {
  total: number;
  active: number;
  inactive: number;
  recentActivityCount: number;
  recent: AuditEntry[];
};
export const auditActions: Record<string, string> = {
  account_created: "Account created",
  account_activated: "Account activated",
  account_deactivated: "Account deactivated",
  account_deletion_requested: "Account deletion requested",
  account_deleted: "Inactive account deleted",
  recovery_requested: "Password reset requested",
  profile_email_changed: "Email synchronized",
  profile_name_changed: "Name updated",
  email_correction_requested: "Recovery email change requested",
  email_correction_completed: "Recovery email changed",
  email_correction_failed: "Recovery email change failed",
  email_correction_uncertain: "Email change needs review",
  password_change_requested: "Password change requested",
  authenticator_added: "Authenticator added",
  authenticator_removed: "Authenticator removed",
  authenticator_recovery_requested: "Authenticator recovery requested",
  password_changed: "Password changed",
  self_email_change_requested: "Own email change requested",
};
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
