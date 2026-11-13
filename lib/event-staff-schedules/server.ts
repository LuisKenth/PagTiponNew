import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Called only after the assignments route verifies the approved municipal admin.
export async function loadStaffSchedules(municipality: string) {
  const staffResult = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,verification_status")
    .eq("role", "event_staff")
    .eq("municipality", municipality)
    .order("full_name");
  if (staffResult.error) throw staffResult.error;
  const staff = staffResult.data ?? [];
  const targets = [];
  for (let offset = 0; ; offset += 500) {
    const result = await supabaseAdmin
      .from("event_municipalities")
      .select(
        "id,event_id,municipal_status,local_venue_id,events(id,title,status,start_at,end_at,event_origin)",
      )
      .eq("municipality", municipality)
      .order("id")
      .range(offset, offset + 499);
    if (result.error) throw result.error;
    targets.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) break;
  }
  const venuesResult = await supabaseAdmin
    .from("venues")
    .select("id,venue_name")
    .eq("municipality", municipality);
  if (venuesResult.error) throw venuesResult.error;
  const venues = new Map(
    (venuesResult.data ?? []).map((v) => [v.id, v.venue_name]),
  );
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const targetsById = new Map(targets.map((t) => [t.id, t]));
  const assignments = [];
  // Scope every assignment query to events in the authenticated admin's municipality.
  for (let i = 0; i < targets.length; i += 100) {
    const ids = targets.slice(i, i + 100).map((t) => t.id);
    for (let offset = 0; ; offset += 500) {
      const result = await supabaseAdmin
        .from("event_staff_assignments")
        .select("id,staff_id,event_municipality_id,status")
        .in("event_municipality_id", ids)
        .eq("status", "active")
        .order("id")
        .range(offset, offset + 499);
      if (result.error) throw result.error;
      assignments.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < 500) break;
    }
  }
  const rows = assignments.flatMap((a) => {
    const target = targetsById.get(a.event_municipality_id),
      profile = staffById.get(a.staff_id);
    const event =
      target &&
      (Array.isArray(target.events) ? target.events[0] : target.events);
    if (!target || !event || !profile || event.status === "draft") return [];
    return [
      {
        id: a.id,
        staffId: a.staff_id,
        staffName: profile.full_name || "Unnamed staff",
        staffStatus: profile.verification_status,
        eventMunicipalityId: target.id,
        eventId: event.id,
        title: event.title,
        source: event.event_origin === "municipal" ? "Municipal" : "Provincial",
        start: event.start_at,
        end: event.end_at,
        eventStatus: event.status,
        municipalStatus: target.municipal_status,
        venue: venues.get(target.local_venue_id) || "Unassigned",
      },
    ];
  });
  return { municipality, staff, rows, loadedAt: new Date().toISOString() };
}
