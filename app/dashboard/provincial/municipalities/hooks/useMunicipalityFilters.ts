"use client";

import { useMemo, useState } from "react";

import type {
  MunicipalityFilter,
  MunicipalityOverviewItem,
} from "../types/municipality";

export default function useMunicipalityFilters(
  municipalities: MunicipalityOverviewItem[]
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<MunicipalityFilter>("all");

  const filteredMunicipalities = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return municipalities.filter((municipality) => {
      const matchesStatus =
        statusFilter === "all" ||
        municipality.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const allAdmins = [
        ...municipality.approvedAdmins,
        ...municipality.pendingAdmins,
      ];

      const searchableValues = [
        municipality.name,
        ...allAdmins.flatMap((admin) => [
          admin.full_name,
          admin.email,
          admin.municipality,
        ]),
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0
        )
        .join(" ")
        .toLowerCase();

      return searchableValues.includes(normalizedQuery);
    });
  }, [municipalities, searchQuery, statusFilter]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  return {
    searchQuery,
    statusFilter,
    filteredMunicipalities,
    hasActiveFilters,
    setSearchQuery,
    setStatusFilter,
    clearFilters,
  };
}