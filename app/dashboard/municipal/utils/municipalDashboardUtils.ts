import type {
  MunicipalDashboardSummary,
  PreparationStatus,
  ReceivedEvent,
} from "../types/municipalDashboard";

export function normalizePreparationStatus(
  value: string | null | undefined
): PreparationStatus {
  const normalizedValue = value
    ?.trim()
    .toLowerCase()
    .replaceAll(" ", "_");

  if (normalizedValue === "prepared") {
    return "prepared";
  }

  if (
    normalizedValue === "preparing" ||
    normalizedValue === "in_progress"
  ) {
    return "preparing";
  }

  return "pending";
}

export function getPreparationStatusLabel(
  status: PreparationStatus
) {
  if (status === "prepared") {
    return "Prepared";
  }

  if (status === "preparing") {
    return "Preparing";
  }

  return "Pending";
}

export function getPreparationButtonLabel(
  status: string | null | undefined
) {
  const normalizedStatus = normalizePreparationStatus(status);

  if (normalizedStatus === "prepared") {
    return "Update Preparation";
  }

  if (normalizedStatus === "preparing") {
    return "Continue Preparation";
  }

  return "Start Preparation";
}

export function getPreparationStatusClass(
  status: string | null | undefined
) {
  const normalizedStatus = normalizePreparationStatus(status);

  if (normalizedStatus === "prepared") {
    return "bg-green-100 text-green-700";
  }

  if (normalizedStatus === "preparing") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-amber-100 text-amber-700";
}

export function formatDateTime(
  dateValue: string | null | undefined
) {
  if (!dateValue) {
    return "Not set";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getMunicipalDashboardSummary(
  events: ReceivedEvent[]
): MunicipalDashboardSummary {
  return {
    received: events.length,
    pending: events.filter(
      (item) =>
        normalizePreparationStatus(item.municipal_status) === "pending"
    ).length,
    preparing: events.filter(
      (item) =>
        normalizePreparationStatus(item.municipal_status) === "preparing"
    ).length,
    prepared: events.filter(
      (item) =>
        normalizePreparationStatus(item.municipal_status) === "prepared"
    ).length,
    registrationOpen: events.filter(
      (item) =>
        item.registration_open === true &&
        normalizePreparationStatus(item.municipal_status) === "prepared"
    ).length,
  };
}
