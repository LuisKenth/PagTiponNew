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

type ReportRsvpRow = RsvpRow & {
  user_id: string | null;
};

type ParticipantProfileRow = {
  id: string;
  participant_category: string | null;
  participant_category_other: string | null;
};

export type ParticipantCategoryOption = {
  value: string;
  label: string;
};

export type ParticipantCategoryBreakdownItem = {
  key: string;
  category: string;
  categoryLabel: string;
  participantCategoryOther: string | null;
  label: string;
  registrations: number;
  present: number;
  absent: number;
  attendanceRate: number;
  percentage: number;
};

function normalizeParticipantCategory(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function formatParticipantCategoryLabel(value: string) {
  if (!value) {
    return "Uncategorized";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function useProvincialReports() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventMunicipalities, setEventMunicipalities] = useState<
    EventMunicipalityRow[]
  >([]);
  const [rsvps, setRsvps] = useState<ReportRsvpRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [participantProfiles, setParticipantProfiles] = useState<
    ParticipantProfileRow[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedEventId, setSelectedEventId] = useState("all");
  const [selectedMunicipality, setSelectedMunicipality] = useState("all");
  const [selectedParticipantCategory, setSelectedParticipantCategory] =
    useState("all");
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
        .select("id, event_municipality_id, user_id, status");

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

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, participant_category, participant_category_other"
        );

      if (profileError) {
        throw new Error(profileError.message);
      }

      setEvents((eventData || []) as EventRow[]);

      setEventMunicipalities(
        (municipalityData || []) as EventMunicipalityRow[]
      );

      setRsvps((rsvpData || []) as ReportRsvpRow[]);

      setAttendance((attendanceData || []) as AttendanceRow[]);

      setParticipantProfiles(
        (profileData || []) as ParticipantProfileRow[]
      );
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

  const participantProfileById = useMemo(() => {
    return new Map(
      participantProfiles.map((profile) => [
        String(profile.id),
        profile,
      ])
    );
  }, [participantProfiles]);

  const municipalityOptions = useMemo(() => {
    return Array.from(
      new Set(
        eventMunicipalities
          .map((item) => item.municipality)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [eventMunicipalities]);

  const participantCategoryOptions =
    useMemo<ParticipantCategoryOption[]>(() => {
      const categoryValues = new Set<string>();
      let hasUncategorized = false;

      rsvps.forEach((rsvp) => {
        if (!rsvp.user_id) {
          hasUncategorized = true;
          return;
        }

        const profile = participantProfileById.get(
          String(rsvp.user_id)
        );

        const category = normalizeParticipantCategory(
          profile?.participant_category
        );

        if (!category) {
          hasUncategorized = true;
          return;
        }

        categoryValues.add(category);
      });

      const options = Array.from(categoryValues)
        .sort((a, b) =>
          formatParticipantCategoryLabel(a).localeCompare(
            formatParticipantCategoryLabel(b)
          )
        )
        .map((value) => ({
          value,
          label: formatParticipantCategoryLabel(value),
        }));

      if (hasUncategorized) {
        options.push({
          value: "uncategorized",
          label: "Uncategorized",
        });
      }

      return options;
    }, [rsvps, participantProfileById]);

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

  const filteredTargetIds = useMemo(() => {
    return new Set(
      filteredTargets.map((target) => String(target.id))
    );
  }, [filteredTargets]);

  /*
   * RSVP records filtered only by:
   * - Event
   * - Municipality
   * - Date
   *
   * Participant Category is intentionally applied afterwards.
   */
  const baseFilteredRsvps = useMemo(() => {
    return rsvps.filter((rsvp) => {
      const belongsToFilteredTarget =
        filteredTargetIds.has(
          String(rsvp.event_municipality_id)
        );

      const isRegistered =
        (rsvp.status || "").trim().toLowerCase() ===
        "registered";

      return belongsToFilteredTarget && isRegistered;
    });
  }, [rsvps, filteredTargetIds]);

  /*
   * Apply Participant Category filter at participant/RSVP level.
   */
  const filteredRsvps = useMemo(() => {
    if (selectedParticipantCategory === "all") {
      return baseFilteredRsvps;
    }

    return baseFilteredRsvps.filter((rsvp) => {
      if (!rsvp.user_id) {
        return selectedParticipantCategory === "uncategorized";
      }

      const profile = participantProfileById.get(
        String(rsvp.user_id)
      );

      const category = normalizeParticipantCategory(
        profile?.participant_category
      );

      if (selectedParticipantCategory === "uncategorized") {
        return category === "";
      }

      return category === selectedParticipantCategory;
    });
  }, [
    baseFilteredRsvps,
    participantProfileById,
    selectedParticipantCategory,
  ]);

  const filteredRsvpIds = useMemo(() => {
    return new Set(
      filteredRsvps.map((rsvp) => String(rsvp.id))
    );
  }, [filteredRsvps]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) =>
      filteredRsvpIds.has(String(record.rsvp_id))
    );
  }, [attendance, filteredRsvpIds]);

  const filteredEventReports = useMemo<EventReport[]>(() => {
    return filteredEvents.map((event) => {
      const targets = filteredTargets.filter(
        (target) =>
          String(target.event_id) === String(event.id)
      );

      const targetIds = new Set(
        targets.map((target) => String(target.id))
      );

      const eventRsvps = filteredRsvps.filter((rsvp) =>
        targetIds.has(String(rsvp.event_municipality_id))
      );

      const rsvpIds = new Set(
        eventRsvps.map((rsvp) => String(rsvp.id))
      );

      const eventAttendance = filteredAttendance.filter(
        (record) => rsvpIds.has(String(record.rsvp_id))
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
        municipalities: targets.map(
          (target) => target.municipality
        ),
        registrations,
        present,
        absent,
        attendanceRate,
      };
    });
  }, [
    filteredEvents,
    filteredTargets,
    filteredRsvps,
    filteredAttendance,
  ]);

  const filteredMunicipalityReports =
    useMemo<MunicipalityReport[]>(() => {
      const municipalityNames = Array.from(
        new Set(
          filteredTargets.map(
            (target) => target.municipality
          )
        )
      ).sort((a, b) => a.localeCompare(b));

      return municipalityNames.map((municipality) => {
        const targets = filteredTargets.filter(
          (target) =>
            target.municipality === municipality
        );

        const targetIds = new Set(
          targets.map((target) => String(target.id))
        );

        const municipalityRsvps =
          filteredRsvps.filter((rsvp) =>
            targetIds.has(
              String(rsvp.event_municipality_id)
            )
          );

        const rsvpIds = new Set(
          municipalityRsvps.map((rsvp) =>
            String(rsvp.id)
          )
        );

        const municipalityAttendance =
          filteredAttendance.filter((record) =>
            rsvpIds.has(String(record.rsvp_id))
          );

        const present =
          municipalityAttendance.filter(
            (record) => record.status === "present"
          ).length;

        const registrations = municipalityRsvps.length;

        const eventsReceived = new Set(
          targets.map((target) =>
            String(target.event_id)
          )
        ).size;

        const prepared = targets.filter(
          (target) =>
            (target.municipal_status || "")
              .trim()
              .toLowerCase() === "prepared"
        ).length;

        const preparationRate =
          eventsReceived > 0
            ? Math.round(
              (prepared / eventsReceived) * 100
            )
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
              ? Math.round(
                (present / registrations) * 100
              )
              : 0,
        };
      });
    }, [
      filteredTargets,
      filteredRsvps,
      filteredAttendance,
    ]);

  const totalRegistrations = filteredRsvps.length;

  const totalPresent = filteredAttendance.filter(
    (record) => record.status === "present"
  ).length;

  const totalAbsent = filteredAttendance.filter(
    (record) => record.status === "absent"
  ).length;

  const overallAttendanceRate =
    totalRegistrations > 0
      ? Math.round(
        (totalPresent / totalRegistrations) * 100
      )
      : 0;

  const totalMunicipalityAssignments =
    filteredTargets.length;

  const totalPreparedAssignments =
    filteredTargets.filter(
      (target) =>
        (target.municipal_status || "")
          .trim()
          .toLowerCase() === "prepared"
    ).length;

  const municipalityPreparationRate =
    totalMunicipalityAssignments > 0
      ? Math.round(
        (totalPreparedAssignments /
          totalMunicipalityAssignments) *
        100
      )
      : 0;

  const eventStatusSummary =
    useMemo<EventStatusSummary>(() => {
      const normalizeStatus = (
        status: string | null
      ) => (status || "").trim().toLowerCase();

      return {
        draft: filteredEvents.filter(
          (event) =>
            normalizeStatus(event.status) === "draft"
        ).length,

        published: filteredEvents.filter(
          (event) =>
            normalizeStatus(event.status) ===
            "published"
        ).length,

        upcoming: filteredEvents.filter(
          (event) =>
            normalizeStatus(event.status) ===
            "upcoming"
        ).length,

        ongoing: filteredEvents.filter(
          (event) =>
            normalizeStatus(event.status) ===
            "ongoing"
        ).length,

        completed: filteredEvents.filter(
          (event) =>
            normalizeStatus(event.status) ===
            "completed"
        ).length,

        cancelled: filteredEvents.filter(
          (event) =>
            normalizeStatus(event.status) ===
            "cancelled"
        ).length,
      };
    }, [filteredEvents]);

  const preparedVsPendingSummary =
    useMemo<PreparedPendingSummary>(() => {
      const prepared = filteredTargets.filter(
        (target) =>
          (target.municipal_status || "")
            .trim()
            .toLowerCase() === "prepared"
      ).length;

      const pending =
        filteredTargets.length - prepared;

      const preparedRate =
        filteredTargets.length > 0
          ? Math.round(
            (prepared /
              filteredTargets.length) *
            100
          )
          : 0;

      const pendingRate =
        filteredTargets.length > 0
          ? Math.round(
            (pending /
              filteredTargets.length) *
            100
          )
          : 0;

      return {
        prepared,
        pending,
        preparedRate,
        pendingRate,
        total: filteredTargets.length,
      };
    }, [filteredTargets]);

  /*
   * Participant Category Breakdown
   *
   * Normal categories are grouped normally.
   *
   * For "others", participant_category_other is used
   * so specific custom categories remain visible:
   *
   * Others — Barangay Health Worker
   * Others — NGO Volunteer
   * etc.
   */
  const participantCategoryBreakdown =
    useMemo<ParticipantCategoryBreakdownItem[]>(
      () => {
        const groups = new Map<
          string,
          {
            key: string;
            category: string;
            categoryLabel: string;
            participantCategoryOther:
            | string
            | null;
            label: string;
            registrations: number;
            present: number;
            absent: number;
          }
        >();

        const breakdownKeyByRsvpId =
          new Map<string, string>();

        filteredRsvps.forEach((rsvp) => {
          const profile = rsvp.user_id
            ? participantProfileById.get(
              String(rsvp.user_id)
            )
            : undefined;

          const category =
            normalizeParticipantCategory(
              profile?.participant_category
            );

          const participantCategoryOther =
            profile?.participant_category_other
              ?.trim() || null;

          let key = category;
          let categoryLabel =
            formatParticipantCategoryLabel(category);
          let label = categoryLabel;

          if (!category) {
            key = "uncategorized";
            categoryLabel = "Uncategorized";
            label = "Uncategorized";
          } else if (category === "others") {
            if (participantCategoryOther) {
              key = `others::${participantCategoryOther.toLowerCase()}`;
              label = `Others — ${participantCategoryOther}`;
            } else {
              key = "others";
              label = "Others";
            }
          }

          const existing = groups.get(key);

          if (existing) {
            existing.registrations += 1;
          } else {
            groups.set(key, {
              key,
              category:
                category || "uncategorized",
              categoryLabel,
              participantCategoryOther,
              label,
              registrations: 1,
              present: 0,
              absent: 0,
            });
          }

          breakdownKeyByRsvpId.set(
            String(rsvp.id),
            key
          );
        });

        filteredAttendance.forEach((record) => {
          const key = breakdownKeyByRsvpId.get(
            String(record.rsvp_id)
          );

          if (!key) {
            return;
          }

          const group = groups.get(key);

          if (!group) {
            return;
          }

          if (record.status === "present") {
            group.present += 1;
          }

          if (record.status === "absent") {
            group.absent += 1;
          }
        });

        const total = filteredRsvps.length;

        return Array.from(groups.values())
          .map((group) => ({
            ...group,

            attendanceRate:
              group.registrations > 0
                ? Math.round(
                  (group.present /
                    group.registrations) *
                  100
                )
                : 0,

            percentage:
              total > 0
                ? Math.round(
                  (group.registrations /
                    total) *
                  100
                )
                : 0,
          }))
          .sort((a, b) => {
            if (
              b.registrations !==
              a.registrations
            ) {
              return (
                b.registrations -
                a.registrations
              );
            }

            return a.label.localeCompare(
              b.label
            );
          });
      },
      [
        filteredRsvps,
        filteredAttendance,
        participantProfileById,
      ]
    );

  const resetFilters = () => {
    setSelectedEventId("all");
    setSelectedMunicipality("all");
    setSelectedParticipantCategory("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    selectedEventId !== "all" ||
    selectedMunicipality !== "all" ||
    selectedParticipantCategory !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  return {
    events,
    municipalityOptions,
    participantCategoryOptions,

    filteredEvents,
    filteredEventReports,
    filteredMunicipalityReports,
    participantCategoryBreakdown,

    loading,
    errorMessage,
    fetchReports,

    selectedEventId,
    setSelectedEventId,

    selectedMunicipality,
    setSelectedMunicipality,

    selectedParticipantCategory,
    setSelectedParticipantCategory,

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