"use client";

import {
  CheckCircle2,
  CircleAlert,
  X,
} from "lucide-react";

import VenueForm from "./components/VenueForm";
import VenuesFilters from "./components/VenuesFilters";
import VenuesHeader from "./components/VenuesHeader";
import VenuesList from "./components/VenuesList";
import VenuesPagination from "./components/VenuesPagination";

import useMunicipalVenues from "./hooks/useMunicipalVenues";

export default function MunicipalVenuesPage() {
  const {
    venues,
    filteredVenues,
    paginatedVenues,

    municipality,
    editingVenue,

    venueName,
    capacity,
    searchTerm,

    totalCapacity,
    totalPages,
    currentPage,
    pageSize,
    firstVisibleItem,
    lastVisibleItem,

    loading,
    refreshing,
    saving,
    deletingVenueId,
    errorMessage,
    feedback,
    hasActiveSearch,

    setVenueName,
    setCapacity,
    setSearchTerm,
    setFeedback,

    handleSubmit,
    handleEdit,
    handleDelete,
    cancelEdit,
    clearSearch,

    changePageSize,
    goToPreviousPage,
    goToNextPage,

    refreshVenues,
  } = useMunicipalVenues();

  return (
    <div className="space-y-6">
      <VenuesHeader
        municipality={municipality}
        totalVenues={venues.length}
        filteredVenues={
          filteredVenues.length
        }
        totalCapacity={totalCapacity}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() =>
          void refreshVenues()
        }
      />

      {feedback && (
        <section
          className={`relative flex items-start gap-3 rounded-2xl border p-4 pr-12 shadow-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              feedback.type === "success"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {feedback.type ===
            "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <CircleAlert className="h-5 w-5" />
            )}
          </div>

          <div>
            <p
              className={`text-sm font-bold ${
                feedback.type === "success"
                  ? "text-emerald-900"
                  : "text-red-900"
              }`}
            >
              {feedback.type === "success"
                ? "Venue Saved"
                : "Venue Action Failed"}
            </p>

            <p
              className={`mt-1 text-sm leading-6 ${
                feedback.type === "success"
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {feedback.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setFeedback(null)
            }
            aria-label="Dismiss venue message"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </section>
      )}

      <VenueForm
        editingVenue={editingVenue}
        venueName={venueName}
        capacity={capacity}
        saving={saving}
        onVenueNameChange={
          setVenueName
        }
        onCapacityChange={
          setCapacity
        }
        onSubmit={handleSubmit}
        onCancelEdit={cancelEdit}
      />

      <VenuesFilters
        searchTerm={searchTerm}
        resultCount={
          filteredVenues.length
        }
        hasActiveSearch={
          hasActiveSearch
        }
        onSearchChange={
          setSearchTerm
        }
        onClearSearch={clearSearch}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Municipal Venue List
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Review venue capacity and
              maintain locations available
              for municipal event planning.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {filteredVenues.length}{" "}
            {filteredVenues.length === 1
              ? "venue"
              : "venues"}
          </span>
        </div>

        <VenuesList
          venues={paginatedVenues}
          loading={loading}
          errorMessage={errorMessage}
          deletingVenueId={
            deletingVenueId
          }
          editingVenueId={
            editingVenue?.id ?? null
          }
          onEdit={handleEdit}
          onDelete={(venue) =>
            void handleDelete(venue)
          }
        />

        {!loading &&
          !errorMessage && (
            <VenuesPagination
              currentPage={
                currentPage
              }
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={
                filteredVenues.length
              }
              firstVisibleItem={
                firstVisibleItem
              }
              lastVisibleItem={
                lastVisibleItem
              }
              onPageSizeChange={
                changePageSize
              }
              onPreviousPage={
                goToPreviousPage
              }
              onNextPage={
                goToNextPage
              }
            />
          )}
      </section>
    </div>
  );
}
