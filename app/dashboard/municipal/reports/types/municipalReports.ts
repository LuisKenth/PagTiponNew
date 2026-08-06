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
};

export type MunicipalReportProfile = {
  role: string;
  municipality: string | null;
};
