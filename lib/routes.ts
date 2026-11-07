export type UserRole =
  | "super_admin"
  | "provincial_admin"
  | "municipal_admin"
  | "event_staff"
  | "participant";

export function getDashboardPath(role: UserRole) {
  if (role === "super_admin") return "/dashboard/super";
  if (role === "provincial_admin") return "/dashboard/provincial";
  if (role === "municipal_admin") return "/dashboard/municipal";
  if (role === "event_staff") return "/dashboard/staff";
  return "/dashboard/participant";
}