export type MunicipalReportEventStatus =
  | "all"
  | "draft"
  | "published"
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "unknown";

export type MunicipalReportEvent = {
  eventMunicipalityId: string;

  eventId: string | null;

  eventTitle: string;
  eventOrigin?: "provincial" | "municipal";

  eventStatus: string;

  municipalStatus: string;

  registrationOpen: boolean;

  startAt: string | null;

  endAt: string | null;

  totalRegistrations: number;

  presentCount: number;

  lateCount: number;

  absentCount: number;

  pendingCount: number;

  qrCheckInCount: number;

  manualCheckInCount: number;

  attendanceRate: number;
};

export type MunicipalReportSummary = {
  assignedEvents: number;

  totalRegistrations: number;

  attendanceEligibleRegistrations: number;

  attendedCount: number;

  presentCount: number;

  lateCount: number;

  absentCount: number;

  pendingCount: number;

  qrCheckInCount: number;

  manualCheckInCount: number;

  attendanceRate: number;
};

export type MunicipalReportEventOption = {
  eventMunicipalityId: string;
  eventTitle: string;
  eventOrigin?: "provincial" | "municipal";
  startAt?: string | null;
  eventStatus?: string | null;
};

export type MunicipalReportProfile = {
  role: string;

  municipality: string | null;
};

/*
 * Participant Category option used by
 * the Municipal Reports filter.
 *
 * Example:
 * {
 *   value: "farmer",
 *   label: "Farmer"
 * }
 */
export type MunicipalParticipantCategoryOption = {
  value: string;

  label: string;
};

/*
 * Participant Category breakdown item.
 *
 * "details" is primarily used for the
 * "others" category so custom values such
 * as "Barangay Health Worker" can also be
 * displayed in the report breakdown.
 */
export type MunicipalParticipantCategoryBreakdownItem = {
  value: string;

  label: string;

  count: number;

  percentage: number;

  details: {
    label: string;

    count: number;
  }[];
};

/** Municipality-restricted participant attendance rows from the existing RPC. */
export type MunicipalReportParticipantRow = {
  rsvpId: string;
  participantId: string;
  participantName: string;
  eventMunicipalityId: string;
  eventTitle: string;
  eventOrigin?: "provincial" | "municipal";
  attendanceStatus: string;
  method: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  category: string;
  categoryLabel: string;
};
