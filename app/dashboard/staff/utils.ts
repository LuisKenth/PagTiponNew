import type { SupabaseErrorLike } from "./types";

export function formatDateTime(dateValue: string | null): string {
  if (!dateValue) return "Not set";

  return new Date(dateValue).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDatabaseError(
  error: SupabaseErrorLike | null
): string {
  if (!error) {
    return "An unexpected database error occurred.";
  }

  const combinedMessage = `${error.message ?? ""} ${
    error.details ?? ""
  }`.toUpperCase();

  const errorMessages: Array<[string, string]> = [
    [
      "CHECK_IN_AUTH_REQUIRED",
      "You must be signed in before controlling attendance.",
    ],
    ["CHECK_IN_PROFILE_NOT_FOUND", "Your staff profile could not be found."],
    [
      "CHECK_IN_STAFF_ONLY",
      "Only an event staff account can control attendance.",
    ],
    [
      "CHECK_IN_STAFF_NOT_APPROVED",
      "Your event staff account has not been approved.",
    ],
    [
      "CHECK_IN_EVENT_NOT_FOUND",
      "The selected municipal event could not be found.",
    ],
    [
      "CHECK_IN_MUNICIPALITY_MISMATCH",
      "You cannot control attendance for another municipality.",
    ],
    [
      "CHECK_IN_INVALID_SCHEDULE",
      "The selected event does not have a valid schedule.",
    ],
    [
      "CHECK_IN_EVENT_CANCELLED",
      "Attendance is unavailable because the event was cancelled.",
    ],
    [
      "CHECK_IN_EVENT_COMPLETED",
      "Attendance is unavailable because the event is completed.",
    ],
    [
      "CHECK_IN_OPEN_TOO_EARLY",
      "Check-in cannot be opened yet. It becomes available 30 minutes before the event starts.",
    ],
    [
      "CHECK_IN_EVENT_ENDED",
      "Check-in cannot be opened because the event has already ended.",
    ],
    [
      "CHECK_IN_NOT_OPENED",
      "Attendance check-in has not been opened.",
    ],
    [
      "ATTENDANCE_EVENT_NOT_FOUND",
      "The event connected to this participant could not be found.",
    ],
    [
      "ATTENDANCE_INVALID_EVENT_SCHEDULE",
      "The event does not have a valid start and end schedule.",
    ],
    [
      "ATTENDANCE_EVENT_CANCELLED",
      "This participant cannot check in because the event was cancelled.",
    ],
    [
      "ATTENDANCE_EVENT_COMPLETED",
      "This participant cannot check in because the event is completed.",
    ],
    ["ATTENDANCE_TOO_EARLY", "Attendance check-in is not available yet."],
    [
      "ATTENDANCE_WINDOW_CLOSED",
      "The attendance window has already ended.",
    ],
    [
      "ATTENDANCE_CHECK_IN_NOT_OPEN",
      "Event staff has not opened attendance check-in.",
    ],
    [
      "ATTENDANCE_CHECK_IN_CLOSED",
      "Attendance check-in has already been closed by event staff.",
    ],
    [
      "CHECK_IN_CONTROL_DIRECT_UPDATE_BLOCKED",
      "Check-in controls must be changed using the Open or Close Check-in button.",
    ],
  ];

  const matchedError = errorMessages.find(([code]) =>
    combinedMessage.includes(code)
  );

  if (matchedError) return matchedError[1];

  return (
    error.details ||
    error.message ||
    "An unexpected database error occurred."
  );
}
