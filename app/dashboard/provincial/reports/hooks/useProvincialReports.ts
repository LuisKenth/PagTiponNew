"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  AttendanceRow,
  EventMunicipalityRow,
  EventReport,
  EventRow,
  EventStatusSummary,
  MunicipalityReport,
  PreparedPendingSummary,
  RsvpRow,
} from "../types";

export default function useProvincialReports() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventMunicipalities, setEventMunicipalities] = useState<
    EventMunicipalityRow[]
  >([]);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedEventId, setSelectedEventId] = useState("all");
  const [selectedMunicipality, setSelectedMunicipality] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, title, status, start_at, end_at, created_at")
        .order("created_at", { ascending: false });

      if (eventError) {
        throw new Error(eventError.message);
      }

      const { data: municipalityData, error: municipalityError } =
        await supabase
          .from("event_municipalities")
          .select("id, event_id, municipality, municipal_status");

      if (municipalityError) {
        throw new Error(municipalityError.message);
      }

      const { data: rsvpData, error: rsvpError } = await supabase
        .from("rsvps")
        .select("id, event_municipality_id, status");

      if (rsvpError) {
        throw new Error(rsvpError.message);
      }

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select("id, rsvp_id, status");

      if (attendanceError) {
        throw new Error(attendanceError.message);
      }

      setEvents((eventData || []) as EventRow[]);
      setEventMunicipalities(
        (municipalityData || []) as EventMunicipalityRow[]
      );
      setRsvps((rsvpData || []) as RsvpRow[]);
      setAttendance((attendanceData || []) as AttendanceRow[]);
    } catch (error) {
      console.error("Reports error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load provincial reports."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const municipalityOptions = useMemo(() => {
    return Array.from(
      new Set(
        eventMunicipalities
          .map((item) => item.municipality)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [eventMunicipalities]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (
        selectedEventId !== "all" &&
        String(event.id) !== selectedEventId
      ) {
        return false;
      }

      if (dateFrom || dateTo) {
        if (!event.start_at) {
          return false;
        }

        const eventDate = new Date(event.start_at);

        if (Number.isNaN(eventDate.getTime())) {
          return false;
        }

        if (dateFrom) {
          const fromDate = new Date(`${dateFrom}T00:00:00`);

          if (eventDate < fromDate) {
            return false;
          }
        }

        if (dateTo) {
          const toDate = new Date(`${dateTo}T23:59:59`);

          if (eventDate > toDate) {
            return false;
          }
        }
      }

      if (selectedMunicipality !== "all") {
        const assignedToMunicipality = eventMunicipalities.some(
          (target) =>
            String(target.event_id) === String(event.id) &&
            target.municipality === selectedMunicipality
        );

        if (!assignedToMunicipality) {
          return false;
        }
      }

      return true;
    });
  }, [
    events,
    eventMunicipalities,
    selectedEventId,
    selectedMunicipality,
    dateFrom,
    dateTo,
  ]);

  const filteredTargets = useMemo(() => {
    const filteredEventIds = new Set(
      filteredEvents.map((event) => String(event.id))
    );

    return eventMunicipalities.filter((target) => {
      if (!filteredEventIds.has(String(target.event_id))) {
        return false;
      }

      if (
        selectedMunicipality !== "all" &&
        target.municipality !== selectedMunicipality
      ) {
        return false;
      }

      return true;
    });
  }, [filteredEvents, eventMunicipalities, selectedMunicipality]);

  const filteredEventReports = useMemo<EventReport[]>(() => {
    return filteredEvents.map((event) => {
      const targets = filteredTargets.filter(
        (target) => String(target.event_id) === String(event.id)
      );

      const targetIds = new Set(
        targets.map((target) => String(target.id))
      );

      const eventRsvps = rsvps.filter((rsvp) =>
        targetIds.has(String(rsvp.event_municipality_id))
      );

      const rsvpIds = new Set(
        eventRsvps.map((rsvp) => String(rsvp.id))
      );

      const eventAttendance = attendance.filter((record) =>
        rsvpIds.has(String(record.rsvp_id))
      );

      const present = eventAttendance.filter(
        (record) => record.status === "present"
      ).length;

      const absent = eventAttendance.filter(
        (record) => record.status === "absent"
      ).length;

      const registrations = eventRsvps.length;

      const attendanceRate =
        registrations > 0
          ? Math.round((present / registrations) * 100)
          : 0;

      return {
        event,
        municipalities: targets.map((target) => target.municipality),
        registrations,
        present,
        absent,
        attendanceRate,
      };
    });
  }, [filteredEvents, filteredTargets, rsvps, attendance]);

  const filteredMunicipalityReports = useMemo<MunicipalityReport[]>(() => {
    const municipalityNames = Array.from(
      new Set(filteredTargets.map((target) => target.municipality))
    ).sort((a, b) => a.localeCompare(b));

    return municipalityNames.map((municipality) => {
      const targets = filteredTargets.filter(
        (target) => target.municipality === municipality
      );

      const targetIds = new Set(
        targets.map((target) => String(target.id))
      );

      const municipalityRsvps = rsvps.filter((rsvp) =>
        targetIds.has(String(rsvp.event_municipality_id))
      );

      const rsvpIds = new Set(
        municipalityRsvps.map((rsvp) => String(rsvp.id))
      );

      const municipalityAttendance = attendance.filter((record) =>
        rsvpIds.has(String(record.rsvp_id))
      );

      const present = municipalityAttendance.filter(
        (record) => record.status === "present"
      ).length;

      const registrations = municipalityRsvps.length;

      const eventsReceived = new Set(
        targets.map((target) => String(target.event_id))
      ).size;

      const prepared = targets.filter(
        (target) =>
          (target.municipal_status || "").trim().toLowerCase() ===
          "prepared"
      ).length;

      const preparationRate =
        eventsReceived > 0
          ? Math.round((prepared / eventsReceived) * 100)
          : 0;

      return {
        municipality,
        eventsReceived,
        prepared,
        preparationRate,
        registrations,
        present,
        attendanceRate:
          registrations > 0
            ? Math.round((present / registrations) * 100)
            : 0,
      };
    });
  }, [filteredTargets, rsvps, attendance]);

  const filteredTargetIds = useMemo(() => {
    return new Set(filteredTargets.map((target) => String(target.id)));
  }, [filteredTargets]);

  const filteredRsvps = useMemo(() => {
    return rsvps.filter((rsvp) =>
      filteredTargetIds.has(String(rsvp.event_municipality_id))
    );
  }, [rsvps, filteredTargetIds]);

  const filteredRsvpIds = useMemo(() => {
    return new Set(filteredRsvps.map((rsvp) => String(rsvp.id)));
  }, [filteredRsvps]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) =>
      filteredRsvpIds.has(String(record.rsvp_id))
    );
  }, [attendance, filteredRsvpIds]);

  const totalRegistrations = filteredRsvps.length;

  const totalPresent = filteredAttendance.filter(
    (record) => record.status === "present"
  ).length;

  const totalAbsent = filteredAttendance.filter(
    (record) => record.status === "absent"
  ).length;

  const overallAttendanceRate =
    totalRegistrations > 0
      ? Math.round((totalPresent / totalRegistrations) * 100)
      : 0;

  const totalMunicipalityAssignments = filteredTargets.length;

  const totalPreparedAssignments = filteredTargets.filter(
    (target) =>
      (target.municipal_status || "").trim().toLowerCase() === "prepared"
  ).length;

  const municipalityPreparationRate =
    totalMunicipalityAssignments > 0
      ? Math.round(
          (totalPreparedAssignments / totalMunicipalityAssignments) * 100
        )
      : 0;

  const eventStatusSummary = useMemo<EventStatusSummary>(() => {
    const normalizeStatus = (status: string | null) =>
      (status || "").trim().toLowerCase();

    return {
      draft: filteredEvents.filter(
        (event) => normalizeStatus(event.status) === "draft"
      ).length,
      published: filteredEvents.filter(
        (event) => normalizeStatus(event.status) === "published"
      ).length,
      upcoming: filteredEvents.filter(
        (event) => normalizeStatus(event.status) === "upcoming"
      ).length,
      ongoing: filteredEvents.filter(
        (event) => normalizeStatus(event.status) === "ongoing"
      ).length,
      completed: filteredEvents.filter(
        (event) => normalizeStatus(event.status) === "completed"
      ).length,
      cancelled: filteredEvents.filter(
        (event) => normalizeStatus(event.status) === "cancelled"
      ).length,
    };
  }, [filteredEvents]);

  const preparedVsPendingSummary = useMemo<PreparedPendingSummary>(() => {
    const prepared = filteredTargets.filter(
      (target) =>
        (target.municipal_status || "").trim().toLowerCase() ===
        "prepared"
    ).length;

    const pending = filteredTargets.length - prepared;

    const preparedRate =
      filteredTargets.length > 0
        ? Math.round((prepared / filteredTargets.length) * 100)
        : 0;

    const pendingRate =
      filteredTargets.length > 0
        ? Math.round((pending / filteredTargets.length) * 100)
        : 0;

    return {
      prepared,
      pending,
      preparedRate,
      pendingRate,
      total: filteredTargets.length,
    };
  }, [filteredTargets]);

  const resetFilters = () => {
    setSelectedEventId("all");
    setSelectedMunicipality("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    selectedEventId !== "all" ||
    selectedMunicipality !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  return {
    events,
    municipalityOptions,
    filteredEvents,
    filteredEventReports,
    filteredMunicipalityReports,

    loading,
    errorMessage,
    fetchReports,

    selectedEventId,
    setSelectedEventId,
    selectedMunicipality,
    setSelectedMunicipality,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    resetFilters,
    hasActiveFilters,

    totalRegistrations,
    totalPresent,
    totalAbsent,
    overallAttendanceRate,

    totalMunicipalityAssignments,
    totalPreparedAssignments,
    municipalityPreparationRate,

    eventStatusSummary,
    preparedVsPendingSummary,
  };
}
