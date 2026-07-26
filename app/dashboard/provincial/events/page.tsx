"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import EventsFilters from "./components/EventsFilters";
import EventsHeader from "./components/EventsHeader";
import EventsStatusTabs from "./components/EventsStatusTabs";
import EventsSummary from "./components/EventsSummary";
import EventsTable from "./components/EventsTable";
import Pagination from "../components/Pagination";

import type {
  EventSortOption,
  EventStatusFilter,
  EventWithMunicipalities,
} from "./types";

import {
  getAutomaticEventStatus,
  getEventName,
} from "./utils";

export default function ProvincialEventsPage() {
  const [events, setEvents] = useState<
    EventWithMunicipalities[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(null);

  const [
    publishingId,
    setPublishingId,
  ] = useState<string | null>(null);

  const [
    cancellingId,
    setCancellingId,
  ] = useState<string | null>(null);

  const [
    currentTime,
    setCurrentTime,
  ] = useState(0);

  /*
   * FILTER STATES
   */
  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<EventStatusFilter>("all");

  const [
    municipalityFilter,
    setMunicipalityFilter,
  ] = useState("all");

  /*
 * SORTING
 */
  const [
    sortOption,
    setSortOption,
  ] = useState<EventSortOption>(
    "newest"
  );

  /*Pagination*/

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    pageSize,
    setPageSize,
  ] = useState(5);

  /*
   * FETCH EVENTS
   */
  const fetchEvents = async () => {
    setLoading(true);

    const now = Date.now();

    const {
      data: eventData,
      error: eventError,
    } = await supabase
      .from("events")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (eventError) {
      console.error(
        "Events error:",
        eventError.message
      );

      setEvents([]);
      setLoading(false);

      return;
    }

    /*
     * AUTOMATIC STATUS
     */
    const normalizedEventData =
      await Promise.all(
        (eventData || []).map(
          async (event) => {
            const automaticStatus =
              getAutomaticEventStatus(
                event,
                now
              );

            if (
              automaticStatus !==
              event.status &&
              automaticStatus !==
              "draft" &&
              automaticStatus !==
              "cancelled"
            ) {
              const {
                error: statusError,
              } = await supabase
                .from("events")
                .update({
                  status:
                    automaticStatus,
                })
                .eq(
                  "id",
                  event.id
                );

              if (statusError) {
                console.error(
                  `Unable to update status for event ${event.id}:`,
                  statusError.message
                );
              }
            }

            return {
              ...event,
              status:
                automaticStatus,
            };
          }
        )
      );

    const eventIds =
      normalizedEventData.map(
        (event) => event.id
      );

    if (eventIds.length === 0) {
      setEvents([]);
      setCurrentTime(now);
      setLoading(false);

      return;
    }

    const {
      data: municipalityData,
      error: municipalityError,
    } = await supabase
      .from(
        "event_municipalities"
      )
      .select("*")
      .in(
        "event_id",
        eventIds
      );

    if (municipalityError) {
      console.error(
        "Event municipalities error:",
        municipalityError.message
      );

      setEvents([]);
      setLoading(false);

      return;
    }

    const mappedEvents: EventWithMunicipalities[] =
      normalizedEventData.map(
        (event) => {
          const municipalities =
            municipalityData?.filter(
              (item) =>
                item.event_id ===
                event.id
            ) || [];

          return {
            ...event,
            municipalities,
          };
        }
      );

    setEvents(mappedEvents);
    setCurrentTime(now);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  /*
   * REFRESH DISPLAYED STATUS
   * EVERY 30 SECONDS
   */
  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setCurrentTime(
          Date.now()
        );
      }, 30_000);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);

  /*
   * MUNICIPALITY OPTIONS
   */
  const municipalityOptions =
    useMemo(() => {
      const municipalities =
        events.flatMap(
          (event) =>
            event.municipalities.map(
              (item) =>
                item.municipality
            )
        );

      return Array.from(
        new Set(
          municipalities
        )
      ).sort((a, b) =>
        a.localeCompare(b)
      );
    }, [events]);

  /*
   * FILTERED EVENTS
   */
  const filteredEvents =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return events.filter(
        (event) => {
          const automaticStatus =
            getAutomaticEventStatus(
              event,
              currentTime
            );

          /*
           * SEARCH
           */
          const eventName =
            getEventName(
              event
            ).toLowerCase();

          const description =
            event.description
              ?.toLowerCase() ||
            "";

          const municipalityNames =
            event.municipalities
              .map((item) =>
                item.municipality.toLowerCase()
              )
              .join(" ");

          const matchesSearch =
            search === "" ||
            eventName.includes(
              search
            ) ||
            description.includes(
              search
            ) ||
            municipalityNames.includes(
              search
            );

          /*
           * STATUS TAB
           */
          const matchesStatus =
            statusFilter ===
            "all" ||
            automaticStatus ===
            statusFilter;

          /*
           * MUNICIPALITY
           */
          const matchesMunicipality =
            municipalityFilter ===
            "all" ||
            event.municipalities.some(
              (item) =>
                item.municipality ===
                municipalityFilter
            );

          return (
            matchesSearch &&
            matchesStatus &&
            matchesMunicipality
          );
        }
      );
    }, [
      events,
      searchTerm,
      statusFilter,
      municipalityFilter,
      currentTime,
    ]);

  /*
   * SORTED EVENTS
   */
  const sortedEvents = useMemo(() => {
    const sorted = [
      ...filteredEvents,
    ];

    if (sortOption === "newest") {
      return sorted.sort(
        (a, b) => {
          const aTime = a.created_at
            ? new Date(
              a.created_at
            ).getTime()
            : 0;

          const bTime = b.created_at
            ? new Date(
              b.created_at
            ).getTime()
            : 0;

          return bTime - aTime;
        }
      );
    }

    if (sortOption === "soonest") {
      return sorted.sort(
        (a, b) => {
          const aTime = a.start_at
            ? new Date(
              a.start_at
            ).getTime()
            : Number.MAX_SAFE_INTEGER;

          const bTime = b.start_at
            ? new Date(
              b.start_at
            ).getTime()
            : Number.MAX_SAFE_INTEGER;

          return aTime - bTime;
        }
      );
    }

    if (sortOption === "latest") {
      return sorted.sort(
        (a, b) => {
          const aTime = a.start_at
            ? new Date(
              a.start_at
            ).getTime()
            : 0;

          const bTime = b.start_at
            ? new Date(
              b.start_at
            ).getTime()
            : 0;

          return bTime - aTime;
        }
      );
    }

    if (
      sortOption === "title_asc"
    ) {
      return sorted.sort(
        (a, b) =>
          getEventName(a).localeCompare(
            getEventName(b),
            "en",
            {
              sensitivity: "base",
            }
          )
      );
    }

    return sorted;
  }, [
    filteredEvents,
    sortOption,
  ]);

  /*
* PAGINATION
*/
  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredEvents.length /
      pageSize
    )
  );

  const paginatedEvents =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        pageSize;

      const endIndex =
        startIndex +
        pageSize;

      return sortedEvents.slice(
        startIndex,
        endIndex
      );
    }, [
      sortedEvents,
      currentPage,
      pageSize,
    ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    municipalityFilter,
    sortOption,
    pageSize,

  ]);

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "all" ||
    municipalityFilter !==
    "all";

  /*
   * CLEAR EVERYTHING
   */
  const handleClearFilters =
    () => {
      setSearchTerm("");
      setStatusFilter("all");
      setMunicipalityFilter(
        "all"
      );
    };

  const handlePublish = async (
    event: EventWithMunicipalities
  ) => {
    if (event.status !== "draft") {
      return;
    }

    const eventName =
      getEventName(event);

    /*
     * BASIC VALIDATION
     */
    if (!event.title?.trim()) {
      alert(
        "Please add an event title before publishing."
      );

      return;
    }

    if (
      !event.start_at ||
      !event.end_at
    ) {
      alert(
        "Please set the event start and end schedule before publishing."
      );

      return;
    }

    const startTime =
      new Date(
        event.start_at
      ).getTime();

    const endTime =
      new Date(
        event.end_at
      ).getTime();

    if (
      Number.isNaN(startTime) ||
      Number.isNaN(endTime)
    ) {
      alert(
        "The event schedule is invalid."
      );

      return;
    }

    if (endTime <= startTime) {
      alert(
        "End date and time must be after the start date and time."
      );

      return;
    }

    if (
      event.municipalities.length ===
      0
    ) {
      alert(
        "Please assign at least one municipality before publishing."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Publish "${eventName}"?\n\nThe event will become available to its assigned municipalities.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setPublishingId(
        event.id
      );

      /*
       * Calculate correct status
       * immediately after publish.
       */
      const publishedStatus =
        getAutomaticEventStatus(
          {
            ...event,
            status: "published",
          },
          Date.now()
        );

      const {
        error: publishError,
      } = await supabase
        .from("events")
        .update({
          status:
            publishedStatus,
        })
        .eq(
          "id",
          event.id
        );

      if (publishError) {
        throw publishError;
      }

      /*
       * Update local UI immediately.
       */
      setEvents(
        (currentEvents) =>
          currentEvents.map(
            (currentEvent) =>
              currentEvent.id ===
                event.id
                ? {
                  ...currentEvent,
                  status:
                    publishedStatus,
                }
                : currentEvent
          )
      );

      alert(
        `"${eventName}" was published successfully.`
      );
    } catch (error) {
      console.error(
        "Publish event error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to publish the event.";

      alert(
        `Failed to publish event.\n\n${message}`
      );
    } finally {
      setPublishingId(
        null
      );
    }
  };

  const handleCancel = async (
    event: EventWithMunicipalities
  ) => {
    const automaticStatus =
      getAutomaticEventStatus(
        event,
        Date.now()
      );

    if (automaticStatus !== "upcoming") {
      alert(
        "Only upcoming events can be cancelled."
      );

      return;
    }

    const eventName =
      getEventName(event);

    const confirmed =
      window.confirm(
        `Cancel "${eventName}"?\n\nThe event will remain in PagTipon but will be marked as cancelled.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(
        event.id
      );

      const {
        error: cancelError,
      } = await supabase
        .from("events")
        .update({
          status:
            "cancelled",
        })
        .eq(
          "id",
          event.id
        );

      if (cancelError) {
        throw cancelError;
      }

      /*
       * Update local state.
       */
      setEvents(
        (currentEvents) =>
          currentEvents.map(
            (currentEvent) =>
              currentEvent.id ===
                event.id
                ? {
                  ...currentEvent,
                  status:
                    "cancelled",
                }
                : currentEvent
          )
      );

      alert(
        `"${eventName}" was cancelled successfully.`
      );
    } catch (error) {
      console.error(
        "Cancel event error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to cancel the event.";

      alert(
        `Failed to cancel event.\n\n${message}`
      );
    } finally {
      setCancellingId(
        null
      );
    }
  };

  /*
   * DELETE DRAFT EVENT
   */
  const handleDelete = async (
    event: EventWithMunicipalities
  ) => {
    if (
      event.status !== "draft"
    ) {
      alert(
        "Only draft events can be permanently deleted. Published events should be cancelled instead."
      );

      return;
    }

    const eventName =
      getEventName(event);

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${eventName}"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        event.id
      );

      /*
       * DELETE MUNICIPALITIES
       */
      const {
        error:
        municipalityError,
      } = await supabase
        .from(
          "event_municipalities"
        )
        .delete()
        .eq(
          "event_id",
          event.id
        );

      if (
        municipalityError
      ) {
        throw municipalityError;
      }

      /*
       * DELETE EVENT
       */
      const {
        error: eventError,
      } = await supabase
        .from("events")
        .delete()
        .eq(
          "id",
          event.id
        );

      if (eventError) {
        throw eventError;
      }

      /*
       * REMOVE FROM UI
       */
      setEvents(
        (
          currentEvents
        ) =>
          currentEvents.filter(
            (
              currentEvent
            ) =>
              currentEvent.id !==
              event.id
          )
      );

      alert(
        `"${eventName}" was deleted successfully.`
      );
    } catch (error) {
      console.error(
        "Delete event error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete the event.";

      alert(
        `Failed to delete event.\n\n${message}`
      );

      await fetchEvents();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <EventsHeader />

      {/* SUMMARY */}
      <EventsSummary
        events={events}
        currentTime={
          currentTime
        }
      />

      {/* EVENT LIST */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* LIST HEADER */}
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Event List
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Search and filter
            provincial events,
            municipality
            assignments, and event
            status.
          </p>
        </div>

        {/* STATUS TABS */}
        <EventsStatusTabs
          events={events}
          currentTime={
            currentTime
          }
          activeStatus={
            statusFilter
          }
          onStatusChange={
            setStatusFilter
          }
        />

        {/* SEARCH + MUNICIPALITY */}
        <EventsFilters
          searchTerm={searchTerm}
          municipalityFilter={
            municipalityFilter
          }
          municipalityOptions={
            municipalityOptions
          }
          sortOption={sortOption}
          filteredCount={
            filteredEvents.length
          }
          totalCount={
            events.length
          }
          hasStatusFilter={
            statusFilter !== "all"
          }
          onSearchChange={
            setSearchTerm
          }
          onMunicipalityChange={
            setMunicipalityFilter
          }
          onSortChange={
            setSortOption
          }
          onClear={
            handleClearFilters
          }
        />

        {/* TABLE */}
        <EventsTable
          events={paginatedEvents}
          loading={loading}
          deletingId={deletingId}
          publishingId={publishingId}
          cancellingId={cancellingId}
          currentTime={currentTime}
          isFiltered={hasActiveFilters}
          onDelete={handleDelete}
          onPublish={handlePublish}
          onCancel={handleCancel}
          onClearFilters={
            handleClearFilters
          }
        />

        {!loading &&
          filteredEvents.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={
                filteredEvents.length
              }
              pageSize={pageSize}
              itemLabel="events"
              pageSizeOptions={[
                5,
                10,
                20,
              ]}
              onPageChange={
                setCurrentPage
              }
              onPageSizeChange={(
                size
              ) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
      </div>
    </div>
  );
}