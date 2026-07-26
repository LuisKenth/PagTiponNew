import type { EventItem, EventMunicipality } from "./types";

export function getEventName(event: EventItem) {
  return event.title || "Untitled Event";
}

export function isValidDate(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function formatDate(value?: string | null) {
  if (!isValidDate(value)) return "No date set";

  return new Date(value as string).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getMemoLabel(event: EventItem) {
  if (event.memo_url || event.memo_filename) {
    return "Uploaded";
  }

  return "No memo";
}

export function getPreparationLabel(
  municipalities: EventMunicipality[]
) {
  if (municipalities.length === 0) return "Pending";

  const readyCount = municipalities.filter(
    (item) => item.preparation_status === "ready"
  ).length;

  if (readyCount === 0) return "Pending";

  if (readyCount === municipalities.length) {
    return "Ready";
  }

  return `${readyCount}/${municipalities.length} ready`;
}

/*
 * AUTOMATIC EVENT STATUS
 *
 * draft      = manual
 * cancelled  = manual
 * upcoming   = before start time
 * ongoing    = between start and end time
 * completed  = after end time
 */
export function getAutomaticEventStatus(
  event: Pick<EventItem, "status" | "start_at" | "end_at">,
  currentTime: number = Date.now()
) {
  // Manual statuses should never be automatically changed.
  if (event.status === "draft") {
    return "draft";
  }

  if (event.status === "cancelled") {
    return "cancelled";
  }

  // Keep existing status if dates are incomplete or invalid.
  if (!isValidDate(event.start_at) || !isValidDate(event.end_at)) {
    return event.status || "published";
  }

  const startTime = new Date(event.start_at as string).getTime();
  const endTime = new Date(event.end_at as string).getTime();

  // Before event starts.
  if (currentTime < startTime) {
    return "upcoming";
  }

  // Event has started but has not ended yet.
  if (currentTime <= endTime) {
    return "ongoing";
  }

  // Event end time has already passed.
  return "completed";
}

export function getStatusClass(status?: string | null) {
  if (status === "published") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "draft") {
    return "bg-slate-100 text-slate-700";
  }

  if (status === "upcoming") {
    return "bg-indigo-50 text-indigo-700";
  }

  if (status === "ongoing") {
    return "bg-green-50 text-green-700";
  }

  if (status === "completed") {
    return "bg-slate-100 text-slate-700";
  }

  if (status === "cancelled") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}