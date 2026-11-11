"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";

import type {
  MunicipalParticipantCategoryBreakdownItem,
  MunicipalParticipantCategoryOption,
  MunicipalReportEvent,
  MunicipalReportEventOption,
  MunicipalReportEventStatus,
  MunicipalReportParticipantRow,
  MunicipalReportProfile,
  MunicipalReportSummary,
} from "../types/municipalReports";

const DEFAULT_PAGE_SIZE = 5;

type RawRelatedEvent = {
  id?: string | number | null;
  title?: string | null;
  status?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  event_origin?: "provincial" | "municipal";
};

type RawAssignment = {
  id?: string | number | null;
  event_id?: string | number | null;
  municipal_status?: string | null;
  registration_open?: boolean | null;

  event?: RawRelatedEvent | RawRelatedEvent[] | null;

  events?: RawRelatedEvent | RawRelatedEvent[] | null;
};

type RawRegistration = {
  participant_id?: string | null;
  participant_name?: string | null;
  rsvp_id?: string | number | null;

  event_municipality_id?: string | number | null;

  event_title?: string | null;

  rsvp_status?: string | null;

  participant_category?: string | null;

  participant_category_other?: string | null;
};

type RawAttendance = {
  rsvp_id?: string | number | null;

  event_municipality_id?: string | number | null;

  event_title?: string | null;

  event_status?: string | null;

  attendance_status?: string | null;

  attendance_method?: string | null;
  participant_id?: string | null;
  participant_name?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
};

type ReportEventBase = {
  eventMunicipalityId: string;
  eventId: string | null;
  eventTitle: string;
  eventStatus: string;
  municipalStatus: string;
  registrationOpen: boolean;
  eventOrigin?: "provincial" | "municipal";
  startAt: string | null;
  endAt: string | null;
};

function normalizeId(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeValue(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getRelatedEvent(assignment: RawAssignment) {
  const related = assignment.event ?? assignment.events ?? null;

  if (Array.isArray(related)) {
    return related[0] ?? null;
  }

  return related;
}

function formatFallbackTitle(value: string | null | undefined) {
  const title = String(value ?? "").trim();

  return title || "Untitled Event";
}

function getDateTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isAttendanceEligibleStatus(status: string) {
  const normalizedStatus = normalizeValue(status);

  return normalizedStatus === "ongoing" || normalizedStatus === "completed";
}

function getParticipantCategoryValue(registration: RawRegistration) {
  return normalizeValue(registration.participant_category) || "not_set";
}

const PARTICIPANT_CATEGORY_LABELS: Record<string, string> = {
  farmer: "Farmer",
  senior_citizen: "Senior Citizen",
  "senior citizen": "Senior Citizen",
  "4ps": "4Ps",
  fisherman: "Fisherman",
  others: "Others",
  not_set: "Not Set",
};

function formatParticipantCategoryLabel(value: string) {
  const normalizedValue = normalizeValue(value);

  const knownLabel = PARTICIPANT_CATEGORY_LABELS[normalizedValue];

  if (knownLabel) {
    return knownLabel;
  }

  return normalizedValue
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getUniqueRegistrationRows(registrations: RawRegistration[]) {
  const uniqueRows = new Map<string, RawRegistration>();

  registrations.forEach((registration, index) => {
    const eventMunicipalityId = normalizeId(registration.event_municipality_id);

    const rsvpId = normalizeId(registration.rsvp_id);

    const key = rsvpId || `${eventMunicipalityId}-registration-${index}`;

    uniqueRows.set(key, registration);
  });

  return Array.from(uniqueRows.values());
}

function getUniqueAttendanceRows(attendance: RawAttendance[]) {
  const uniqueRows = new Map<string, RawAttendance>();

  attendance.forEach((record, index) => {
    const eventMunicipalityId = normalizeId(record.event_municipality_id);

    const rsvpId = normalizeId(record.rsvp_id);

    const key = rsvpId || `${eventMunicipalityId}-attendance-${index}`;

    uniqueRows.set(key, record);
  });

  return Array.from(uniqueRows.values());
}

function calculateEventMetrics(
  baseEvent: MunicipalReportEvent,
  registrations: RawRegistration[],
  attendance: RawAttendance[],
): MunicipalReportEvent {
  const uniqueRegistrations = getUniqueRegistrationRows(registrations);

  const ids = new Set(uniqueRegistrations.map((r) => normalizeId(r.rsvp_id)));
  const byId = new Map(
    getUniqueAttendanceRows(attendance)
      .filter((r) => ids.has(normalizeId(r.rsvp_id)))
      .map((r) => [normalizeId(r.rsvp_id), r]),
  );
  const uniqueAttendance = uniqueRegistrations.map((r): RawAttendance => {
    const record = byId.get(normalizeId(r.rsvp_id));
    const status = normalizeValue(record?.attendance_status);
    return {
      ...record,
      rsvp_id: r.rsvp_id,
      attendance_status: ["present", "late"].includes(status)
        ? status
        : baseEvent.eventStatus === "completed"
          ? "absent"
          : "pending",
    };
  });

  const presentCount = uniqueAttendance.filter(
    (record) => normalizeValue(record.attendance_status) === "present",
  ).length;

  const lateCount = uniqueAttendance.filter(
    (record) => normalizeValue(record.attendance_status) === "late",
  ).length;

  const absentCount = uniqueAttendance.filter(
    (record) => normalizeValue(record.attendance_status) === "absent",
  ).length;

  const pendingCount = uniqueAttendance.filter(
    (record) => normalizeValue(record.attendance_status) === "pending",
  ).length;

  const qrCheckInCount = uniqueAttendance.filter(
    (record) =>
      ["present", "late"].includes(normalizeValue(record.attendance_status)) &&
      normalizeValue(record.attendance_method) === "qr",
  ).length;

  const manualCheckInCount = uniqueAttendance.filter(
    (record) =>
      ["present", "late"].includes(normalizeValue(record.attendance_status)) &&
      normalizeValue(record.attendance_method) === "manual",
  ).length;

  const totalRegistrations = uniqueRegistrations.length;

  const attendedCount = presentCount + lateCount;

  const attendanceRate =
    isAttendanceEligibleStatus(baseEvent.eventStatus) && totalRegistrations > 0
      ? (attendedCount / totalRegistrations) * 100
      : 0;

  return {
    ...baseEvent,
    totalRegistrations,
    presentCount,
    lateCount,
    absentCount,
    pendingCount,
    qrCheckInCount,
    manualCheckInCount,
    attendanceRate,
  };
}

function calculateSummary(
  events: MunicipalReportEvent[],
): MunicipalReportSummary {
  const summary = events.reduce(
    (current, event) => {
      current.assignedEvents += 1;

      current.totalRegistrations += event.totalRegistrations;

      if (isAttendanceEligibleStatus(event.eventStatus)) {
        current.attendanceEligibleRegistrations += event.totalRegistrations;

        current.presentCount += event.presentCount;

        current.lateCount += event.lateCount;

        current.absentCount += event.absentCount;

        current.pendingCount += event.pendingCount;

        current.qrCheckInCount += event.qrCheckInCount;

        current.manualCheckInCount += event.manualCheckInCount;
      }

      return current;
    },
    {
      assignedEvents: 0,
      totalRegistrations: 0,
      attendanceEligibleRegistrations: 0,
      attendedCount: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      pendingCount: 0,
      qrCheckInCount: 0,
      manualCheckInCount: 0,
      attendanceRate: 0,
    } satisfies MunicipalReportSummary,
  );

  summary.attendedCount = summary.presentCount + summary.lateCount;

  summary.attendanceRate =
    summary.attendanceEligibleRegistrations > 0
      ? (summary.attendedCount / summary.attendanceEligibleRegistrations) * 100
      : 0;

  return summary;
}

// Read all result pages: municipal reports must not silently stop at the server row limit.
async function readReportPages(
  query: () => {
    range: (
      from: number,
      to: number,
    ) => PromiseLike<{
      data: unknown[] | null;
      error: { message: string } | null;
    }>;
  },
) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 500) {
    const result = await query().range(from, from + 499);
    if (result.error) throw new Error(result.error.message);
    const page = result.data || [];
    rows.push(...page);
    if (page.length < 500) return { data: rows, error: null };
  }
}

export default function useMunicipalReports() {
  const [reportEvents, setReportEvents] = useState<MunicipalReportEvent[]>([]);

  const [registrations, setRegistrations] = useState<RawRegistration[]>([]);

  const [attendanceRecords, setAttendanceRecords] = useState<RawAttendance[]>(
    [],
  );

  const [municipality, setMunicipality] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const reportGeneration = useRef(0);

  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedEventId, setSelectedEventId] = useState("all");

  const [statusFilter, setStatusFilter] =
    useState<MunicipalReportEventStatus>("all");

  const [participantCategoryFilter, setParticipantCategoryFilter] =
    useState("all");

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const fetchReports = useCallback(async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const requestId = ++reportGeneration.current;
    setErrorMessage(null);
    setWarningMessage(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in first.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, municipality")
        .eq("id", user.id)
        .single<MunicipalReportProfile>();

      if (profileError || !profile) {
        throw new Error(profileError?.message || "Profile not found.");
      }

      if (profile.role !== "municipal_admin") {
        throw new Error(
          "Only municipal administrators can view municipal reports.",
        );
      }

      if (!profile.municipality) {
        throw new Error("Your account has no assigned municipality.");
      }

      setMunicipality(profile.municipality);

      const [assignmentsResult, registrationsResult, attendanceResult] =
        await Promise.all([
          readReportPages(() =>
            supabase
              .from("event_municipalities")
              .select(
                `
                id,
                event_id,
                municipal_status,
                registration_open,
                event:events (
                  id,
                  title,
                  status,
                  start_at,
                  end_at
                )
              `,
              )
              .eq("municipality", profile.municipality)
              .order("id"),
          ),

          readReportPages(() =>
            supabase
              .rpc("get_municipal_registrations", {
                p_event_municipality_id: null,
              })
              .order("rsvp_id"),
          ),

          readReportPages(() =>
            supabase
              .rpc("get_municipal_attendance_with_checkout", {
                p_event_municipality_id: null,
              })
              .order("rsvp_id"),
          ),
        ]);

      if (registrationsResult.error) {
        throw registrationsResult.error;
      }

      if (attendanceResult.error) {
        throw attendanceResult.error;
      }

      const assignments = (assignmentsResult.data ??
        []) as unknown as RawAssignment[];

      const nextRegistrations = (
        (registrationsResult.data ?? []) as RawRegistration[]
      ).filter((r) => normalizeValue(r.rsvp_status) === "registered");

      const nextAttendance = (attendanceResult.data ?? []) as RawAttendance[];
      const attendanceIds = new Set(
        nextAttendance.map((r) => normalizeId(r.rsvp_id)),
      );
      for (const r of nextRegistrations) {
        if (!attendanceIds.has(normalizeId(r.rsvp_id)))
          nextAttendance.push({
            rsvp_id: r.rsvp_id,
            event_municipality_id: r.event_municipality_id,
            participant_id: r.participant_id,
            participant_name: r.participant_name,
            attendance_status: "pending",
          });
      }

      // Verify event status against the events table itself. A nested event
      // relationship can be null (for example due to RLS), leaving a draft
      // incorrectly labelled as "unknown" in an assignment fallback.
      if (assignmentsResult.error) {
        throw new Error(
          "Unable to verify municipal event assignments. Please refresh the reports.",
        );
      }

      const assignmentEventIds = Array.from(
        new Set(
          assignments
            .map((assignment) =>
              normalizeId(
                assignment.event_id ?? getRelatedEvent(assignment)?.id,
              ),
            )
            .filter(Boolean),
        ),
      );
      const verifiedEvents = new Map<string, RawRelatedEvent>();

      for (let start = 0; start < assignmentEventIds.length; start += 100) {
        const batch = assignmentEventIds.slice(start, start + 100);
        const { data: verifiedRows, error: verifiedError } = await supabase
          .from("events")
          .select("id,title,status,start_at,end_at,event_origin")
          .in("id", batch);

        if (verifiedError) {
          throw new Error(
            "Unable to verify municipal event statuses. Please refresh the reports.",
          );
        }

        (verifiedRows ?? []).forEach((event) => {
          verifiedEvents.set(normalizeId(event.id), event);
        });
      }

      if (requestId !== reportGeneration.current) return;

      const baseMap = new Map<string, ReportEventBase>();

      assignments.forEach((assignment) => {
        const assignmentId = normalizeId(assignment.id);

        if (!assignmentId) {
          return;
        }

        const relatedEvent = getRelatedEvent(assignment);

        baseMap.set(assignmentId, {
          eventMunicipalityId: assignmentId,

          eventId: normalizeId(assignment.event_id ?? relatedEvent?.id) || null,

          eventTitle: formatFallbackTitle(relatedEvent?.title),

          eventStatus: normalizeValue(relatedEvent?.status) || "unknown",

          municipalStatus:
            normalizeValue(assignment.municipal_status) || "pending",

          registrationOpen: assignment.registration_open === true,

          startAt: relatedEvent?.start_at ?? null,

          endAt: relatedEvent?.end_at ?? null,
        });
      });

      nextRegistrations.forEach((registration) => {
        const assignmentId = normalizeId(registration.event_municipality_id);

        if (!assignmentId || baseMap.has(assignmentId)) {
          return;
        }

        baseMap.set(assignmentId, {
          eventMunicipalityId: assignmentId,

          eventId: null,

          eventTitle: formatFallbackTitle(registration.event_title),

          eventStatus: "unknown",

          municipalStatus: "unknown",

          registrationOpen: false,

          startAt: null,

          endAt: null,
        });
      });

      nextAttendance.forEach((record) => {
        const assignmentId = normalizeId(record.event_municipality_id);

        if (!assignmentId) {
          return;
        }

        const existing = baseMap.get(assignmentId);

        if (existing) {
          if (existing.eventStatus === "unknown" && record.event_status) {
            existing.eventStatus =
              normalizeValue(record.event_status) || "unknown";
          }

          return;
        }

        baseMap.set(assignmentId, {
          eventMunicipalityId: assignmentId,

          eventId: null,

          eventTitle: formatFallbackTitle(record.event_title),

          eventStatus: normalizeValue(record.event_status) || "unknown",

          municipalStatus: "unknown",

          registrationOpen: false,

          startAt: null,

          endAt: null,
        });
      });

      const registrationsByEvent = new Map<string, RawRegistration[]>();

      nextRegistrations.forEach((registration) => {
        const assignmentId = normalizeId(registration.event_municipality_id);

        if (!assignmentId) {
          return;
        }

        const current = registrationsByEvent.get(assignmentId) ?? [];

        current.push(registration);

        registrationsByEvent.set(assignmentId, current);
      });

      const attendanceByEvent = new Map<string, RawAttendance[]>();

      nextAttendance.forEach((record) => {
        const assignmentId = normalizeId(record.event_municipality_id);

        if (!assignmentId) {
          return;
        }

        const current = attendanceByEvent.get(assignmentId) ?? [];

        current.push(record);

        attendanceByEvent.set(assignmentId, current);
      });

      const nextEvents = Array.from(baseMap.values())
        .map((base): ReportEventBase | null => {
          const verified = verifiedEvents.get(normalizeId(base.eventId));
          const status = normalizeValue(verified?.status);

          // Drafts and unverified events must not enter official analytics.
          if (
            !verified ||
            !status ||
            status === "draft" ||
            status === "cancelled" ||
            base.municipalStatus === "cancelled"
          )
            return null;

          return {
            ...base,
            eventTitle: formatFallbackTitle(verified.title),
            eventOrigin: verified.event_origin || "provincial",
            eventStatus:
              status === "completed"
                ? status
                : Date.parse(verified.end_at || "") <= Date.now()
                  ? "completed"
                  : Date.parse(verified.start_at || "") <= Date.now()
                    ? "ongoing"
                    : "upcoming",
            startAt: verified.start_at ?? null,
            endAt: verified.end_at ?? null,
          };
        })
        .filter((base): base is ReportEventBase => base !== null)
        .map((base): MunicipalReportEvent => {
          const eventRegistrations =
            registrationsByEvent.get(base.eventMunicipalityId) ?? [];

          const eventAttendance =
            attendanceByEvent.get(base.eventMunicipalityId) ?? [];

          return calculateEventMetrics(
            {
              ...base,
              totalRegistrations: 0,
              presentCount: 0,
              lateCount: 0,
              absentCount: 0,
              pendingCount: 0,
              qrCheckInCount: 0,
              manualCheckInCount: 0,
              attendanceRate: 0,
            },
            eventRegistrations,
            eventAttendance,
          );
        })
        .sort(
          (first, second) =>
            getDateTimestamp(second.startAt) - getDateTimestamp(first.startAt),
        );

      if (requestId !== reportGeneration.current) return;

      // Use only non-draft events for participant statistics.
      const visibleAssignmentIds = new Set(
        nextEvents.map((event) => event.eventMunicipalityId),
      );

      // Exclude registrations belonging to draft events.
      setRegistrations(
        nextRegistrations.filter((registration) =>
          visibleAssignmentIds.has(
            normalizeId(registration.event_municipality_id),
          ),
        ),
      );

      // Exclude attendance records belonging to draft events.
      setAttendanceRecords(
        nextAttendance.filter((record) =>
          visibleAssignmentIds.has(normalizeId(record.event_municipality_id)),
        ),
      );

      // Update event reports.
      setReportEvents(nextEvents);
      setLastUpdatedAt(Date.now());
    } catch (error) {
      if (requestId !== reportGeneration.current) return;
      console.error("Municipal reports error:", error);

      setReportEvents([]);

      setRegistrations([]);

      setAttendanceRecords([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load municipal reports.",
      );
    } finally {
      if (requestId === reportGeneration.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchReports();
    return () => {
      reportGeneration.current += 1;
    };
  }, [fetchReports]);

  // Realtime updates when tables are published, with a visibility-aware
  // 60-second fallback. All actual data is fetched through existing
  // municipality-restricted queries / RPC authorization.
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const update = () => {
      if (document.visibilityState !== "visible") return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        void fetchReports(true);
      }, 750);
    };
    const channel = supabase
      .channel("municipal-objective4-report-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        update,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps" },
        update,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        update,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_municipalities" },
        update,
      )
      .subscribe();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchReports(true);
    }, 60_000);
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      if (debounce) clearTimeout(debounce);
      window.clearInterval(poll);
      window.removeEventListener("focus", update);
      window.removeEventListener("online", update);
      document.removeEventListener("visibilitychange", update);
      void supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);

    const targetEventId = parameters.get("eventMunicipalityId")?.trim();

    if (targetEventId) {
      setSelectedEventId(targetEventId);
    }
  }, []);

  const eventOptions = useMemo<MunicipalReportEventOption[]>(
    () =>
      reportEvents.map((event) => ({
        eventMunicipalityId: event.eventMunicipalityId,
        eventTitle: event.eventTitle,
        startAt: event.startAt,
        eventStatus: event.eventStatus,
      })),
    [reportEvents],
  );

  const participantCategoryOptions = useMemo<
    MunicipalParticipantCategoryOption[]
  >(() => {
    const values = Array.from(
      new Set(
        registrations.map((registration) =>
          getParticipantCategoryValue(registration),
        ),
      ),
    );

    return values
      .map((value) => ({
        value,

        label: formatParticipantCategoryLabel(value),
      }))
      .sort((first, second) => first.label.localeCompare(second.label));
  }, [registrations]);

  const eventFilteredEvents = useMemo(() => {
    const normalizedSearch = normalizeValue(searchTerm);

    const fromTimestamp = dateFrom
      ? new Date(`${dateFrom}T00:00:00+08:00`).getTime()
      : null;

    const toTimestamp = dateTo
      ? new Date(`${dateTo}T23:59:59.999+08:00`).getTime()
      : null;

    return reportEvents.filter((event) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeValue(event.eventTitle).includes(normalizedSearch);

      const matchesEvent =
        selectedEventId === "all" ||
        event.eventMunicipalityId === selectedEventId;

      const matchesStatus =
        statusFilter === "all" ||
        normalizeValue(event.eventStatus) === statusFilter;

      const eventTimestamp = getDateTimestamp(event.startAt);

      const matchesFrom =
        fromTimestamp === null ||
        (eventTimestamp > 0 && eventTimestamp >= fromTimestamp);

      const matchesTo =
        toTimestamp === null ||
        (eventTimestamp > 0 && eventTimestamp <= toTimestamp);

      return (
        !(dateFrom && dateTo && dateFrom > dateTo) &&
        matchesSearch &&
        matchesEvent &&
        matchesStatus &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    dateFrom,
    dateTo,
    reportEvents,
    searchTerm,
    selectedEventId,
    statusFilter,
  ]);

  const filteredEvents = useMemo(() => {
    if (participantCategoryFilter === "all") {
      return eventFilteredEvents;
    }

    return eventFilteredEvents
      .map((event): MunicipalReportEvent | null => {
        const eventRegistrations = registrations.filter(
          (registration) =>
            normalizeId(registration.event_municipality_id) ===
              event.eventMunicipalityId &&
            getParticipantCategoryValue(registration) ===
              participantCategoryFilter,
        );

        const uniqueRegistrations =
          getUniqueRegistrationRows(eventRegistrations);

        if (uniqueRegistrations.length === 0) {
          return null;
        }

        const matchingRsvpIds = new Set(
          uniqueRegistrations
            .map((registration) => normalizeId(registration.rsvp_id))
            .filter(Boolean),
        );

        const eventAttendance = attendanceRecords.filter((record) => {
          if (
            normalizeId(record.event_municipality_id) !==
            event.eventMunicipalityId
          ) {
            return false;
          }

          const rsvpId = normalizeId(record.rsvp_id);

          return Boolean(rsvpId) && matchingRsvpIds.has(rsvpId);
        });

        return calculateEventMetrics(
          event,
          uniqueRegistrations,
          eventAttendance,
        );
      })
      .filter((event): event is MunicipalReportEvent => event !== null);
  }, [
    attendanceRecords,
    eventFilteredEvents,
    participantCategoryFilter,
    registrations,
  ]);

  const participantCategoryBreakdown = useMemo<
    MunicipalParticipantCategoryBreakdownItem[]
  >(() => {
    const visibleAssignmentIds = new Set(
      eventFilteredEvents.map((event) => event.eventMunicipalityId),
    );

    const relevantRegistrations = getUniqueRegistrationRows(
      registrations.filter((registration) => {
        const assignmentId = normalizeId(registration.event_municipality_id);

        if (!visibleAssignmentIds.has(assignmentId)) {
          return false;
        }

        if (participantCategoryFilter === "all") {
          return true;
        }

        return (
          getParticipantCategoryValue(registration) ===
          participantCategoryFilter
        );
      }),
    );

    const breakdownMap = new Map<
      string,
      {
        count: number;

        details: Map<string, number>;
      }
    >();

    relevantRegistrations.forEach((registration) => {
      const value = getParticipantCategoryValue(registration);

      const current = breakdownMap.get(value) ?? {
        count: 0,

        details: new Map<string, number>(),
      };

      current.count += 1;

      if (value === "others") {
        const detailLabel =
          String(registration.participant_category_other ?? "").trim() ||
          "Unspecified";

        current.details.set(
          detailLabel,
          (current.details.get(detailLabel) ?? 0) + 1,
        );
      }

      breakdownMap.set(value, current);
    });

    const total = relevantRegistrations.length;

    return Array.from(breakdownMap.entries())
      .map(([value, item]) => ({
        value,

        label: formatParticipantCategoryLabel(value),

        count: item.count,

        percentage: total > 0 ? (item.count / total) * 100 : 0,

        details: Array.from(item.details.entries())
          .map(([label, count]) => ({
            label,

            count,
          }))
          .sort(
            (first, second) =>
              second.count - first.count ||
              first.label.localeCompare(second.label),
          ),
      }))
      .sort(
        (first, second) =>
          second.count - first.count || first.label.localeCompare(second.label),
      );
  }, [eventFilteredEvents, participantCategoryFilter, registrations]);

  const summary = useMemo(
    () => calculateSummary(filteredEvents),
    [filteredEvents],
  );

  // Participant-level detail uses the same secured municipal attendance RPC
  // and respects the current event/category filters. No cross-town queries.
  const participantRows = useMemo<MunicipalReportParticipantRow[]>(() => {
    const includedEvents = new Map(
      filteredEvents.map((e) => [e.eventMunicipalityId, e]),
    );
    const categoryByRsvp = new Map(
      getUniqueRegistrationRows(registrations).map((r) => [
        normalizeId(r.rsvp_id),
        getParticipantCategoryValue(r),
      ]),
    );
    const unique = new Map<string, MunicipalReportParticipantRow>();
    const eligibleIds = new Set(
      registrations.map((r) => normalizeId(r.rsvp_id)),
    );
    getUniqueAttendanceRows(attendanceRecords)
      .filter((r) => eligibleIds.has(normalizeId(r.rsvp_id)))
      .forEach((r, idx) => {
        const eventMunicipalityId = normalizeId(r.event_municipality_id);
        const matchedEvent = includedEvents.get(eventMunicipalityId);
        if (!matchedEvent) return;
        const rsvpId = normalizeId(r.rsvp_id);
        const category = categoryByRsvp.get(rsvpId) ?? "not_set";
        if (
          participantCategoryFilter !== "all" &&
          category !== participantCategoryFilter
        )
          return;
        const participantId = normalizeId(r.participant_id);
        const record: MunicipalReportParticipantRow = {
          rsvpId,
          participantId,
          participantName:
            String(r.participant_name ?? "").trim() || "Unnamed participant",
          eventMunicipalityId,
          eventTitle: matchedEvent.eventTitle,
          attendanceStatus: ["present", "late"].includes(
            normalizeValue(r.attendance_status),
          )
            ? normalizeValue(r.attendance_status)
            : matchedEvent.eventStatus === "completed"
              ? "absent"
              : "pending",
          method: normalizeValue(r.attendance_method) || null,
          checkedInAt: r.checked_in_at ?? null,
          checkedOutAt: r.checked_out_at ?? null,
          category,
          categoryLabel: formatParticipantCategoryLabel(category),
        };
        unique.set(
          rsvpId || `${eventMunicipalityId}-${participantId || idx}`,
          record,
        );
      });
    return [...unique.values()].sort(
      (a, b) =>
        a.participantName.localeCompare(b.participantName) ||
        a.eventTitle.localeCompare(b.eventTitle),
    );
  }, [
    attendanceRecords,
    filteredEvents,
    participantCategoryFilter,
    registrations,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredEvents.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredEvents, pageSize]);

  const firstVisibleItem =
    filteredEvents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const lastVisibleItem = Math.min(
    currentPage * pageSize,
    filteredEvents.length,
  );

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedEventId !== "all" ||
    statusFilter !== "all" ||
    participantCategoryFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    dateFrom,
    dateTo,
    pageSize,
    participantCategoryFilter,
    searchTerm,
    selectedEventId,
    statusFilter,
  ]);

  useEffect(() => {
    setCurrentPage((previousPage) => Math.min(previousPage, totalPages));
  }, [totalPages]);

  function changeSelectedEvent(value: string) {
    setSelectedEventId(value);

    const nextUrl =
      value === "all"
        ? "/dashboard/municipal/reports"
        : `/dashboard/municipal/reports?eventMunicipalityId=${encodeURIComponent(
            value,
          )}`;

    window.history.replaceState({}, "", nextUrl);
  }

  function clearFilters() {
    setSearchTerm("");

    setSelectedEventId("all");

    setStatusFilter("all");

    setParticipantCategoryFilter("all");

    setDateFrom("");

    setDateTo("");

    setCurrentPage(1);

    window.history.replaceState({}, "", "/dashboard/municipal/reports");
  }

  function changePageSize(value: number) {
    setPageSize(value);

    setCurrentPage(1);
  }

  function goToPreviousPage() {
    setCurrentPage((previousPage) => Math.max(1, previousPage - 1));
  }

  function goToNextPage() {
    setCurrentPage((previousPage) => Math.min(totalPages, previousPage + 1));
  }

  return {
    reportEvents,

    filteredEvents,

    paginatedEvents,

    eventOptions,

    municipality,

    summary,

    participantCategoryOptions,

    participantCategoryBreakdown,
    participantRows,
    lastUpdatedAt,

    loading,

    refreshing,

    errorMessage,

    warningMessage,

    searchTerm,

    selectedEventId,

    statusFilter,

    participantCategoryFilter,

    dateFrom,

    dateTo,

    currentPage,

    pageSize,

    totalPages,

    firstVisibleItem,

    lastVisibleItem,

    hasActiveFilters,

    setSearchTerm,

    changeSelectedEvent,

    setStatusFilter,

    setParticipantCategoryFilter,

    setDateFrom,

    setDateTo,

    clearFilters,

    changePageSize,

    goToPreviousPage,

    goToNextPage,

    refreshReports: () => fetchReports(true),
  };
}
