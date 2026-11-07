export type VenueStatus = "active" | "inactive";

export type MunicipalVenue = {
  id: string;
  venue_name: string;
  municipality: string;
  capacity: number | null;
  address: string | null;
  landmark: string | null;
  maps_url: string | null;
  map_embed_url: string | null;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  location_revision: number;
  photo_paths: string[];

  status: VenueStatus;

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
      action: "added" | "updated" | "deleted";
      message: string;
    }
  | {
      type: "error";
      message: string;
    };
