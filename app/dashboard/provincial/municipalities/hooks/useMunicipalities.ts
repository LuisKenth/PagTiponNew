"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import { MUNICIPALITIES } from "../constants/municipalities";
import type {
  MunicipalAdmin,
  MunicipalityOverviewItem,
  MunicipalityStatus,
} from "../types/municipality";
import { normalizeMunicipality } from "../utils/municipalityUtils";

export default function useMunicipalities() {
  const [admins, setAdmins] = useState<MunicipalAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchMunicipalAdmins = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        municipality,
        verification_status,
        created_at
      `
      )
      .eq("role", "municipal_admin")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Municipal admin fetch error:", error.message);
      alert(`Unable to load municipal admins: ${error.message}`);
      setAdmins([]);
      setLoading(false);
      return;
    }

    setAdmins((data || []) as MunicipalAdmin[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMunicipalAdmins();
  }, [fetchMunicipalAdmins]);

  const approvedAdmins = useMemo(
    () =>
      admins.filter(
        (admin) => admin.verification_status === "approved"
      ),
    [admins]
  );

  const pendingAdmins = useMemo(
    () =>
      admins.filter(
        (admin) => admin.verification_status === "pending"
      ),
    [admins]
  );

  const municipalityOverview = useMemo<MunicipalityOverviewItem[]>(() => {
    return MUNICIPALITIES.map((municipality) => {
      const municipalityKey = normalizeMunicipality(municipality);

      const approved = approvedAdmins.filter(
        (admin) =>
          normalizeMunicipality(admin.municipality) === municipalityKey
      );

      const pending = pendingAdmins.filter(
        (admin) =>
          normalizeMunicipality(admin.municipality) === municipalityKey
      );

      let status: MunicipalityStatus = "unassigned";

      if (approved.length > 0) {
        status = "approved";
      } else if (pending.length > 0) {
        status = "pending";
      }

      return {
        name: municipality,
        status,
        approvedAdmins: approved,
        pendingAdmins: pending,
      };
    });
  }, [approvedAdmins, pendingAdmins]);

  const approvedMunicipalities = useMemo(
    () =>
      municipalityOverview.filter(
        (municipality) => municipality.status === "approved"
      ),
    [municipalityOverview]
  );

  const pendingMunicipalities = useMemo(
    () =>
      municipalityOverview.filter(
        (municipality) => municipality.status === "pending"
      ),
    [municipalityOverview]
  );

  const unassignedMunicipalities = useMemo(
    () =>
      municipalityOverview.filter(
        (municipality) => municipality.status === "unassigned"
      ),
    [municipalityOverview]
  );

  const handleApprove = async (admin: MunicipalAdmin) => {
    const confirmed = window.confirm(
      `Approve ${admin.full_name || "this municipal admin"}${
        admin.municipality ? ` for ${admin.municipality}` : ""
      }?`
    );

    if (!confirmed) return;

    setProcessingId(admin.id);

    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "approved" })
      .eq("id", admin.id)
      .eq("role", "municipal_admin");

    if (error) {
      console.error("Approval error:", error.message);
      alert(`Failed to approve account: ${error.message}`);
      setProcessingId(null);
      return;
    }

    setAdmins((currentAdmins) =>
      currentAdmins.map((item) =>
        item.id === admin.id
          ? { ...item, verification_status: "approved" }
          : item
      )
    );

    setProcessingId(null);
    alert(
      `${admin.full_name || "Municipal admin"} has been approved successfully.`
    );
  };

  const handleReject = async (admin: MunicipalAdmin) => {
    const confirmed = window.confirm(
      `Reject the application of ${
        admin.full_name || "this municipal admin"
      }?`
    );

    if (!confirmed) return;

    setProcessingId(admin.id);

    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "rejected" })
      .eq("id", admin.id)
      .eq("role", "municipal_admin");

    if (error) {
      console.error("Rejection error:", error.message);
      alert(`Failed to reject account: ${error.message}`);
      setProcessingId(null);
      return;
    }

    setAdmins((currentAdmins) =>
      currentAdmins.map((item) =>
        item.id === admin.id
          ? { ...item, verification_status: "rejected" }
          : item
      )
    );

    setProcessingId(null);
    alert(
      `${admin.full_name || "Municipal admin"}'s application has been rejected.`
    );
  };

  return {
    loading,
    processingId,
    approvedAdmins,
    pendingAdmins,
    municipalityOverview,
    approvedMunicipalities,
    pendingMunicipalities,
    unassignedMunicipalities,
    handleApprove,
    handleReject,
    refreshMunicipalAdmins: fetchMunicipalAdmins,
  };
}
