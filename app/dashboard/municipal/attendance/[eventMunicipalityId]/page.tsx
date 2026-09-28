"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ArrowLeft, ClipboardCheck } from "lucide-react";

import { supabase } from "@/lib/supabase";

import AttendanceTable from "../components/AttendanceTable";

import type { AttendanceEventGroup } from "../hooks/useMunicipalAttendance";

import type { MunicipalAttendanceRecord } from "../types/municipalAttendance";

export default function EventAttendancePage() {
  const params = useParams<{
    eventMunicipalityId: string;
  }>();

  const eventMunicipalityId = params.eventMunicipalityId;

  const [records, setRecords] = useState<MunicipalAttendanceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAttendance() {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase.rpc("get_municipal_attendance", {
        p_event_municipality_id: eventMunicipalityId,
      });

      if (!isMounted) return;

      if (error) {
        setRecords([]);
        setErrorMessage(error.message);
      } else {
        setRecords((data ?? []) as MunicipalAttendanceRecord[]);
      }

      setLoading(false);
    }

    if (eventMunicipalityId) {
      void loadAttendance();
    }

    return () => {
      isMounted = false;
    };
  }, [eventMunicipalityId]);

  const eventGroup = useMemo<AttendanceEventGroup | null>(() => {
    if (records.length === 0) return null;

    const presentCount = records.filter(
      (record) => record.attendance_status === "present",
    ).length;

    const lateCount = records.filter(
      (record) => record.attendance_status === "late",
    ).length;

    const absentCount = records.filter(
      (record) => record.attendance_status === "absent",
    ).length;

    const pendingCount = records.filter(
      (record) => record.attendance_status === "pending",
    ).length;

    return {
      eventMunicipalityId,
      eventTitle: records[0].event_title || "Untitled Event",
      eventStatus: records[0].event_status || "unknown",
      eventStartDate: records[0].event_start_date ?? null,
      eventEndDate: records[0].event_end_date ?? null,
      records,
      registeredCount: records.length,
      presentCount,
      lateCount,
      absentCount,
      pendingCount,
      qrCheckInCount: records.filter(
        (record) => record.attendance_method === "qr",
      ).length,
      manualCheckInCount: records.filter(
        (record) => record.attendance_method === "manual",
      ).length,
    };
  }, [eventMunicipalityId, records]);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/municipal/attendance"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Attendance
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            <ClipboardCheck className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Event Attendance
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
              {eventGroup?.eventTitle ?? "Attendance Records"}
            </h1>

            {eventGroup && (
              <p className="mt-1 text-sm text-slate-500">
                {eventGroup.registeredCount}{" "}
                {eventGroup.registeredCount === 1
                  ? "participant"
                  : "participants"}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <AttendanceTable
          eventGroups={eventGroup ? [eventGroup] : []}
          loading={loading}
          errorMessage={errorMessage}
        />
      </section>
    </div>
  );
}
