"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
  AttendanceMethodFilter,
  AttendanceStatusFilter,
  MunicipalAttendanceRecord,
} from "../types/municipalAttendance";

import {
  buildAttendanceEventOptions,
  calculateAttendanceSummary,
  filterAttendanceRecords,
} from "../utils/municipalAttendanceUtils";

const DEFAULT_PAGE_SIZE = 10;

export type AttendanceEventGroup = {
  eventMunicipalityId: string;
  eventTitle: string;
  eventStatus: string;
  records: MunicipalAttendanceRecord[];

  registeredCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  pendingCount: number;

  qrCheckInCount: number;
  manualCheckInCount: number;
};

export default function useMunicipalAttendance() {
  const [
    attendanceRecords,
    setAttendanceRecords,
  ] = useState<
    MunicipalAttendanceRecord[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

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
    useState<AttendanceStatusFilter>(
      "all",
    );

  const [
    methodFilter,
    setMethodFilter,
  ] =
    useState<AttendanceMethodFilter>(
      "all",
    );

  const [currentPage, setCurrentPage] =
    useState(1);

  /*
   * Page size now represents the number
   * of event groups displayed per page.
   */
  const [pageSize, setPageSize] =
    useState(DEFAULT_PAGE_SIZE);

  const fetchAttendance =
    useCallback(
      async (
        showRefreshingState = false,
      ) => {
        if (showRefreshingState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage(null);

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "get_municipal_attendance",
            {
              p_event_municipality_id:
                null,
            },
          );

          if (error) {
            throw error;
          }

          setAttendanceRecords(
            (data ??
              []) as MunicipalAttendanceRecord[],
          );
        } catch (error) {
          console.error(
            "Municipal attendance error:",
            error,
          );

          setAttendanceRecords([]);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load municipal attendance records.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  /*
   * Supports:
   *
   * /dashboard/municipal/attendance
   * ?eventMunicipalityId=...
   */
  useEffect(() => {
    const searchParameters =
      new URLSearchParams(
        window.location.search,
      );

    const targetEventId =
      searchParameters
        .get("eventMunicipalityId")
        ?.trim();

    if (targetEventId) {
      setSelectedEventId(
        targetEventId,
      );
    }
  }, []);

  const eventOptions = useMemo(
    () =>
      buildAttendanceEventOptions(
        attendanceRecords,
      ),
    [attendanceRecords],
  );

  const filteredAttendanceRecords =
    useMemo(
      () =>
        filterAttendanceRecords({
          records:
            attendanceRecords,
          searchTerm,
          selectedEventId,
          statusFilter,
          methodFilter,
        }),
      [
        attendanceRecords,
        methodFilter,
        searchTerm,
        selectedEventId,
        statusFilter,
      ],
    );

  /*
   * Overall cards remain based on all
   * currently filtered participant records.
   */
  const attendanceSummary = useMemo(
    () =>
      calculateAttendanceSummary(
        filteredAttendanceRecords,
      ),
    [filteredAttendanceRecords],
  );

  /*
   * Group the filtered records according
   * to event_municipalities assignment.
   */
  const groupedAttendanceRecords =
    useMemo<AttendanceEventGroup[]>(
      () => {
        const groupMap = new Map<
          string,
          MunicipalAttendanceRecord[]
        >();

        filteredAttendanceRecords.forEach(
          (record) => {
            const eventMunicipalityId =
              String(
                record.event_municipality_id ??
                  "",
              ).trim();

            /*
             * The event assignment ID should
             * normally exist. Event title is
             * retained as a defensive fallback.
             */
            const groupKey =
              eventMunicipalityId ||
              `event-title:${record.event_title}`;

            const currentRecords =
              groupMap.get(groupKey) ??
              [];

            currentRecords.push(record);

            groupMap.set(
              groupKey,
              currentRecords,
            );
          },
        );

        return Array.from(
          groupMap.entries(),
        ).map(
          ([
            groupKey,
            eventRecords,
          ]) => {
            const firstRecord =
              eventRecords[0];

            const presentCount =
              eventRecords.filter(
                (record) =>
                  record.attendance_status ===
                  "present",
              ).length;

            const lateCount =
              eventRecords.filter(
                (record) =>
                  record.attendance_status ===
                  "late",
              ).length;

            const absentCount =
              eventRecords.filter(
                (record) =>
                  record.attendance_status ===
                  "absent",
              ).length;

            const pendingCount =
              eventRecords.filter(
                (record) =>
                  record.attendance_status ===
                  "pending",
              ).length;

            const qrCheckInCount =
              eventRecords.filter(
                (record) =>
                  record.attendance_method ===
                  "qr",
              ).length;

            const manualCheckInCount =
              eventRecords.filter(
                (record) =>
                  record.attendance_method ===
                  "manual",
              ).length;

            return {
              eventMunicipalityId:
                groupKey,

              eventTitle:
                firstRecord
                  ?.event_title ||
                "Untitled Event",

              eventStatus:
                firstRecord
                  ?.event_status ||
                "unknown",

              records: eventRecords,

              registeredCount:
                eventRecords.length,

              presentCount,
              lateCount,
              absentCount,
              pendingCount,

              qrCheckInCount,
              manualCheckInCount,
            };
          },
        );
      },
      [filteredAttendanceRecords],
    );

  /*
   * Pagination now uses event groups.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(
      groupedAttendanceRecords.length /
        pageSize,
    ),
  );

  const paginatedEventGroups =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        pageSize;

      return groupedAttendanceRecords.slice(
        startIndex,
        startIndex + pageSize,
      );
    }, [
      currentPage,
      groupedAttendanceRecords,
      pageSize,
    ]);

  const firstVisibleItem =
    groupedAttendanceRecords.length ===
    0
      ? 0
      : (currentPage - 1) *
          pageSize +
        1;

  const lastVisibleItem = Math.min(
    currentPage * pageSize,
    groupedAttendanceRecords.length,
  );

  const selectedEvent =
    selectedEventId === "all"
      ? null
      : eventOptions.find(
          (eventOption) =>
            eventOption.event_municipality_id ===
            selectedEventId,
        ) ?? null;

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedEventId !== "all" ||
    statusFilter !== "all" ||
    methodFilter !== "all";

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedEventId,
    statusFilter,
    methodFilter,
    pageSize,
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

  function clearFilters() {
    setSearchTerm("");
    setSelectedEventId("all");
    setStatusFilter("all");
    setMethodFilter("all");
    setCurrentPage(1);

    window.history.replaceState(
      {},
      "",
      "/dashboard/municipal/attendance",
    );
  }

  function changeSelectedEvent(
    value: string,
  ) {
    setSelectedEventId(value);
    setCurrentPage(1);

    const nextUrl =
      value === "all"
        ? "/dashboard/municipal/attendance"
        : `/dashboard/municipal/attendance?eventMunicipalityId=${encodeURIComponent(
            value,
          )}`;

    window.history.replaceState(
      {},
      "",
      nextUrl,
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
    attendanceRecords,
    filteredAttendanceRecords,

    groupedAttendanceRecords,
    paginatedEventGroups,

    eventOptions,
    selectedEvent,
    attendanceSummary,

    loading,
    refreshing,
    errorMessage,

    searchTerm,
    selectedEventId,
    statusFilter,
    methodFilter,

    currentPage,
    pageSize,
    totalPages,
    firstVisibleItem,
    lastVisibleItem,

    hasActiveFilters,

    setSearchTerm,
    changeSelectedEvent,
    setStatusFilter,
    setMethodFilter,
    clearFilters,

    changePageSize,
    goToPreviousPage,
    goToNextPage,

    refreshAttendance: () =>
      fetchAttendance(true),
  };
}