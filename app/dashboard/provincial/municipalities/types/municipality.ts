export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | null;

export type MunicipalAdmin = {
  id: string;
  full_name: string | null;
  email: string | null;
  municipality: string | null;
  verification_status: VerificationStatus;
  created_at: string | null;
};

export type TabType = "municipalities" | "admins" | "pending";

export type MunicipalityStatus =
  | "approved"
  | "pending"
  | "unassigned";

export type MunicipalityFilter =
  | "all"
  | MunicipalityStatus;

export type MunicipalityOverviewItem = {
  name: string;
  status: MunicipalityStatus;
  approvedAdmins: MunicipalAdmin[];
  pendingAdmins: MunicipalAdmin[];
};