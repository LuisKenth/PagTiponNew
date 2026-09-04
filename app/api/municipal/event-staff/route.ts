import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type CreateEventStaffBody = {
  fullName?: string;
  email?: string;
  password?: string;
};

type UpdateEventStaffBody = {
  staffId?: string;
  action?: "deactivate" | "reactivate";
};

/*
 * ==================================================
 * GET: Load Event Staff accounts
 * ==================================================
 */
export async function GET(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Authentication is required.",
        },
        {
          status: 401,
        },
      );
    }

    const accessToken = authorization.slice(
      "Bearer ".length,
    );

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken,
    );

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          error:
            "Your session is invalid or has expired.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      data: callerProfile,
      error: callerProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        `
          id,
          role,
          verification_status,
          municipality
        `,
      )
      .eq("id", userData.user.id)
      .single();

    if (
      callerProfileError ||
      !callerProfile
    ) {
      console.error(
        "Event Staff list caller profile error:",
        callerProfileError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify your administrator account.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      callerProfile.role !==
        "municipal_admin" ||
      callerProfile.verification_status !==
        "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an approved Municipal Administrator can view Event Staff accounts.",
        },
        {
          status: 403,
        },
      );
    }

    const municipality =
      callerProfile.municipality?.trim() ?? "";

    if (!municipality) {
      return NextResponse.json(
        {
          error:
            "Your Municipal Administrator account does not have an assigned municipality.",
        },
        {
          status: 403,
        },
      );
    }

    const {
      data: staffProfiles,
      error: staffError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        `
          id,
          full_name,
          email,
          role,
          verification_status,
          municipality
        `,
      )
      .eq("role", "event_staff")
      .eq("municipality", municipality)
      .order("full_name", {
        ascending: true,
      });

    if (staffError) {
      console.error(
        "Load Event Staff profiles error:",
        staffError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load Event Staff accounts.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        staff: staffProfiles ?? [],
        municipality,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Event Staff list API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while loading Event Staff accounts.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * ==================================================
 * PATCH: Deactivate or reactivate Event Staff
 * ==================================================
 */
export async function PATCH(
  request: Request,
) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Authentication is required.",
        },
        {
          status: 401,
        },
      );
    }

    const accessToken = authorization.slice(
      "Bearer ".length,
    );

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken,
    );

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          error:
            "Your session is invalid or has expired.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Verify the caller and retrieve the
     * Municipal Admin's municipality.
     */
    const {
      data: callerProfile,
      error: callerProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        `
          id,
          role,
          verification_status,
          municipality
        `,
      )
      .eq("id", userData.user.id)
      .single();

    if (
      callerProfileError ||
      !callerProfile
    ) {
      console.error(
        "Update Event Staff caller error:",
        callerProfileError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify your administrator account.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      callerProfile.role !==
        "municipal_admin" ||
      callerProfile.verification_status !==
        "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an approved Municipal Administrator can manage Event Staff accounts.",
        },
        {
          status: 403,
        },
      );
    }

    const municipality =
      callerProfile.municipality?.trim() ?? "";

    if (!municipality) {
      return NextResponse.json(
        {
          error:
            "Your Municipal Administrator account does not have an assigned municipality.",
        },
        {
          status: 403,
        },
      );
    }

    let body: UpdateEventStaffBody;

    try {
      body =
        (await request.json()) as UpdateEventStaffBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request data.",
        },
        {
          status: 400,
        },
      );
    }

    const staffId =
      body.staffId?.trim() ?? "";

    const action = body.action;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    if (
      action !== "deactivate" &&
      action !== "reactivate"
    ) {
      return NextResponse.json(
        {
          error:
            "A valid account action is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Load and verify the target Event Staff.
     */
    const {
      data: targetProfile,
      error: targetProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        `
          id,
          full_name,
          email,
          role,
          verification_status,
          municipality
        `,
      )
      .eq("id", staffId)
      .maybeSingle();

    if (targetProfileError) {
      console.error(
        "Load target Event Staff error:",
        targetProfileError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify the Event Staff account.",
        },
        {
          status: 500,
        },
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        {
          error:
            "The Event Staff account could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Prevent the Municipal Admin from managing
     * another role or another municipality's staff.
     */
    if (
      targetProfile.role !==
        "event_staff" ||
      targetProfile.municipality !==
        municipality
    ) {
      return NextResponse.json(
        {
          error:
            "You can only manage Event Staff accounts assigned to your municipality.",
        },
        {
          status: 403,
        },
      );
    }

    const nextStatus =
      action === "deactivate"
        ? "rejected"
        : "approved";

    /*
     * 876000 hours is approximately 100 years.
     * "none" removes an existing Auth ban.
     */
    const nextBanDuration =
      action === "deactivate"
        ? "876000h"
        : "none";

    /*
     * Update the Supabase Auth account first.
     */
    const { error: authUpdateError } =
      await supabaseAdmin.auth.admin.updateUserById(
        staffId,
        {
          ban_duration: nextBanDuration,
        },
      );

    if (authUpdateError) {
      console.error(
        "Update Event Staff Auth status error:",
        authUpdateError,
      );

      return NextResponse.json(
        {
          error:
            action === "deactivate"
              ? "Unable to deactivate the Event Staff login."
              : "Unable to reactivate the Event Staff login.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Update the trusted profile status.
     */
    const {
      data: updatedProfile,
      error: profileUpdateError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        verification_status: nextStatus,
      })
      .eq("id", staffId)
      .eq("role", "event_staff")
      .eq("municipality", municipality)
      .select(
        `
          id,
          full_name,
          email,
          role,
          verification_status,
          municipality
        `,
      )
      .single();

    if (
      profileUpdateError ||
      !updatedProfile
    ) {
      console.error(
        "Update Event Staff profile status error:",
        profileUpdateError,
      );

      /*
       * Restore the previous Auth state if the
       * profile update cannot be finalized.
       */
      const rollbackBanDuration =
        action === "deactivate"
          ? "none"
          : "876000h";

      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.updateUserById(
          staffId,
          {
            ban_duration:
              rollbackBanDuration,
          },
        );

      if (rollbackError) {
        console.error(
          "Event Staff Auth rollback error:",
          rollbackError,
        );
      }

      return NextResponse.json(
        {
          error:
            "The Event Staff status could not be finalized. The account change was rolled back.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        message:
          action === "deactivate"
            ? "Event Staff account deactivated successfully."
            : "Event Staff account reactivated successfully.",
        staff: updatedProfile,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Update Event Staff API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while updating the Event Staff account.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * ==================================================
 * POST: Create Event Staff account
 * ==================================================
 */
export async function POST(request: Request) {
  let createdUserId: string | null = null;

  try {
    /*
     * Read the logged-in caller's access token.
     */
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Authentication is required.",
        },
        {
          status: 401,
        },
      );
    }

    const accessToken = authorization.slice(
      "Bearer ".length,
    );

    /*
     * Verify the Supabase Auth session.
     */
    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken,
    );

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          error:
            "Your session is invalid or has expired.",
        },
        {
          status: 401,
        },
      );
    }

    const callerId = userData.user.id;

    /*
     * Verify that the caller is an approved
     * Municipal Admin and retrieve their municipality.
     */
    const {
      data: callerProfile,
      error: callerProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        `
          id,
          role,
          verification_status,
          municipality
        `,
      )
      .eq("id", callerId)
      .single();

    if (
      callerProfileError ||
      !callerProfile
    ) {
      console.error(
        "Event Staff caller profile error:",
        callerProfileError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify your administrator account.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      callerProfile.role !==
        "municipal_admin" ||
      callerProfile.verification_status !==
        "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an approved Municipal Administrator can create an Event Staff account.",
        },
        {
          status: 403,
        },
      );
    }

    const municipality =
      callerProfile.municipality?.trim() ?? "";

    if (!municipality) {
      return NextResponse.json(
        {
          error:
            "Your Municipal Administrator account does not have an assigned municipality.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Validate the submitted account details.
     */
    let body: CreateEventStaffBody;

    try {
      body =
        (await request.json()) as CreateEventStaffBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request data.",
        },
        {
          status: 400,
        },
      );
    }

    const fullName =
      body.fullName?.trim() ?? "";

    const email =
      body.email?.trim().toLowerCase() ?? "";

    const password = body.password ?? "";

    if (!fullName) {
      return NextResponse.json(
        {
          error: "Full name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (fullName.length > 100) {
      return NextResponse.json(
        {
          error:
            "Full name must not exceed 100 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must contain at least 8 characters.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Check profiles for a duplicate email.
     */
    const {
      data: existingProfile,
      error: existingProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfileError) {
      console.error(
        "Event Staff duplicate profile check error:",
        existingProfileError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to validate the email address.",
        },
        {
          status: 500,
        },
      );
    }

    if (existingProfile) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Create the Auth user.
     *
     * municipal_admin is intentionally used as the
     * initial metadata role because the existing
     * handle_new_user() trigger accepts that role and
     * creates a pending profile without requiring a
     * participant category.
     */
    const {
      data: createdUserData,
      error: createUserError,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: "municipal_admin",
            municipality,
          },
        },
      );

    if (
      createUserError ||
      !createdUserData.user
    ) {
      console.error(
        "Create Event Staff Auth user error:",
        createUserError,
      );

      const authMessage =
        createUserError?.message
          ?.toLowerCase() ?? "";

      if (
        authMessage.includes("already") ||
        authMessage.includes("registered") ||
        authMessage.includes("exists")
      ) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists.",
          },
          {
            status: 409,
          },
        );
      }

      return NextResponse.json(
        {
          error:
            createUserError?.message ||
            "Unable to create the Event Staff account.",
        },
        {
          status: 400,
        },
      );
    }

    createdUserId =
      createdUserData.user.id;

    /*
     * Promote the generated pending Municipal Admin
     * profile into an approved Event Staff profile.
     */
    const {
      data: eventStaffProfile,
      error: promoteError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        role: "event_staff",
        verification_status: "approved",
        municipality,
        participant_category: null,
        participant_category_other: null,
      })
      .eq("id", createdUserId)
      .select(
        `
          id,
          full_name,
          email,
          role,
          verification_status,
          municipality
        `,
      )
      .single();

    if (
      promoteError ||
      !eventStaffProfile
    ) {
      console.error(
        "Promote Event Staff profile error:",
        promoteError,
      );

      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.deleteUser(
          createdUserId,
        );

      if (rollbackError) {
        console.error(
          "Event Staff rollback error:",
          rollbackError,
        );
      }

      createdUserId = null;

      return NextResponse.json(
        {
          error:
            "The account could not be finalized as Event Staff. The creation was rolled back.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        message:
          "Event Staff account created successfully.",
        staff: eventStaffProfile,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Create Event Staff API error:",
      error,
    );

    if (createdUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(
          createdUserId,
        );
      } catch (rollbackError) {
        console.error(
          "Unexpected Event Staff rollback error:",
          rollbackError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while creating the Event Staff account.",
      },
      {
        status: 500,
      },
    );
  }
}