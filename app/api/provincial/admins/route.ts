import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type CreateProvincialAdminBody = {
  fullName?: string;
  email?: string;
  password?: string;
};

export async function POST(
  request: Request
) {
  let createdUserId: string | null = null;

  try {
    /*
     * --------------------------------------------------
     * 1. Read access token from logged-in caller
     * --------------------------------------------------
     */
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication is required.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.slice("Bearer ".length);

    /*
     * --------------------------------------------------
     * 2. Verify the Supabase Auth user
     * --------------------------------------------------
     */
    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          error:
            "Your session is invalid or has expired.",
        },
        {
          status: 401,
        }
      );
    }

    const callerId = userData.user.id;

    /*
     * --------------------------------------------------
     * 3. Verify caller is an approved Provincial Admin
     * --------------------------------------------------
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
          verification_status
        `
      )
      .eq("id", callerId)
      .single();

    if (
      callerProfileError ||
      !callerProfile
    ) {
      console.error(
        "Provincial admin caller profile error:",
        callerProfileError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify your administrator account.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      callerProfile.role !==
        "provincial_admin" ||
      callerProfile.verification_status !==
        "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an approved Provincial Administrator can create another Provincial Administrator.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 4. Validate request data
     * --------------------------------------------------
     */
    const body =
      (await request.json()) as CreateProvincialAdminBody;

    const fullName =
      body.fullName?.trim() ?? "";

    const email =
      body.email
        ?.trim()
        .toLowerCase() ?? "";

    const password =
      body.password ?? "";

    if (!fullName) {
      return NextResponse.json(
        {
          error:
            "Full name is required.",
        },
        {
          status: 400,
        }
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
        }
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
        }
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
        }
      );
    }

    /*
     * --------------------------------------------------
     * 5. Check profiles for duplicate email
     * --------------------------------------------------
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
        "Duplicate profile check error:",
        existingProfileError
      );

      return NextResponse.json(
        {
          error:
            "Unable to validate the email address.",
        },
        {
          status: 500,
        }
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
        }
      );
    }

    /*
     * --------------------------------------------------
     * 6. Create Auth user
     *
     * IMPORTANT:
     * We initially send municipal_admin because the
     * current handle_new_user() trigger intentionally
     * blocks forged privileged roles.
     *
     * This prevents it from treating the new account
     * as a participant and requiring a participant
     * category.
     * --------------------------------------------------
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

            municipality: "",
          },
        }
      );

    if (
      createUserError ||
      !createdUserData.user
    ) {
      console.error(
        "Create provincial admin auth user error:",
        createUserError
      );

      const authMessage =
        createUserError?.message
          ?.toLowerCase() ?? "";

      if (
        authMessage.includes("already") ||
        authMessage.includes(
          "registered"
        ) ||
        authMessage.includes(
          "exists"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            createUserError?.message ||
            "Unable to create the Provincial Administrator account.",
        },
        {
          status: 400,
        }
      );
    }

    createdUserId =
      createdUserData.user.id;

    /*
     * --------------------------------------------------
     * 7. Promote generated profile
     *
     * handle_new_user() created:
     *
     * municipal_admin
     * pending
     *
     * Server-only service role promotes it to:
     *
     * provincial_admin
     * approved
     * --------------------------------------------------
     */
    const {
      data: promotedProfile,
      error: promoteError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,

        email,

        role: "provincial_admin",

        verification_status:
          "approved",

        municipality: null,

        participant_category: null,

        participant_category_other:
          null,
      })
      .eq("id", createdUserId)
      .select(
        `
          id,
          full_name,
          email,
          role,
          verification_status
        `
      )
      .single();

    if (
      promoteError ||
      !promotedProfile
    ) {
      console.error(
        "Promote provincial admin error:",
        promoteError
      );

      /*
       * Roll back Auth user so we don't leave
       * a partially-created municipal admin.
       */
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.deleteUser(
          createdUserId
        );

      if (rollbackError) {
        console.error(
          "Provincial admin rollback error:",
          rollbackError
        );
      }

      return NextResponse.json(
        {
          error:
            "The account could not be finalized as a Provincial Administrator. The creation was rolled back.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 8. Success
     * --------------------------------------------------
     */
    return NextResponse.json(
      {
        message:
          "Provincial Administrator created successfully.",

        admin: promotedProfile,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create Provincial Admin API error:",
      error
    );

    /*
     * Extra rollback protection in case
     * an unexpected exception happens after
     * Auth creation.
     */
    if (createdUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(
          createdUserId
        );
      } catch (rollbackError) {
        console.error(
          "Unexpected rollback error:",
          rollbackError
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while creating the Provincial Administrator.",
      },
      {
        status: 500,
      }
    );
  }
}