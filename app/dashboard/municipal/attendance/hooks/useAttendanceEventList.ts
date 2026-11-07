
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type EventAssignment = {
  id: string;
  event_id: string;
  municipality: string | null;
};

type EventDetails = {
  id: string;
  title: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
};

type AttendanceRow = {
  event_municipality_id: string | null;
};

export type AttendanceEventItem = {
  eventMunicipalityId: string;
  title: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  registeredCount: number;
};

export default function useAttendanceEventList() {
  const [events, setEvents] = useState<AttendanceEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Please sign in to view attendance.");
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role, municipality, verification_status")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
          throw new Error(
            "Unable to verify your Municipal Admin account.",
          );
        }

        if (
          profile.role !== "municipal_admin" ||
          profile.verification_status !== "approved" ||
          !profile.municipality
        ) {
          throw new Error(
            "An approved Municipal Admin account is required.",
          );
        }

        const [assignmentsResult, attendanceResult] =
          await Promise.all([
            supabase
              .from("event_municipalities")
              .select("id, event_id, municipality")
              .eq("municipality", profile.municipality),

            supabase.rpc("get_municipal_attendance", {
              p_event_municipality_id: null,
            }),
          ]);

        if (assignmentsResult.error) {
          throw assignmentsResult.error;
        }

        if (attendanceResult.error) {
          throw attendanceResult.error;
        }

        const assignments = (
          assignmentsResult.data ?? []
        ) as EventAssignment[];

        const attendanceRows = (
          attendanceResult.data ?? []
        ) as AttendanceRow[];

        const eventIds = [
          ...new Set(
            assignments
              .map((assignment) => assignment.event_id)
              .filter(Boolean),
          ),
        ];

        let eventDetails: EventDetails[] = [];

        if (eventIds.length > 0) {
          const { data, error } = await supabase
            .from("events")
            .select("id, title, status, start_at, end_at")
            .in("id", eventIds);

          if (error) throw error;

          eventDetails = (data ?? []) as EventDetails[];
        }

        const eventsById = new Map(
          eventDetails.map((event) => [event.id, event]),
        );

        const registeredByAssignment = new Map<
          string,
          number
        >();

        for (const record of attendanceRows) {
          const id = record.event_municipality_id;

          if (!id) continue;

          registeredByAssignment.set(
            id,
            (registeredByAssignment.get(id) ?? 0) + 1,
          );
        }

        const eventList: AttendanceEventItem[] = assignments
          .flatMap((assignment) => {
            const event = eventsById.get(assignment.event_id);

            if (!event || event.status === "draft") {
              return [];
            }

            return [
              {
                eventMunicipalityId: assignment.id,
                title: event.title || "Untitled Event",
                status: event.status || "unknown",
                startAt: event.start_at,
                endAt: event.end_at,
                registeredCount:
                  registeredByAssignment.get(assignment.id) ?? 0,
              },
            ];
          })
          .sort((a, b) => {
            const aDate = a.startAt
              ? new Date(a.startAt).getTime()
              : 0;

            const bDate = b.startAt
              ? new Date(b.startAt).getTime()
              : 0;

            return bDate - aDate;
          });

        if (!cancelled) {
          setEvents(eventList);
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Attendance event list error:", error);

        setEvents([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load attendance events.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, [revision]);

  return {
    events,
    loading,
    errorMessage,
    refresh: () => setRevision((value) => value + 1),
  };
}
