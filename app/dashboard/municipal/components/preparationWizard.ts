import type {
  PreparationStatus,
  ReceivedEvent,
  MunicipalVenue,
} from "../types/municipalDashboard";

export const preparationLabels: Record<PreparationStatus, string> = {
  pending: "Not Started",
  preparing: "In Progress",
  prepared: "Ready",
};
export type PreparationSaveOptions = {
  keepOpen?: boolean;
  skipStaffPrompt?: boolean;
};
export function preparationLock(
  event: ReceivedEvent,
  now: number,
): string | null {
  const status = event.event?.status?.trim().toLowerCase();
  if (
    status === "cancelled" ||
    String(event.municipal_status).toLowerCase() === "cancelled"
  )
    return "cancelled";
  const end = Date.parse(event.event?.end_at || "");
  const start = Date.parse(event.event?.start_at || "");
  if (status === "completed" || (Number.isFinite(end) && end <= now))
    return "completed";
  if (status === "ongoing" || (Number.isFinite(start) && start <= now))
    return "ongoing";
  return null;
}
export function preparationIssue({
  status,
  venue,
  instructions,
  municipal,
  venueError,
  event,
}: {
  status: PreparationStatus;
  venue: MunicipalVenue | null;
  instructions: string;
  municipal: boolean;
  venueError: string | null;
  event: ReceivedEvent;
}): { step: 1 | 2; message: string } | null {
  if (venueError) return { step: 1, message: venueError };
  if (venue && venue.status?.trim().toLowerCase() !== "active")
    return { step: 1, message: "Select an active venue before saving." };
  if (status === "prepared" && !venue)
    return {
      step: 1,
      message: "Select a local venue before marking this event Ready.",
    };
  if (!municipal && instructions.trim().length > 2000)
    return {
      step: 1,
      message: "Participant instructions must be 2,000 characters or fewer.",
    };
  if (status !== "pending" && !instructions.trim())
    return {
      step: 1,
      message: municipal
        ? "Participant instructions are required. Update this municipal event's instructions from Municipal Events first."
        : "Add participant instructions before marking this event In Progress or Ready.",
    };
  if (status === "prepared") {
    const start = Date.parse(event.event?.start_at || ""),
      end = Date.parse(event.event?.end_at || "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      return {
        step: 2,
        message:
          "A complete, valid event schedule is required before this event can be Ready.",
      };
  }
  return null;
}
