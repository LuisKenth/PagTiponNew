"use client";

import { useState } from "react";

import MunicipalAdminsList from "./components/MunicipalAdminsList";
import MunicipalitiesHeader from "./components/MunicipalitiesHeader";
import MunicipalitiesLoading from "./components/MunicipalitiesLoading";
import MunicipalitiesSummary from "./components/MunicipalitiesSummary";
import MunicipalitiesTabs from "./components/MunicipalitiesTabs";
import MunicipalityFilters from "./components/MunicipalityFilters";
import MunicipalityOverview from "./components/MunicipalityOverview";
import PendingAdminsList from "./components/PendingAdminsList";
import { MUNICIPALITIES } from "./constants/municipalities";
import useMunicipalities from "./hooks/useMunicipalities";
import useMunicipalityFilters from "./hooks/useMunicipalityFilters";
import type { TabType } from "./types/municipality";

export default function ProvincialMunicipalitiesPage() {
  const [activeTab, setActiveTab] =
    useState<TabType>("municipalities");

  const {
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
  } = useMunicipalities();

  const {
    searchQuery,
    statusFilter,
    filteredMunicipalities,
    hasActiveFilters,
    setSearchQuery,
    setStatusFilter,
    clearFilters,
  } = useMunicipalityFilters(municipalityOverview);

  return (
    <div className="space-y-6">
      <MunicipalitiesHeader />

      <MunicipalitiesSummary
        approvedCount={approvedMunicipalities.length}
        pendingCount={pendingMunicipalities.length}
        unassignedCount={unassignedMunicipalities.length}
        onTabChange={setActiveTab}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <MunicipalitiesTabs
          activeTab={activeTab}
          approvedCount={approvedAdmins.length}
          pendingCount={pendingAdmins.length}
          totalMunicipalities={MUNICIPALITIES.length}
          onTabChange={setActiveTab}
        />

        <div className="p-4 sm:p-6">
          {loading ? (
            <MunicipalitiesLoading />
          ) : activeTab === "municipalities" ? (
            <>
              <MunicipalityFilters
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                totalCount={municipalityOverview.length}
                filteredCount={filteredMunicipalities.length}
                hasActiveFilters={hasActiveFilters}
                onSearchChange={setSearchQuery}
                onStatusChange={setStatusFilter}
                onClearFilters={clearFilters}
              />

              <MunicipalityOverview
                municipalities={filteredMunicipalities}
                approvedCount={approvedMunicipalities.length}
                pendingCount={pendingMunicipalities.length}
                unassignedCount={
                  unassignedMunicipalities.length
                }
              />
            </>
          ) : activeTab === "admins" ? (
            <MunicipalAdminsList admins={approvedAdmins} />
          ) : (
            <PendingAdminsList
              admins={pendingAdmins}
              processingId={processingId}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </div>
      </div>
    </div>
  );
}