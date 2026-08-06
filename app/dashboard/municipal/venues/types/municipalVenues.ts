export type MunicipalVenue = {
  id: string;
  venue_name: string;
  municipality: string;
  capacity: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MunicipalVenueProfile = {
  role: string;
  municipality: string | null;
};

export type VenueFeedback =
  | {
      type: "success";
      action:
        | "added"
        | "updated"
        | "deleted";
      message: string;
    }
  | {
      type: "error";
      message: string;
    };