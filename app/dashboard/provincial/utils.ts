import type { EventRow } from "@/app/dashboard/provincial/types";

export function getEventStatus(
  event: EventRow,
  now: Date | null = null
) {
  const savedStatus = String(event.status || "").toLowerCase();

  // These statuses can be used directly.
  if (
    savedStatus === "draft" ||
    savedStatus === "cancelled" ||
    savedStatus === "completed" ||
    savedStatus === "ongoing" ||
    savedStatus === "upcoming"
  ) {
    return savedStatus;
  }

  // Keep initial render stable.
  if (!now) {
    return "draft";
  }

  const start = event.start_date
    ? new Date(event.start_date)
    : null;

  const end = event.end_date
    ? new Date(event.end_date)
    : null;

  // For published events, determine status from dates.
  if (start && now < start) {
    return "upcoming";
  }

  if (start && end && now >= start && now <= end) {
    return "ongoing";
  }

  if (end && now > end) {
    return "completed";
  }

  // Published event without enough date information.
  if (savedStatus === "published") {
    return "upcoming";
  }

  return "draft";
}

export function formatDate(dateValue?: string | null) {
  if (!dateValue) {
    return "No date set";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function getEventTitle(
  events: EventRow[],
  eventId?: string | number | null
) {
  const event = events.find(
    (item) => String(item.id) === String(eventId)
  );

  return event?.title || "Unknown Event";
}

export function formatStatusLabel(status?: string | null) {
  return String(status || "")
    .replaceAll("_", " ")
    .trim();
}

export function getStatusStyle(status?: string | null) {
  const cleanStatus = String(status || "").toLowerCase();

  if (
    cleanStatus === "ongoing" ||
    cleanStatus === "prepared" ||
    cleanStatus === "ready" ||
    cleanStatus === "registration_open" ||
    cleanStatus === "open"
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (cleanStatus === "completed" || cleanStatus === "closed") {
    return "bg-slate-100 text-slate-700";
  }

  if (cleanStatus === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  if (cleanStatus === "draft" || cleanStatus === "pending") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-blue-100 text-blue-700";
}
