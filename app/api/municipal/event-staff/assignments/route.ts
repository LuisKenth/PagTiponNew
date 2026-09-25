import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type MunicipalAdminProfile = {
  id: string;
  municipality: string;
};

type AssignmentRequestBody = {
  eventMunicipalityId?: string;
  staffId?: string;
};

type RemoveAssignmentBody = {
  assignmentId?: string;
  action?: "remove";
};

type StaffEmailDeliveryResult = {
  ok: boolean;
  provider: "brevo";
  sent: number;
  failed: number;
  skippedAlreadySent: number;
  skippedInProgress: number;
  recipientEmail: string | null;
  message: string;
  error: string | null;
};

type EventDetails = {
  id: string;
  title: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
};

type RawMunicipalEvent = {
  id: string;
  event_id: string;
  municipality: string;
  municipal_status: string | null;
  preparation_status: string | null;
  local_venue_id: string | null;
  local_instructions: string | null;
  events: EventDetails | EventDetails[] | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeValue(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeEvent(
  event: EventDetails | EventDetails[] | null,
) {
  if (Array.isArray(event)) {
    return event[0] ?? null;
  }

  return event;
}

async function authorizeMunicipalAdmin(request: Request): Promise<
  | {
      admin: MunicipalAdminProfile;
      accessToken: string;
    }
  | {
      response: NextResponse;
    }
> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      response: NextResponse.json(
        {
          error: "Authentication is required.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  const accessToken = authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    return {
      response: NextResponse.json(
        {
          error: "Authentication is required.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  const {
    data: userData,
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return {
      response: NextResponse.json(
        {
          error: "Your session is invalid or has expired.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id, role, verification_status, municipality")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error(
      "Event Staff assignment caller profile error:",
      profileError,
    );

    return {
      response: NextResponse.json(
        {
          error: "Unable to verify your administrator account.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  if (
    normalizeValue(profile.role) !== "municipal_admin" ||
    normalizeValue(profile.verification_status) !== "approved"
  ) {
    return {
      response: NextResponse.json(
        {
          error:
            "Only an approved Municipal Administrator can manage Event Staff assignments.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  const municipality = String(profile.municipality ?? "").trim();

  if (!municipality) {
    return {
      response: NextResponse.json(
        {
          error:
            "Your Municipal Administrator account does not have an assigned municipality.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  return {
    admin: {
      id: profile.id,
      municipality,
    },
    accessToken,
  };
}

async function sendStaffAssignmentEmail(
  assignmentId: string,
  accessToken: string,
): Promise<StaffEmailDeliveryResult> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
      /\/$/,
      "",
    );

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      provider: "brevo",
      sent: 0,
      failed: 1,
      skippedAlreadySent: 0,
      skippedInProgress: 0,
      recipientEmail: null,
      message:
        "The staff assignment was saved, but email delivery is not configured.",
      error:
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-event-staff-assignment-email`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentId,
        }),
        cache: "no-store",
      },
    );

    const payload = (await response
      .json()
      .catch(() => null)) as
      | Record<string, unknown>
      | null;

    const message = String(
      payload?.message ??
        (response.ok
          ? "Event Staff email processing completed."
          : "The Event Staff email could not be sent."),
    );

    const error = response.ok
      ? null
      : String(payload?.error ?? message);

    return {
      ok: response.ok,
      provider: "brevo",
      sent: Number(payload?.sent ?? 0),
      failed: Number(
        payload?.failed ??
          (response.ok ? 0 : 1),
      ),
      skippedAlreadySent: Number(
        payload?.skippedAlreadySent ?? 0,
      ),
      skippedInProgress: Number(
        payload?.skippedInProgress ?? 0,
      ),
      recipientEmail:
        typeof payload?.recipientEmail === "string"
          ? payload.recipientEmail
          : null,
      message,
      error,
    };
  } catch (error) {
    console.error(
      "Event Staff assignment email invocation error:",
      error,
    );

    return {
      ok: false,
      provider: "brevo",
      sent: 0,
      failed: 1,
      skippedAlreadySent: 0,
      skippedInProgress: 0,
      recipientEmail: null,
      message:
        "The Event Staff assignment was saved, but the email service could not be reached.",
      error:
        error instanceof Error
          ? error.message
          : "Unable to reach the email service.",
    };
  }
}

async function loadTargetStaff(
  staffId: string,
  municipality: string,
  requireApproved = true,
) {
  const {
    data: staff,
    error,
  } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, email, role, verification_status, municipality",
    )
    .eq("id", staffId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!staff) {
    throw new Error(
      "The selected Event Staff account could not be found.",
    );
  }

  if (normalizeValue(staff.role) !== "event_staff") {
    throw new Error(
      "The selected account is not an Event Staff account.",
    );
  }

  if (
    requireApproved &&
    normalizeValue(staff.verification_status) !== "approved"
  ) {
    throw new Error(
      "Only approved Event Staff accounts can be assigned.",
    );
  }

  if (
    normalizeValue(staff.municipality) !==
    normalizeValue(municipality)
  ) {
    throw new Error(
      "Event Staff must belong to the same municipality as the Municipal Administrator.",
    );
  }

  return staff;
}

async function loadTargetEvent(
  eventMunicipalityId: string,
  municipality: string,
  requireAssignable = true,
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("event_municipalities")
    .select(
      `
        id,
        event_id,
        municipality,
        municipal_status,
        preparation_status,
        local_venue_id,
        local_instructions,
        events (
          id,
          title,
          status,
          start_at,
          end_at
        )
      `,
    )
    .eq("id", eventMunicipalityId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "The selected municipal event could not be found.",
    );
  }

  const municipalEvent =
    data as unknown as RawMunicipalEvent;

  if (
    normalizeValue(municipalEvent.municipality) !==
    normalizeValue(municipality)
  ) {
    throw new Error(
      "You can only assign Event Staff to events in your municipality.",
    );
  }

  if (
    requireAssignable &&
    normalizeValue(municipalEvent.municipal_status) !==
      "prepared"
  ) {
    throw new Error(
      "Event Staff can only be assigned to a prepared municipal event.",
    );
  }

  const event =
    normalizeEvent(municipalEvent.events);

  if (!event) {
    throw new Error(
      "The provincial event details could not be found.",
    );
  }

  const eventStatus =
    normalizeValue(event.status);

  if (
    requireAssignable &&
    eventStatus !== "published" &&
    eventStatus !== "upcoming"
  ) {
    throw new Error(
      `Event Staff cannot be assigned while the event status is "${eventStatus || "unknown"}".`,
    );
  }

  return {
    ...municipalEvent,
    event,
  };
}

/*
 * ==================================================
 * GET: Load assignable staff, events, and assignments
 * ==================================================
 */
export async function GET(request: Request) {
  try {
    const authorization =
      await authorizeMunicipalAdmin(request);

    if ("response" in authorization) {
      return authorization.response;
    }

    const { admin } = authorization;

    const [
      staffResult,
      eventsResult,
      assignmentsResult,
    ] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select(
            "id, full_name, email, role, verification_status, municipality",
          )
          .eq("role", "event_staff")
          .eq(
            "municipality",
            admin.municipality,
          )
          .order("full_name", {
            ascending: true,
          }),

        supabaseAdmin
          .from("event_municipalities")
          .select(
            `
              id,
              event_id,
              municipality,
              municipal_status,
              preparation_status,
              local_venue_id,
              local_instructions,
              events (
                id,
                title,
                status,
                start_at,
                end_at
              )
            `,
          )
          .eq(
            "municipality",
            admin.municipality,
          )
          .eq(
            "municipal_status",
            "prepared",
          ),

        supabaseAdmin
          .from(
            "event_staff_assignments",
          )
          .select(
            `
              id,
              event_municipality_id,
              staff_id,
              assigned_by,
              status,
              assigned_at,
              removed_at,
              created_at,
              updated_at
            `,
          )
          .order("assigned_at", {
            ascending: false,
          }),
      ]);

    if (staffResult.error) {
      throw staffResult.error;
    }

    if (eventsResult.error) {
      throw eventsResult.error;
    }

    if (assignmentsResult.error) {
      throw assignmentsResult.error;
    }

    const staff =
      staffResult.data ?? [];

    const events = (
      (eventsResult.data ?? []) as unknown as RawMunicipalEvent[]
    )
      .map((municipalEvent) => {
        const event =
          normalizeEvent(
            municipalEvent.events,
          );

        if (!event) {
          return null;
        }

        const eventStatus =
          normalizeValue(event.status);

        if (
          eventStatus !== "published" &&
          eventStatus !== "upcoming"
        ) {
          return null;
        }

        return {
          id:
            municipalEvent.id,

          event_id:
            municipalEvent.event_id,

          municipality:
            municipalEvent.municipality,

          municipal_status:
            municipalEvent.municipal_status,

          preparation_status:
            municipalEvent.preparation_status,

          local_venue_id:
            municipalEvent.local_venue_id,

          local_instructions:
            municipalEvent.local_instructions,

          event,
        };
      })
      .filter(Boolean)
      .sort((first, second) => {
        const firstStart =
          first?.event.start_at
            ? new Date(
                first.event.start_at,
              ).getTime()
            : Number.MAX_SAFE_INTEGER;

        const secondStart =
          second?.event.start_at
            ? new Date(
                second.event.start_at,
              ).getTime()
            : Number.MAX_SAFE_INTEGER;

        return firstStart - secondStart;
      });

    const staffById =
      new Map(
        staff.map(
          (staffProfile) => [
            staffProfile.id,
            staffProfile,
          ],
        ),
      );

    const eventsById =
      new Map(
        events.map(
          (municipalEvent) => [
            municipalEvent!.id,
            municipalEvent,
          ],
        ),
      );

    const assignments =
      (
        assignmentsResult.data ?? []
      )
        .filter((assignment) => {
          return (
            staffById.has(
              assignment.staff_id,
            ) &&
            eventsById.has(
              assignment.event_municipality_id,
            )
          );
        })
        .map((assignment) => ({
          ...assignment,

          staff:
            staffById.get(
              assignment.staff_id,
            ) ?? null,

          eventMunicipality:
            eventsById.get(
              assignment.event_municipality_id,
            ) ?? null,
        }));

    return NextResponse.json(
      {
        municipality:
          admin.municipality,

        staff,

        events,

        assignments,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Load Event Staff assignments API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Event Staff assignments.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * ==================================================
 * POST: Assign or reactivate Event Staff
 * ==================================================
 */
export async function POST(request: Request) {
  try {
    const authorization =
      await authorizeMunicipalAdmin(request);

    if ("response" in authorization) {
      return authorization.response;
    }

    const {
      admin,
      accessToken,
    } = authorization;

    let body: AssignmentRequestBody;

    try {
      body =
        (await request.json()) as AssignmentRequestBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request data.",
        },
        {
          status: 400,
        },
      );
    }

    const eventMunicipalityId =
      String(
        body.eventMunicipalityId ??
          "",
      ).trim();

    const staffId =
      String(
        body.staffId ?? "",
      ).trim();

    if (
      !uuidPattern.test(
        eventMunicipalityId,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A valid municipal event is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!uuidPattern.test(staffId)) {
      return NextResponse.json(
        {
          error:
            "A valid Event Staff account is required.",
        },
        {
          status: 400,
        },
      );
    }

    const [
      staff,
      municipalEvent,
    ] =
      await Promise.all([
        loadTargetStaff(
          staffId,
          admin.municipality,
        ),

        loadTargetEvent(
          eventMunicipalityId,
          admin.municipality,
        ),
      ]);

    const {
      data:
        existingAssignment,
      error:
        existingAssignmentError,
    } =
      await supabaseAdmin
        .from(
          "event_staff_assignments",
        )
        .select(
          "id, event_municipality_id, staff_id, assigned_by, status, assigned_at, removed_at",
        )
        .eq(
          "event_municipality_id",
          eventMunicipalityId,
        )
        .eq("staff_id", staffId)
        .maybeSingle();

    if (existingAssignmentError) {
      throw existingAssignmentError;
    }

    if (
      existingAssignment?.status ===
        "active"
    ) {
      return NextResponse.json(
        {
          error:
            "This Event Staff account is already assigned to the event.",
        },
        {
          status: 409,
        },
      );
    }

    let assignment;

    if (existingAssignment) {
      const reactivatedAt =
        new Date().toISOString();

      const {
        data:
          reactivatedAssignment,
        error:
          reactivateError,
      } =
        await supabaseAdmin
          .from(
            "event_staff_assignments",
          )
          .update({
            status: "active",

            assigned_by:
              admin.id,

            assigned_at:
              reactivatedAt,

            removed_at: null,

            updated_at:
              reactivatedAt,
          })
          .eq(
            "id",
            existingAssignment.id,
          )
          .select(
            "id, event_municipality_id, staff_id, assigned_by, status, assigned_at, removed_at, created_at, updated_at",
          )
          .single();

      if (reactivateError) {
        throw reactivateError;
      }

      assignment =
        reactivatedAssignment;
    } else {
      const {
        data:
          insertedAssignment,
        error:
          insertError,
      } =
        await supabaseAdmin
          .from(
            "event_staff_assignments",
          )
          .insert({
            event_municipality_id:
              eventMunicipalityId,

            staff_id:
              staffId,

            assigned_by:
              admin.id,

            status: "active",
          })
          .select(
            "id, event_municipality_id, staff_id, assigned_by, status, assigned_at, removed_at, created_at, updated_at",
          )
          .single();

      if (insertError) {
        if (
          insertError.code === "23505"
        ) {
          return NextResponse.json(
            {
              error:
                "This Event Staff account is already assigned to the event.",
            },
            {
              status: 409,
            },
          );
        }

        throw insertError;
      }

      assignment =
        insertedAssignment;
    }

    /*
     * The assignment remains successful even if
     * the email provider fails. The delivery result
     * is returned separately for the UI toast.
     */
    const emailDelivery =
      await sendStaffAssignmentEmail(
        assignment.id,
        accessToken,
      );

    return NextResponse.json(
      {
        message:
          `${
            staff.full_name ||
            staff.email ||
            "Event Staff"
          } was assigned to ${
            municipalEvent.event.title
          }.`,

        assignment,

        staff,

        eventMunicipality:
          municipalEvent,

        emailDelivery,
      },
      {
        status:
          existingAssignment
            ? 200
            : 201,
      },
    );
  } catch (error) {
    console.error(
      "Assign Event Staff API error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to assign Event Staff to the event.";

    const isValidationError =
      message.includes("selected") ||
      message.includes(
        "Only approved",
      ) ||
      message.includes(
        "same municipality",
      ) ||
      message.includes("prepared") ||
      message.includes(
        "cannot be assigned",
      ) ||
      message.includes(
        "could not be found",
      ) ||
      message.includes(
        "only assign",
      );

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          isValidationError
            ? 409
            : 500,
      },
    );
  }
}

/*
 * ==================================================
 * PATCH: Remove an Event Staff assignment
 * ==================================================
 */
export async function PATCH(request: Request) {
  try {
    const authorization =
      await authorizeMunicipalAdmin(request);

    if ("response" in authorization) {
      return authorization.response;
    }

    const { admin } = authorization;

    let body: RemoveAssignmentBody;

    try {
      body =
        (await request.json()) as RemoveAssignmentBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request data.",
        },
        {
          status: 400,
        },
      );
    }

    const assignmentId =
      String(
        body.assignmentId ?? "",
      ).trim();

    if (
      !uuidPattern.test(
        assignmentId,
      ) ||
      body.action !== "remove"
    ) {
      return NextResponse.json(
        {
          error:
            "A valid Event Staff assignment and action are required.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: assignment,
      error: assignmentError,
    } =
      await supabaseAdmin
        .from(
          "event_staff_assignments",
        )
        .select(
          "id, event_municipality_id, staff_id, status, removed_at",
        )
        .eq("id", assignmentId)
        .maybeSingle();

    if (assignmentError) {
      throw assignmentError;
    }

    if (!assignment) {
      return NextResponse.json(
        {
          error:
            "The Event Staff assignment could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const [
      staff,
      municipalEvent,
    ] =
      await Promise.all([
        loadTargetStaff(
          assignment.staff_id,
          admin.municipality,
          false,
        ),

        loadTargetEvent(
          assignment.event_municipality_id,
          admin.municipality,
          false,
        ),
      ]);

    if (
      assignment.status ===
        "removed"
    ) {
      return NextResponse.json(
        {
          message:
            "The Event Staff assignment is already removed.",

          assignment,

          staff,

          eventMunicipality:
            municipalEvent,
        },
        {
          status: 200,
        },
      );
    }

    const {
      data:
        removedAssignment,
      error:
        removeError,
    } =
      await supabaseAdmin
        .from(
          "event_staff_assignments",
        )
        .update({
          status: "removed",

          removed_at:
            new Date()
              .toISOString(),

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq("id", assignment.id)
        .select(
          "id, event_municipality_id, staff_id, assigned_by, status, assigned_at, removed_at, created_at, updated_at",
        )
        .single();

    if (removeError) {
      throw removeError;
    }

    return NextResponse.json(
      {
        message:
          `${
            staff.full_name ||
            staff.email ||
            "Event Staff"
          } was removed from ${
            municipalEvent.event.title
          }.`,

        assignment:
          removedAssignment,

        staff,

        eventMunicipality:
          municipalEvent,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Remove Event Staff assignment API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove the Event Staff assignment.",
      },
      {
        status: 500,
      },
    );
  }
}