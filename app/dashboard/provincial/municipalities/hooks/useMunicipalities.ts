"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { manageMunicipalAdmin } from "../utils/manageMunicipalAdmin";
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
      `,
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
    const timeout = window.setTimeout(() => { void fetchMunicipalAdmins(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchMunicipalAdmins]);

  const approvedAdmins = useMemo(
    () => admins.filter((admin) => admin.verification_status === "approved"),
    [admins],
  );

  const pendingAdmins = useMemo(
    () => admins.filter((admin) => admin.verification_status === "pending"),
    [admins],
  );

  const municipalityOverview = useMemo<MunicipalityOverviewItem[]>(() => {
    return MUNICIPALITIES.map((municipality) => {
      const municipalityKey = normalizeMunicipality(municipality);

      const approved = approvedAdmins.filter(
        (admin) =>
          normalizeMunicipality(admin.municipality) === municipalityKey,
      );

      const pending = pendingAdmins.filter(
        (admin) =>
          normalizeMunicipality(admin.municipality) === municipalityKey,
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
        (municipality) => municipality.status === "approved",
      ),
    [municipalityOverview],
  );

  const pendingMunicipalities = useMemo(
    () =>
      municipalityOverview.filter(
        (municipality) => municipality.status === "pending",
      ),
    [municipalityOverview],
  );

  const unassignedMunicipalities = useMemo(
    () =>
      municipalityOverview.filter(
        (municipality) => municipality.status === "unassigned",
      ),
    [municipalityOverview],
  );

  const handleApprove = async (admin: MunicipalAdmin) => {
    if (
      !window.confirm(
        `Approve and activate ${admin.full_name || "this admin"}? This uses one of the municipality’s 2 admin slots.`,
      )
    )
      return;
    setProcessingId(admin.id);
    try {
      const message = await manageMunicipalAdmin(admin.id, "activate");
      await fetchMunicipalAdmins();
      window.alert(message);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to approve account.",
      );
    } finally {
      setProcessingId(null);
    }
  };
  const handleReject = async (admin: MunicipalAdmin) => {
    if (
      !window.confirm(
        `Deactivate ${admin.full_name || "this admin"} and deny municipal portal access?`,
      )
    )
      return;
    setProcessingId(admin.id);
    try {
      const message = await manageMunicipalAdmin(admin.id, "deactivate");
      await fetchMunicipalAdmins();
      window.alert(message);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to deactivate account.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  return {
    admins,
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
