export function canEditMunicipalEvent(
  status: string,
  startAt: string | null,
  now: number,
) {
  return (
    status === "draft" ||
    (["published", "upcoming"].includes(status) &&
      startAt !== null &&
      Date.parse(startAt) > now)
  );
}
