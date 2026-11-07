export const MUNICIPAL_ADMIN_LIMIT = 2;
export const MUNICIPAL_ADMIN_LIMIT_MESSAGE =
  "Maximum 2 approved Municipal Admins are allowed for this municipality.";
export function municipalityAdminCount(
  admins: { municipality: string | null }[],
  municipality: string,
) {
  const key = municipality.trim().toLowerCase();
  return admins.filter(
    (admin) => (admin.municipality || "").trim().toLowerCase() === key,
  ).length;
}
