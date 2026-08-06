"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
  MunicipalReportEvent,
  MunicipalReportEventOption,
  MunicipalReportEventStatus,
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
};

type RawAssignment = {
  id?: string | number | null;
  event_id?: string | number | null;
  municipal_status?: string | null;
  registration_open?: boolean | null;
  event?:
  | RawRelatedEvent
  | RawRelatedEvent[]
  | null;
  events?:
  | RawRelatedEvent
  | RawRelatedEvent[]
  | null;
};

type RawRegistration = {
  rsvp_id?: string | number | null;
  event_municipality_id?:
  | string
  | number
  | null;
  event_title?: string | null;
  rsvp_status?: string | null;
};

type RawAttendance = {
  rsvp_id?: string | number | null;
  event_municipality_id?:
  | string
  | number
  | null;
  event_title?: string | null;
  event_status?: string | null;
  attendance_status?: string | null;
  attendance_method?: string | null;
};

type ReportEventBase = {
  eventMunicipalityId: string;
  eventId: string | null;
  eventTitle: string;
  eventStatus: string;
  municipalStatus: string;
  registrationOpen: boolean;
  startAt: string | null;
  endAt: string | null;
};

function normalizeId(
  value:
    | string
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function normalizeValue(
  value:
    | string
    | null
    | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getRelatedEvent(
  assignment: RawAssignment,
) {
  const related =
    assignment.event ??
    assignment.events ??
    null;

  if (Array.isArray(related)) {
    return related[0] ?? null;
  }

  return related;
}

function formatFallbackTitle(
  value: string | null | undefined,
) {
  const title =
    String(value ?? "").trim();

  return title ||
    "Untitled Event";
}

function getDateTimestamp(
  value: string | null,
) {
  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function isAttendanceEligibleStatus(
  status: string,
) {
  const normalizedStatus =
    normalizeValue(status);

  return (
    normalizedStatus === "ongoing" ||
    normalizedStatus === "completed"
  );
}

function calculateSummary(
  events: MunicipalReportEvent[],
): MunicipalReportSummary {
  const summary =
    events.reduce(
      (current, event) => {
        current.assignedEvents += 1;

        /*
         * All registrations remain visible
         * in the general registration total.
         */
        current.totalRegistrations +=
          event.totalRegistrations;

        /*
         * Attendance calculations include
         * ongoing and completed events only.
         *
         * Cancelled and not-yet-started events
         * are excluded from attendance metrics.
         */
        if (
          isAttendanceEligibleStatus(
            event.eventStatus,
          )
        ) {
          current.attendanceEligibleRegistrations +=
            event.totalRegistrations;

          current.presentCount +=
            event.presentCount;

          current.lateCount +=
            event.lateCount;

          current.absentCount +=
            event.absentCount;

          current.pendingCount +=
            event.pendingCount;

          current.qrCheckInCount +=
            event.qrCheckInCount;

          current.manualCheckInCount +=
            event.manualCheckInCount;
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

  summary.attendedCount =
    summary.presentCount +
    summary.lateCount;

  summary.attendanceRate =
    summary.attendanceEligibleRegistrations >
      0
      ? (summary.attendedCount /
        summary.attendanceEligibleRegistrations) *
      100
      : 0;

  return summary;
}

export default function useMunicipalReports() {
  const [
    reportEvents,
    setReportEvents,
  ] = useState<
    MunicipalReportEvent[]
  >([]);

  const [municipality, setMunicipality] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [
    warningMessage,
    setWarningMessage,
  ] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    selectedEventId,
    setSelectedEventId,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<MunicipalReportEventStatus>(
      "all",
    );

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(DEFAULT_PAGE_SIZE);

  const fetchReports = useCallback(
    async (
      showRefreshingState = false,
    ) => {
      if (showRefreshingState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage(null);
      setWarningMessage(null);

      try {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(
            "You must be logged in first.",
          );
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role, municipality")
          .eq("id", user.id)
          .single<MunicipalReportProfile>();

        if (
          profileError ||
          !profile
        ) {
          throw new Error(
            profileError?.message ||
            "Profile not found.",
          );
        }

        if (
          profile.role !==
          "municipal_admin"
        ) {
          throw new Error(
            "Only municipal administrators can view municipal reports.",
          );
        }

        if (!profile.municipality) {
          throw new Error(
            "Your account has no assigned municipality.",
          );
        }

        setMunicipality(
          profile.municipality,
        );

        const [
          assignmentsResult,
          registrationsResult,
          attendanceResult,
        ] = await Promise.all([
          supabase
            .from(
              "event_municipalities",
            )
            .select(`
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
            `)
            .eq(
              "municipality",
              profile.municipality,
            ),

          supabase.rpc(
            "get_municipal_registrations",
            {
              p_event_municipality_id:
                null,
            },
          ),

          supabase.rpc(
            "get_municipal_attendance",
            {
              p_event_municipality_id:
                null,
            },
          ),
        ]);

        if (
          registrationsResult.error
        ) {
          throw registrationsResult.error;
        }

        if (attendanceResult.error) {
          throw attendanceResult.error;
        }

        const assignments =
          (assignmentsResult.data ??
            []) as unknown as RawAssignment[];

        const registrations =
          (registrationsResult.data ??
            []) as RawRegistration[];

        const attendance =
          (attendanceResult.data ??
            []) as RawAttendance[];

        if (
          assignmentsResult.error
        ) {
          console.warn(
            "Municipal report assignment query warning:",
            assignmentsResult.error,
          );

          setWarningMessage(
            "Assigned events could not be loaded directly. The report is using events found in registration and attendance records.",
          );
        }

        const baseMap = new Map<
          string,
          ReportEventBase
        >();

        assignments.forEach(
          (assignment) => {
            const assignmentId =
              normalizeId(
                assignment.id,
              );

            if (!assignmentId) {
              return;
            }

            const relatedEvent =
              getRelatedEvent(
                assignment,
              );

            baseMap.set(
              assignmentId,
              {
                eventMunicipalityId:
                  assignmentId,

                eventId:
                  normalizeId(
                    assignment.event_id ??
                    relatedEvent?.id,
                  ) || null,

                eventTitle:
                  formatFallbackTitle(
                    relatedEvent?.title,
                  ),

                eventStatus:
                  normalizeValue(
                    relatedEvent?.status,
                  ) || "unknown",

                municipalStatus:
                  normalizeValue(
                    assignment.municipal_status,
                  ) || "pending",

                registrationOpen:
                  assignment.registration_open ===
                  true,

                startAt:
                  relatedEvent?.start_at ??
                  null,

                endAt:
                  relatedEvent?.end_at ??
                  null,
              },
            );
          },
        );

        registrations.forEach(
          (registration) => {
            const assignmentId =
              normalizeId(
                registration.event_municipality_id,
              );

            if (
              !assignmentId ||
              baseMap.has(
                assignmentId,
              )
            ) {
              return;
            }

            baseMap.set(
              assignmentId,
              {
                eventMunicipalityId:
                  assignmentId,
                eventId: null,
                eventTitle:
                  formatFallbackTitle(
                    registration.event_title,
                  ),
                eventStatus: "unknown",
                municipalStatus:
                  "unknown",
                registrationOpen:
                  false,
                startAt: null,
                endAt: null,
              },
            );
          },
        );

        attendance.forEach(
          (record) => {
            const assignmentId =
              normalizeId(
                record.event_municipality_id,
              );

            if (!assignmentId) {
              return;
            }

            const existing =
              baseMap.get(
                assignmentId,
              );

            if (existing) {
              if (
                existing.eventStatus ===
                "unknown" &&
                record.event_status
              ) {
                existing.eventStatus =
                  normalizeValue(
                    record.event_status,
                  ) || "unknown";
              }

              return;
            }

            baseMap.set(
              assignmentId,
              {
                eventMunicipalityId:
                  assignmentId,
                eventId: null,
                eventTitle:
                  formatFallbackTitle(
                    record.event_title,
                  ),
                eventStatus:
                  normalizeValue(
                    record.event_status,
                  ) || "unknown",
                municipalStatus:
                  "unknown",
                registrationOpen:
                  false,
                startAt: null,
                endAt: null,
              },
            );
          },
        );

        const registrationsByEvent =
          new Map<
            string,
            RawRegistration[]
          >();

        registrations.forEach(
          (registration) => {
            const assignmentId =
              normalizeId(
                registration.event_municipality_id,
              );

            if (!assignmentId) {
              return;
            }

            const current =
              registrationsByEvent.get(
                assignmentId,
              ) ?? [];

            current.push(registration);

            registrationsByEvent.set(
              assignmentId,
              current,
            );
          },
        );

        const attendanceByEvent =
          new Map<
            string,
            RawAttendance[]
          >();

        attendance.forEach(
          (record) => {
            const assignmentId =
              normalizeId(
                record.event_municipality_id,
              );

            if (!assignmentId) {
              return;
            }

            const current =
              attendanceByEvent.get(
                assignmentId,
              ) ?? [];

            current.push(record);

            attendanceByEvent.set(
              assignmentId,
              current,
            );
          },
        );

        const nextEvents =
          Array.from(
            baseMap.values(),
          ).map(
            (
              base,
            ): MunicipalReportEvent => {
              const eventRegistrations =
                registrationsByEvent.get(
                  base.eventMunicipalityId,
                ) ?? [];

              const eventAttendance =
                attendanceByEvent.get(
                  base.eventMunicipalityId,
                ) ?? [];

              const uniqueRegistrationIds =
                new Set(
                  eventRegistrations.map(
                    (registration, index) =>
                      normalizeId(
                        registration.rsvp_id,
                      ) ||
                      `registration-${index}`,
                  ),
                );

              const uniqueAttendance =
                new Map<
                  string,
                  RawAttendance
                >();

              eventAttendance.forEach(
                (record, index) => {
                  const recordId =
                    normalizeId(
                      record.rsvp_id,
                    ) ||
                    `attendance-${index}`;

                  uniqueAttendance.set(
                    recordId,
                    record,
                  );
                },
              );

              const attendanceRows =
                Array.from(
                  uniqueAttendance.values(),
                );

              const presentCount =
                attendanceRows.filter(
                  (record) =>
                    normalizeValue(
                      record.attendance_status,
                    ) === "present",
                ).length;

              const lateCount =
                attendanceRows.filter(
                  (record) =>
                    normalizeValue(
                      record.attendance_status,
                    ) === "late",
                ).length;

              const absentCount =
                attendanceRows.filter(
                  (record) =>
                    normalizeValue(
                      record.attendance_status,
                    ) === "absent",
                ).length;

              const pendingCount =
                attendanceRows.filter(
                  (record) =>
                    normalizeValue(
                      record.attendance_status,
                    ) === "pending",
                ).length;

              const qrCheckInCount =
                attendanceRows.filter(
                  (record) =>
                    normalizeValue(
                      record.attendance_method,
                    ) === "qr",
                ).length;

              const manualCheckInCount =
                attendanceRows.filter(
                  (record) =>
                    normalizeValue(
                      record.attendance_method,
                    ) === "manual",
                ).length;

              const totalRegistrations =
                uniqueRegistrationIds.size >
                  0
                  ? uniqueRegistrationIds.size
                  : uniqueAttendance.size;

              const attendedCount =
                presentCount +
                lateCount;

              const attendanceRate =
                isAttendanceEligibleStatus(
                  base.eventStatus,
                ) &&
                  totalRegistrations > 0
                  ? (attendedCount /
                    totalRegistrations) *
                  100
                  : 0;

              return {
                ...base,
                totalRegistrations,
                presentCount,
                lateCount,
                absentCount,
                pendingCount,
                qrCheckInCount,
                manualCheckInCount,
                attendanceRate,
              };
            },
          )
            .sort(
              (first, second) =>
                getDateTimestamp(
                  second.startAt,
                ) -
                getDateTimestamp(
                  first.startAt,
                ),
            );

        setReportEvents(
          nextEvents,
        );
      } catch (error) {
        console.error(
          "Municipal reports error:",
          error,
        );

        setReportEvents([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load municipal reports.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    const parameters =
      new URLSearchParams(
        window.location.search,
      );

    const targetEventId =
      parameters
        .get(
          "eventMunicipalityId",
        )
        ?.trim();

    if (targetEventId) {
      setSelectedEventId(
        targetEventId,
      );
    }
  }, []);

  const eventOptions =
    useMemo<
      MunicipalReportEventOption[]
    >(
      () =>
        reportEvents.map(
          (event) => ({
            eventMunicipalityId:
              event.eventMunicipalityId,
            eventTitle:
              event.eventTitle,
          }),
        ),
      [reportEvents],
    );

  const filteredEvents =
    useMemo(() => {
      const normalizedSearch =
        normalizeValue(searchTerm);

      const fromTimestamp =
        dateFrom
          ? new Date(
            `${dateFrom}T00:00:00`,
          ).getTime()
          : null;

      const toTimestamp =
        dateTo
          ? new Date(
            `${dateTo}T23:59:59.999`,
          ).getTime()
          : null;

      return reportEvents.filter(
        (event) => {
          const matchesSearch =
            !normalizedSearch ||
            normalizeValue(
              event.eventTitle,
            ).includes(
              normalizedSearch,
            );

          const matchesEvent =
            selectedEventId ===
            "all" ||
            event.eventMunicipalityId ===
            selectedEventId;

          const matchesStatus =
            statusFilter ===
            "all" ||
            normalizeValue(
              event.eventStatus,
            ) === statusFilter;

          const eventTimestamp =
            getDateTimestamp(
              event.startAt,
            );

          const matchesFrom =
            fromTimestamp === null ||
            (eventTimestamp > 0 &&
              eventTimestamp >=
              fromTimestamp);

          const matchesTo =
            toTimestamp === null ||
            (eventTimestamp > 0 &&
              eventTimestamp <=
              toTimestamp);

          return (
            matchesSearch &&
            matchesEvent &&
            matchesStatus &&
            matchesFrom &&
            matchesTo
          );
        },
      );
    }, [
      dateFrom,
      dateTo,
      reportEvents,
      searchTerm,
      selectedEventId,
      statusFilter,
    ]);

  const summary = useMemo(
    () =>
      calculateSummary(
        filteredEvents,
      ),
    [filteredEvents],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredEvents.length /
      pageSize,
    ),
  );

  const paginatedEvents =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        pageSize;

      return filteredEvents.slice(
        startIndex,
        startIndex + pageSize,
      );
    }, [
      currentPage,
      filteredEvents,
      pageSize,
    ]);

  const firstVisibleItem =
    filteredEvents.length === 0
      ? 0
      : (currentPage - 1) *
      pageSize +
      1;

  const lastVisibleItem = Math.min(
    currentPage * pageSize,
    filteredEvents.length,
  );

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedEventId !== "all" ||
    statusFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    dateFrom,
    dateTo,
    pageSize,
    searchTerm,
    selectedEventId,
    statusFilter,
  ]);

  useEffect(() => {
    setCurrentPage(
      (previousPage) =>
        Math.min(
          previousPage,
          totalPages,
        ),
    );
  }, [totalPages]);

  function changeSelectedEvent(
    value: string,
  ) {
    setSelectedEventId(value);

    const nextUrl =
      value === "all"
        ? "/dashboard/municipal/reports"
        : `/dashboard/municipal/reports?eventMunicipalityId=${encodeURIComponent(
          value,
        )}`;

    window.history.replaceState(
      {},
      "",
      nextUrl,
    );
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedEventId("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);

    window.history.replaceState(
      {},
      "",
      "/dashboard/municipal/reports",
    );
  }

  function changePageSize(
    value: number,
  ) {
    setPageSize(value);
    setCurrentPage(1);
  }

  function goToPreviousPage() {
    setCurrentPage(
      (previousPage) =>
        Math.max(
          1,
          previousPage - 1,
        ),
    );
  }

  function goToNextPage() {
    setCurrentPage(
      (previousPage) =>
        Math.min(
          totalPages,
          previousPage + 1,
        ),
    );
  }

  return {
    reportEvents,
    filteredEvents,
    paginatedEvents,
    eventOptions,
    municipality,
    summary,

    loading,
    refreshing,
    errorMessage,
    warningMessage,

    searchTerm,
    selectedEventId,
    statusFilter,
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
    setDateFrom,
    setDateTo,
    clearFilters,

    changePageSize,
    goToPreviousPage,
    goToNextPage,

    refreshReports: () =>
      fetchReports(true),
  };
}
