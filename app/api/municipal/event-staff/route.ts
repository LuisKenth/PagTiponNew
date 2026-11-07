import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime = "nodejs";
/** HTML-escape the dynamic pieces of a transactional email. */
function escapeEmailHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
        const replacements: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };
        return replacements[character] ?? character;
    });
}
/** Send a Supabase signup-verification link using Brevo. Server-side only. */
async function sendEventStaffVerificationEmail(params: {
    email: string;
    fullName: string;
    actionLink: string;
}): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
    const senderName = process.env.BREVO_SENDER_NAME?.trim() || "PagTipon";
    if (!apiKey || !senderEmail) {
        throw new Error("Brevo configuration is incomplete.");
    }
    const safeName = escapeEmailHtml(params.fullName);
    const safeLink = escapeEmailHtml(params.actionLink);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            sender: { email: senderEmail, name: senderName },
            to: [{ email: params.email, name: params.fullName }],
            subject: "PagTipon – Verify Your Event Staff Email",
            htmlContent: `
        <html><body style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.6">
          <h2>Verify your PagTipon Event Staff email</h2>
          <p>Hello, ${safeName}!</p>
          <p>A Municipal Administrator has created an Event Staff account for you.
          Please confirm your email address before signing in.</p>
          <p><a href="${safeLink}" style="background:#4f46e5;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Verify Email Address</a></p>
          <p>If you did not expect this invitation, you can ignore this email.</p>
          <p>For security, obtain your initial password directly from your Municipal Administrator.</p>
          <p>PagTipon</p>
        </body></html>
      `,
        }),
    });
    if (!response.ok) {
        // Log only the status; avoid disclosing the email or confirmation link.
        console.error("Brevo Event Staff verification error status:", response.status);
        throw new Error("Brevo did not accept the Event Staff verification email.");
    }
}
type CreateEventStaffBody = {
    fullName?: string;
    email?: string;
    password?: string;
};
type UpdateEventStaffBody = {
    staffId?: string;
    action?: "deactivate" | "reactivate" | "delete";
};
/*

 * ==================================================

 * GET: Load Event Staff accounts

 * ==================================================

 */
export async function GET(request: Request) {
    try {
        const authorization = request.headers.get("authorization");
        if (!authorization ||
            !authorization.startsWith("Bearer ")) {
            return NextResponse.json({
                error: "Authentication is required.",
            }, {
                status: 401,
            });
        }
        const accessToken = authorization.slice("Bearer ".length);
        const { data: userData, error: userError, } = await supabaseAdmin.auth.getUser(accessToken);
        if (userError || !userData.user) {
            return NextResponse.json({
                error: "Your session is invalid or has expired.",
            }, {
                status: 401,
            });
        }
        const { data: callerProfile, error: callerProfileError, } = await supabaseAdmin
            .from("profiles")
            .select(`

          id,

          role,

          verification_status,

          municipality

        `)
            .eq("id", userData.user.id)
            .single();
        if (callerProfileError ||
            !callerProfile) {
            console.error("Event Staff list caller profile error:", callerProfileError);
            return NextResponse.json({
                error: "Unable to verify your administrator account.",
            }, {
                status: 403,
            });
        }
        if (callerProfile.role !==
            "municipal_admin" ||
            callerProfile.verification_status !==
                "approved" || userData.user.app_metadata?.must_change_password === true) {
            return NextResponse.json({
                error: "Only an approved Municipal Administrator can view Event Staff accounts.",
            }, {
                status: 403,
            });
        }
        const municipality = callerProfile.municipality?.trim() ?? "";
        if (!municipality) {
            return NextResponse.json({
                error: "Your Municipal Administrator account does not have an assigned municipality.",
            }, {
                status: 403,
            });
        }
        const { data: staffProfiles, error: staffError, } = await supabaseAdmin
            .from("profiles")
            .select(`

          id,

          full_name,

          email,

          role,

          verification_status,

          municipality

        `)
            .eq("role", "event_staff")
            .eq("municipality", municipality)
            .order("full_name", {
            ascending: true,
        });
        if (staffError) {
            console.error("Load Event Staff profiles error:", staffError);
            return NextResponse.json({
                error: "Unable to load Event Staff accounts.",
            }, {
                status: 500,
            });
        }
        return NextResponse.json({
            staff: staffProfiles ?? [],
            municipality,
        }, {
            status: 200,
        });
    }
    catch (error) {
        console.error("Event Staff list API error:", error);
        return NextResponse.json({
            error: "An unexpected error occurred while loading Event Staff accounts.",
        }, {
            status: 500,
        });
    }
}
/*

 * ==================================================

 * PATCH: Deactivate or reactivate Event Staff

 * ==================================================

 */
export async function PATCH(request: Request) {
    try {
        const authorization = request.headers.get("authorization");
        if (!authorization ||
            !authorization.startsWith("Bearer ")) {
            return NextResponse.json({
                error: "Authentication is required.",
            }, {
                status: 401,
            });
        }
        const accessToken = authorization.slice("Bearer ".length);
        const { data: userData, error: userError, } = await supabaseAdmin.auth.getUser(accessToken);
        if (userError || !userData.user) {
            return NextResponse.json({
                error: "Your session is invalid or has expired.",
            }, {
                status: 401,
            });
        }
        /*
    
         * Verify the caller and retrieve the
    
         * Municipal Admin's municipality.
    
         */
        const { data: callerProfile, error: callerProfileError, } = await supabaseAdmin
            .from("profiles")
            .select(`

          id,

          role,

          verification_status,

          municipality

        `)
            .eq("id", userData.user.id)
            .single();
        if (callerProfileError ||
            !callerProfile) {
            console.error("Update Event Staff caller error:", callerProfileError);
            return NextResponse.json({
                error: "Unable to verify your administrator account.",
            }, {
                status: 403,
            });
        }
        if (callerProfile.role !==
            "municipal_admin" ||
            callerProfile.verification_status !==
                "approved" || userData.user.app_metadata?.must_change_password === true) {
            return NextResponse.json({
                error: "Only an approved Municipal Administrator can manage Event Staff accounts.",
            }, {
                status: 403,
            });
        }
        const municipality = callerProfile.municipality?.trim() ?? "";
        if (!municipality) {
            return NextResponse.json({
                error: "Your Municipal Administrator account does not have an assigned municipality.",
            }, {
                status: 403,
            });
        }
        let body: UpdateEventStaffBody;
        try {
            body =
                (await request.json()) as UpdateEventStaffBody;
        }
        catch {
            return NextResponse.json({
                error: "Invalid request data.",
            }, {
                status: 400,
            });
        }
        const staffId = body.staffId?.trim() ?? "";
        const action = body.action;
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(staffId)) {
            return NextResponse.json({
                error: "A valid Event Staff account is required.",
            }, {
                status: 400,
            });
        }
        if (action !== "deactivate" &&
            action !== "reactivate" &&
            action !== "delete") {
            return NextResponse.json({
                error: "A valid account action is required.",
            }, {
                status: 400,
            });
        }
        /*
    
         * Load and verify the target Event Staff.
    
         */
        const { data: targetProfile, error: targetProfileError, } = await supabaseAdmin
            .from("profiles")
            .select(`

          id,

          full_name,

          email,

          role,

          verification_status,

          municipality

        `)
            .eq("id", staffId)
            .maybeSingle();
        if (targetProfileError) {
            console.error("Load target Event Staff error:", targetProfileError);
            return NextResponse.json({
                error: "Unable to verify the Event Staff account.",
            }, {
                status: 500,
            });
        }
        if (!targetProfile) {
            return NextResponse.json({
                error: "The Event Staff account could not be found.",
            }, {
                status: 404,
            });
        }
        /*
    
         * Prevent the Municipal Admin from managing
    
         * another role or another municipality's staff.
    
         */
        if (targetProfile.role !==
            "event_staff" ||
            targetProfile.municipality !==
                municipality) {
            return NextResponse.json({
                error: "You can only manage Event Staff accounts assigned to your municipality.",
            }, {
                status: 403,
            });
        }
        if (action === "delete") {
            if (targetProfile.verification_status !== "rejected") {
                return NextResponse.json({ error: "Deactivate the Event Staff account before deleting it." }, { status: 409 });
            }
            const { error } = await supabaseAdmin.auth.admin.deleteUser(staffId);
            if (error) {
                console.error("Delete Event Staff error:", error);
                return NextResponse.json({ error: "Unable to delete the Event Staff account." }, { status: 500 });
            }
            return NextResponse.json({
                message: "Event Staff account deleted successfully.",
            });
        }
        const nextStatus = action === "deactivate"
            ? "rejected"
            : "approved";
        /*
    
         * 876000 hours is approximately 100 years.
    
         * "none" removes an existing Auth ban.
    
         */
        const nextBanDuration = action === "deactivate"
            ? "876000h"
            : "none";
        /*
    
         * Update the Supabase Auth account first.
    
         */
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(staffId, {
            ban_duration: nextBanDuration,
        });
        if (authUpdateError) {
            console.error("Update Event Staff Auth status error:", authUpdateError);
            return NextResponse.json({
                error: action === "deactivate"
                    ? "Unable to deactivate the Event Staff login."
                    : "Unable to reactivate the Event Staff login.",
            }, {
                status: 500,
            });
        }
        /*
    
         * Update the trusted profile status.
    
         */
        const { data: updatedProfile, error: profileUpdateError, } = await supabaseAdmin
            .from("profiles")
            .update({
            verification_status: nextStatus,
        })
            .eq("id", staffId)
            .eq("role", "event_staff")
            .eq("municipality", municipality)
            .select(`

          id,

          full_name,

          email,

          role,

          verification_status,

          municipality

        `)
            .single();
        if (profileUpdateError ||
            !updatedProfile) {
            console.error("Update Event Staff profile status error:", profileUpdateError);
            /*
      
             * Restore the previous Auth state if the
      
             * profile update cannot be finalized.
      
             */
            const rollbackBanDuration = action === "deactivate"
                ? "none"
                : "876000h";
            const { error: rollbackError } = await supabaseAdmin.auth.admin.updateUserById(staffId, {
                ban_duration: rollbackBanDuration,
            });
            if (rollbackError) {
                console.error("Event Staff Auth rollback error:", rollbackError);
            }
            return NextResponse.json({
                error: profileUpdateError?.message.includes("Maximum 5 active Event Staff") ? profileUpdateError.message : "The Event Staff status could not be finalized. The account change was rolled back.",
            }, {
                status: profileUpdateError?.message.includes("Maximum 5 active Event Staff") ? 409 : 500,
            });
        }
        return NextResponse.json({
            message: action === "deactivate"
                ? "Event Staff account deactivated successfully."
                : "Event Staff account reactivated successfully.",
            staff: updatedProfile,
        }, {
            status: 200,
        });
    }
    catch (error) {
        console.error("Update Event Staff API error:", error);
        return NextResponse.json({
            error: "An unexpected error occurred while updating the Event Staff account.",
        }, {
            status: 500,
        });
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
        const authorization = request.headers.get("authorization");
        if (!authorization ||
            !authorization.startsWith("Bearer ")) {
            return NextResponse.json({
                error: "Authentication is required.",
            }, {
                status: 401,
            });
        }
        const accessToken = authorization.slice("Bearer ".length);
        /*
    
         * Verify the Supabase Auth session.
    
         */
        const { data: userData, error: userError, } = await supabaseAdmin.auth.getUser(accessToken);
        if (userError || !userData.user) {
            return NextResponse.json({
                error: "Your session is invalid or has expired.",
            }, {
                status: 401,
            });
        }
        const callerId = userData.user.id;
        /*
    
         * Verify that the caller is an approved
    
         * Municipal Admin and retrieve their municipality.
    
         */
        const { data: callerProfile, error: callerProfileError, } = await supabaseAdmin
            .from("profiles")
            .select(`

          id,

          role,

          verification_status,

          municipality

        `)
            .eq("id", callerId)
            .single();
        if (callerProfileError ||
            !callerProfile) {
            console.error("Event Staff caller profile error:", callerProfileError);
            return NextResponse.json({
                error: "Unable to verify your administrator account.",
            }, {
                status: 403,
            });
        }
        if (callerProfile.role !==
            "municipal_admin" ||
            callerProfile.verification_status !==
                "approved" || userData.user.app_metadata?.must_change_password === true) {
            return NextResponse.json({
                error: "Only an approved Municipal Administrator can create an Event Staff account.",
            }, {
                status: 403,
            });
        }
        const municipality = callerProfile.municipality?.trim() ?? "";
        if (!municipality) {
            return NextResponse.json({
                error: "Your Municipal Administrator account does not have an assigned municipality.",
            }, {
                status: 403,
            });
        }
        /*
    
         * Validate the submitted account details.
    
         */
        let body: CreateEventStaffBody;
        try {
            body =
                (await request.json()) as CreateEventStaffBody;
        }
        catch {
            return NextResponse.json({
                error: "Invalid request data.",
            }, {
                status: 400,
            });
        }
        const fullName = body.fullName?.trim() ?? "";
        const email = body.email?.trim().toLowerCase() ?? "";
        const password = body.password ?? "";
        if (!fullName) {
            return NextResponse.json({
                error: "Full name is required.",
            }, {
                status: 400,
            });
        }
        if (fullName.length > 100) {
            return NextResponse.json({
                error: "Full name must not exceed 100 characters.",
            }, {
                status: 400,
            });
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return NextResponse.json({
                error: "Please enter a valid email address.",
            }, {
                status: 400,
            });
        }
        if (!isStrongPassword(password)) {
            return NextResponse.json({
                error: PASSWORD_POLICY_MESSAGE,
            }, {
                status: 400,
            });
        }
        /*
    
         * Check profiles for a duplicate email.
    
         */
        const { data: existingProfile, error: existingProfileError, } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
        if (existingProfileError) {
            console.error("Event Staff duplicate profile check error:", existingProfileError);
            return NextResponse.json({
                error: "Unable to validate the email address.",
            }, {
                status: 500,
            });
        }
        if (existingProfile) {
            return NextResponse.json({
                error: "An account with this email already exists.",
            }, {
                status: 409,
            });
        }
        // The database trigger trusts only app_metadata.provisioned_role.
        // Create the UNCONFIRMED Auth user with trusted app_metadata first.
        // This lets handle_new_user() create an event_staff profile (not a participant).
        const appSiteUrl = process.env.APP_SITE_URL?.trim().replace(/\/$/, "");
        if (!appSiteUrl || !/^https?:\/\//i.test(appSiteUrl)) {
            return NextResponse.json({ error: "APP_SITE_URL is missing or invalid." }, { status: 500 });
        }
        if (!process.env.BREVO_API_KEY?.trim() || !process.env.BREVO_SENDER_EMAIL?.trim()) {
            return NextResponse.json({ error: "Brevo email configuration is incomplete." }, { status: 500 });
        }

        const { data: createdUserData, error: createUserError } =
            await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: false,
                app_metadata: {
                    provisioned_role: "event_staff",
                    must_change_password: true,
                },
                user_metadata: {
                    full_name: fullName,
                    role: "event_staff",
                    municipality,
                },
            });

        if (createUserError || !createdUserData.user) {
            console.error("Create Event Staff Auth user error:", createUserError);
            const authMessage = createUserError?.message?.toLowerCase() ?? "";
            if (["already", "registered", "exists"].some((word) => authMessage.includes(word))) {
                return NextResponse.json(
                    { error: "An account with this email already exists." },
                    { status: 409 },
                );
            }
            return NextResponse.json(
                { error: "Unable to create the Event Staff account. Check Supabase Auth/Postgres logs." },
                { status: 500 },
            );
        }
        createdUserId = createdUserData.user.id;

        // Generate a signup-confirmation link for the EXISTING UNCONFIRMED user.
        // This is not a second account creation. Keep the password consistent.
        const { data: linkData, error: linkError } =
            await supabaseAdmin.auth.admin.generateLink({
                type: "signup",
                email,
                password,
                options: {
                    redirectTo: `${appSiteUrl}/login`,
                    data: {
                        full_name: fullName,
                        role: "event_staff",
                        municipality,
                    },
                },
            });

        if (linkError || !linkData.properties?.action_link) {
            console.error("Generate Event Staff confirmation link error:", linkError);
            throw new Error("Unable to generate the email verification link.");
        }
        if (linkData.user && linkData.user.id !== createdUserId) {
            throw new Error("Verification link did not match the newly created Event Staff account.");
        }
        const actionLink = linkData.properties.action_link;

        // The creation above has already set trusted app_metadata and invoked
        // the database's role/municipality checks. Keep the profile finalization
        // and Brevo delivery below unchanged.
        const { data: eventStaffProfile, error: promoteError, } = await supabaseAdmin
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
            .select(`

          id,

          full_name,

          email,

          role,

          verification_status,

          municipality

        `)
            .single();
        if (promoteError ||
            !eventStaffProfile) {
            console.error("Promote Event Staff profile error:", promoteError);
            const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(createdUserId);
            if (rollbackError) {
                console.error("Event Staff rollback error:", rollbackError);
            }
            createdUserId = null;
            return NextResponse.json({
                error: promoteError?.message.includes("Maximum 5 active Event Staff") ? promoteError.message : "The account could not be finalized as Event Staff. The creation was rolled back.",
            }, {
                status: promoteError?.message.includes("Maximum 5 active Event Staff") ? 409 : 500,
            });
        }
        // Only email the link after the account/profile/limits are finalized.
        // If sending fails, the outer catch rolls back the newly created Auth user.
        await sendEventStaffVerificationEmail({ email, fullName, actionLink });
        return NextResponse.json({
            message: "Event Staff account created. A verification email has been sent.",
            staff: eventStaffProfile,
        }, {
            status: 201,
        });
    }
    catch (error) {
        console.error("Create Event Staff API error:", error);
        if (createdUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(createdUserId);
            }
            catch (rollbackError) {
                console.error("Unexpected Event Staff rollback error:", rollbackError);
            }
        }
        return NextResponse.json({
            error: "An unexpected error occurred while creating the Event Staff account.",
        }, {
            status: 500,
        });
    }
}
