"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  AttendanceRow,
  EventMunicipalityRow,
  EventRow,
  Profile,
  ProvincialDashboardStats,
  RSVPRow,
} from "../types";
import { getEventStatus } from "../utils";

const EMPTY_STATS: ProvincialDashboardStats = {
  totalEvents: 0,
  upcomingEvents: 0,
  activeMunicipalities: 0,
  totalTargetMunicipalities: 0,
  preparedMunicipalities: 0,
  openRegistrations: 0,
  totalRegistrations: 0,
  presentAttendance: 0,
  attendanceRate: 0,
};

export function useProvincialDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventMunicipalities, setEventMunicipalities] = useState<
    EventMunicipalityRow[]
  >([]);
  const [rsvps, setRsvps] = useState<RSVPRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in first.");
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, municipality")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData) {
      setMessage(profileError?.message || "Profile not found.");
      setLoading(false);
      return;
    }

    if (profileData.role !== "provincial_admin") {
      setMessage("Only provincial admins can access this dashboard.");
      setLoading(false);
      return;
    }

    setProfile(profileData as Profile);

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (eventError) {
      setMessage(eventError.message);
      setLoading(false);
      return;
    }

    const cleanEvents = (eventData || []) as EventRow[];
    setEvents(cleanEvents);

    const eventIds = cleanEvents.map((event) => event.id);

    if (eventIds.length === 0) {
      setEventMunicipalities([]);
      setRsvps([]);
      setAttendance([]);
      setLoading(false);
      return;
    }

    const {
      data: eventMunicipalityData,
      error: eventMunicipalityError,
    } = await supabase
      .from("event_municipalities")
      .select("*")
      .in("event_id", eventIds);

    if (eventMunicipalityError) {
      setMessage(eventMunicipalityError.message);
      setEventMunicipalities([]);
      setRsvps([]);
      setAttendance([]);
      setLoading(false);
      return;
    }

    const cleanEventMunicipalities =
      (eventMunicipalityData || []) as EventMunicipalityRow[];

    setEventMunicipalities(cleanEventMunicipalities);

    const eventMunicipalityIds = cleanEventMunicipalities
      .map((item) => item.id)
      .filter(
        (id): id is string | number =>
          id !== null && id !== undefined
      );

    if (eventMunicipalityIds.length === 0) {
      setRsvps([]);
      setAttendance([]);
      setLoading(false);
      return;
    }

    const { data: rsvpData, error: rsvpError } = await supabase
      .from("rsvps")
      .select("*")
      .in("event_municipality_id", eventMunicipalityIds);

    if (rsvpError) {
      setMessage(rsvpError.message);
      setRsvps([]);
      setAttendance([]);
      setLoading(false);
      return;
    }

    const cleanRsvps = (rsvpData || []) as RSVPRow[];
    setRsvps(cleanRsvps);

    const rsvpIds = cleanRsvps
      .map((rsvp) => rsvp.id)
      .filter(
        (id): id is string | number =>
          id !== null && id !== undefined
      );

    if (rsvpIds.length === 0) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    const { data: attendanceData, error: attendanceError } =
      await supabase
        .from("attendance")
        .select("*")
        .in("rsvp_id", rsvpIds);

    if (attendanceError) {
      setMessage(attendanceError.message);
      setAttendance([]);
    } else {
      setAttendance((attendanceData || []) as AttendanceRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
    setNow(new Date());
  }, []);

  const stats = useMemo<ProvincialDashboardStats>(() => {
    if (
      events.length === 0 &&
      eventMunicipalities.length === 0 &&
      rsvps.length === 0 &&
      attendance.length === 0
    ) {
      return EMPTY_STATS;
    }

    const totalEvents = events.length;

    const upcomingEvents = events.filter(
      (event) => getEventStatus(event, now) === "upcoming"
    ).length;

    const uniqueMunicipalities = new Set(
      eventMunicipalities
        .map((item) => item.municipality?.trim().toLowerCase())
        .filter(
          (municipality): municipality is string =>
            Boolean(municipality)
        )
    );

    const preparedMunicipalities = eventMunicipalities.filter((item) => {
      const status = String(item.status || "").toLowerCase();
      const registrationStatus = String(
        item.registration_status || ""
      ).toLowerCase();

      return (
        status === "prepared" ||
        status === "ready" ||
        status === "registration_open" ||
        registrationStatus === "open"
      );
    }).length;

    const openRegistrations = eventMunicipalities.filter((item) => {
      const status = String(item.status || "").toLowerCase();
      const registrationStatus = String(
        item.registration_status || ""
      ).toLowerCase();

      return (
        status === "registration_open" ||
        registrationStatus === "open"
      );
    }).length;

    const totalRegistrations = rsvps.length;

    const presentAttendance = attendance.filter(
      (record) =>
        String(record.status || "").toLowerCase() === "present"
    ).length;

    const attendanceRate =
      totalRegistrations > 0
        ? Math.round((presentAttendance / totalRegistrations) * 100)
        : 0;

    return {
      totalEvents,
      upcomingEvents,
      activeMunicipalities: uniqueMunicipalities.size,
      totalTargetMunicipalities: eventMunicipalities.length,
      preparedMunicipalities,
      openRegistrations,
      totalRegistrations,
      presentAttendance,
      attendanceRate,
    };
  }, [events, eventMunicipalities, rsvps, attendance, now]);

  return {
    profile,
    events,
    eventMunicipalities,
    rsvps,
    attendance,
    loading,
    message,
    stats,
    reload: loadDashboard,
  };
}
