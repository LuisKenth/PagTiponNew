import type { ReceivedEvent } from "../types/municipalDashboard";
export function eventActionState(item: ReceivedEvent, now: number) {
  const raw = (item.event?.status || "").trim().toLowerCase();
  const municipal = (item.municipal_status || "").trim().toLowerCase();
  const start = Date.parse(item.event?.start_at || ""),
    end = Date.parse(item.event?.end_at || "");
  const status =
    raw === "cancelled" || municipal === "cancelled"
      ? "cancelled"
      : raw === "draft"
        ? "draft"
        : raw === "completed" || (now > 0 && Number.isFinite(end) && end <= now)
          ? "completed"
          : raw === "ongoing" ||
              (now > 0 && Number.isFinite(start) && start <= now)
            ? "ongoing"
            : raw === "published"
              ? "upcoming"
              : raw;
  const editable = status === "upcoming";
  return {
    status,
    editable,
    canAssign:
      editable &&
      municipal === "prepared" &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      end > start,
    canViewAttendance: status === "ongoing" || status === "completed",
    canViewRegistrations: status !== "draft",
    preparationLabel:
      status === "draft"
        ? "Continue Draft"
        : editable
          ? "Manage Preparation"
          : "View Preparation",
  };
}
