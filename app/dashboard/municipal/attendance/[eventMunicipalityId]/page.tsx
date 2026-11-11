"use client";
import BackgroundDataSync from "@/app/components/live/BackgroundDataSync";
import MunicipalPageHeader from "@/app/dashboard/municipal/components/MunicipalPageHeader";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Search,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import AttendanceTable from "../components/AttendanceTable";

import type { AttendanceEventGroup } from "../hooks/useMunicipalAttendance";

import type {
  AttendanceMethodFilter,
  AttendanceStatusFilter,
  MunicipalAttendanceRecord,
} from "../types/municipalAttendance";

import { filterAttendanceRecords } from "../utils/municipalAttendanceUtils";

const PAGE_SIZE = 10;

type EventDetails = {
  id: string;
  title: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
};

type EventAssignment = {
  id: string;
  event_id: string;
  municipality: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Date not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getEventStatusClass(status: string | null) {
  switch (status?.toLowerCase()) {
    case "completed":
      return "bg-green-50 text-green-700";
    case "ongoing":
      return "bg-blue-50 text-blue-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    case "published":
    case "upcoming":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: string | null) {
  if (!status) return "Unknown";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function EventAttendancePage() {
  const params = useParams<{
    eventMunicipalityId: string;
  }>();

  const eventMunicipalityId = params.eventMunicipalityId;

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [records, setRecords] = useState<MunicipalAttendanceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<AttendanceStatusFilter>("all");
  const [methodFilter, setMethodFilter] =
    useState<AttendanceMethodFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      setLoading(true);
      setErrorMessage(null);

      try {
        if (!eventMunicipalityId) {
          throw new Error("Invalid attendance event.");
        }

        // Verify the Municipal Admin session.
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("Please sign in to view attendance.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, municipality, verification_status")
          .eq("id", user.id)
          .single();

        if (
          profileError ||
          !profile ||
          profile.role !== "municipal_admin" ||
          profile.verification_status !== "approved" ||
          !profile.municipality
        ) {
          throw new Error("An approved Municipal Admin account is required.");
        }

        // Get assignment details independently of attendance rows.
        const { data: assignment, error: assignmentError } = await supabase
          .from("event_municipalities")
          .select("id, event_id, municipality")
          .eq("id", eventMunicipalityId)
          .eq("municipality", profile.municipality)
          .single();

        if (assignmentError || !assignment) {
          throw new Error(
            "The selected event is unavailable for your municipality.",
          );
        }

        const matchedAssignment = assignment as EventAssignment;

        // Load event information and attendance records.
        const [eventResult, attendanceResult] = await Promise.all([
          supabase
            .from("events")
            .select("id, title, status, start_at, end_at")
            .eq("id", matchedAssignment.event_id)
            .single(),

          supabase.rpc("get_municipal_attendance_with_checkout", {
            p_event_municipality_id: eventMunicipalityId,
          }),
        ]);

        if (eventResult.error || !eventResult.data) {
          throw new Error(
            eventResult.error?.message || "Unable to load event information.",
          );
        }

        if (attendanceResult.error) {
          throw attendanceResult.error;
        }

        if (cancelled) return;

        setEvent(eventResult.data as EventDetails);
        setRecords(
          (attendanceResult.data ?? []) as MunicipalAttendanceRecord[],
        );
      } catch (error) {
        if (cancelled) return;

        console.error("Event attendance error:", error);

        setEvent(null);
        setRecords([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load event attendance.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [eventMunicipalityId, revision]);

  // Event-wide totals stay unchanged when table filters change.
  const summary = useMemo(
    () => ({
      registered: records.length,
      present: records.filter(
        (record) => record.attendance_status === "present",
      ).length,
      late: records.filter((record) => record.attendance_status === "late")
        .length,
      absent: records.filter((record) => record.attendance_status === "absent")
        .length,
      pending: records.filter(
        (record) => record.attendance_status === "pending",
      ).length,
    }),
    [records],
  );

  const filteredRecords = useMemo(
    () =>
      filterAttendanceRecords({
        records,
        searchTerm,
        selectedEventId: eventMunicipalityId,
        statusFilter,
        methodFilter,
      }),
    [records, searchTerm, eventMunicipalityId, statusFilter, methodFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));

  const activePage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;

    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, activePage]);

  const eventGroup = useMemo<AttendanceEventGroup | null>(() => {
    if (!event || paginatedRecords.length === 0) {
      return null;
    }

    return {
      eventMunicipalityId,
      eventTitle: event.title || "Untitled Event",
      eventStatus: event.status || "unknown",
      eventStartDate: event.start_at,
      eventEndDate: event.end_at,
      records: paginatedRecords,

      registeredCount: paginatedRecords.length,
      presentCount: paginatedRecords.filter(
        (record) => record.attendance_status === "present",
      ).length,
      lateCount: paginatedRecords.filter(
        (record) => record.attendance_status === "late",
      ).length,
      absentCount: paginatedRecords.filter(
        (record) => record.attendance_status === "absent",
      ).length,
      pendingCount: paginatedRecords.filter(
        (record) => record.attendance_status === "pending",
      ).length,

      qrCheckInCount: paginatedRecords.filter(
        (record) => record.attendance_method === "qr",
      ).length,
      manualCheckInCount: paginatedRecords.filter(
        (record) => record.attendance_method === "manual",
      ).length,
    };
  }, [event, eventMunicipalityId, paginatedRecords]);

  const firstItem =
    filteredRecords.length === 0 ? 0 : (activePage - 1) * PAGE_SIZE + 1;

  const lastItem = Math.min(activePage * PAGE_SIZE, filteredRecords.length);

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setMethodFilter("all");
    setCurrentPage(1);
  }

  const summaryCards = [
    {
      label: "Registered",
      value: summary.registered,
      icon: Users,
      iconClass: "bg-slate-100 text-slate-700",
    },
    {
      label: "Present",
      value: summary.present,
      icon: UserCheck,
      iconClass: "bg-green-50 text-green-700",
    },
    {
      label: "Late",
      value: summary.late,
      icon: Clock3,
      iconClass: "bg-amber-50 text-amber-700",
    },
    {
      label: "Absent",
      value: summary.absent,
      icon: UserX,
      iconClass: "bg-red-50 text-red-700",
    },
  ];

  return (
    <div className="space-y-6">
      <MunicipalPageHeader
        backHref="/dashboard/municipal/attendance"
        backLabel="Back to Attendance"
        icon={<ClipboardCheck className="h-6 w-6" />}
        eyebrow="Event Attendance"
        title={
          loading ? "Loading event..." : event?.title || "Attendance Records"
        }
        description={
          event ? (
            <span className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} />
                {formatDate(event.start_at)}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEventStatusClass(event.status)}`}
              >
                {formatStatus(event.status)}
              </span>
            </span>
          ) : (
            "Review individual attendance and check-out records."
          )
        }
        actions={
          <BackgroundDataSync
            onUpdate={() => setRevision((value) => value + 1)}
            disabled={loading}
          />
        }
      />

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {/* Attendance Summary */}
      {!errorMessage && (
        <section className="mobile-summary-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}
                  >
                    <Icon size={20} />
                  </div>

                  <span className="text-2xl font-bold text-slate-900">
                    {card.value}
                  </span>
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>
              </div>
            );
          })}
        </section>
      )}

      {/* Participant Attendance */}
      {!errorMessage && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Participant Attendance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Attendance records for this event only.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!loading && event && (
                  <Link
                    href={`/dashboard/municipal/reports?eventMunicipalityId=${encodeURIComponent(
                      eventMunicipalityId,
                    )}&view=attendance`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <ClipboardCheck size={16} />
                    View Event Report
                  </Link>
                )}
              </div>
            </div>

            {/* Participant Filters */}
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search participant..."
                  aria-label="Search participant"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as AttendanceStatusFilter);
                  setCurrentPage(1);
                }}
                aria-label="Attendance status"
                className="rounded-xl border border-slate-300 bg-white p-3 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>

              <select
                value={methodFilter}
                onChange={(event) => {
                  setMethodFilter(event.target.value as AttendanceMethodFilter);
                  setCurrentPage(1);
                }}
                aria-label="Time-in method"
                className="rounded-xl border border-slate-300 bg-white p-3 text-sm"
              >
                <option value="all">All Methods</option>
                <option value="qr">QR</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            {(searchTerm ||
              statusFilter !== "all" ||
              methodFilter !== "all") && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm font-semibold text-indigo-700 hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Records */}
          {loading ? (
            <div
              role="status"
              className="p-12 text-center text-sm text-slate-500"
            >
              Loading attendance records...
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={30} className="mx-auto text-slate-400" />

              <h3 className="mt-3 font-semibold text-slate-900">
                No registered participants
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                There are no participant attendance records for this event yet.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="font-semibold text-slate-900">
                No matching attendance records
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <>
              <AttendanceTable
                eventGroups={eventGroup ? [eventGroup] : []}
                loading={false}
                errorMessage={null}
              />

              {/* Participant Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                <p className="text-sm text-slate-500">
                  Showing {firstItem}–{lastItem} of {filteredRecords.length}{" "}
                  records
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={activePage <= 1}
                    onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-slate-600">
                    {activePage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={activePage >= totalPages}
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, activePage + 1))
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
