
import { NextResponse } from "next/server";

import {
  MUNICIPAL_ADMIN_LIMIT,
  MUNICIPAL_ADMIN_LIMIT_MESSAGE,
  municipalityAdminCount,
} from "@/lib/municipalAdminLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MUNICIPALITIES } from "@/lib/municipalities";
import {
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/passwordPolicy";

export const runtime = "nodejs";

async function approvedCount(municipality: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("municipality")
    .eq("role", "municipal_admin")
    .eq("verification_status", "approved");

  if (error) {
    throw new Error(
      "Unable to verify Municipal Admin slots. Please try again.",
    );
  }

  return municipalityAdminCount(data || [], municipality);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return replacements[character] || character;
  });
}

async function sendVerificationEmail({
  email,
  name,
  verificationLink,
}: {
  email: string;
  name: string;
  verificationLink: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName =
    process.env.BREVO_SENDER_NAME || "PagTipon";

  if (!apiKey || !senderEmail) {
    throw new Error("Brevo email configuration is missing.");
  }

  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(verificationLink);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport"
          content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="
        margin:0;
        padding:32px 16px;
        background:#f1f5f9;
        font-family:Arial,sans-serif;
        color:#0f172a;
      ">
        <div style="
          max-width:540px;
          margin:0 auto;
          padding:32px;
          background:#ffffff;
          border-radius:14px;
        ">
          <h1 style="
            margin:0 0 8px;
            color:#4338ca;
            font-size:26px;
          ">
            PagTipon
          </h1>

          <h2 style="font-size:21px;">
            Verify Your Email Address
          </h2>

          <p>Hello ${safeName},</p>

          <p>
            A Municipal Administrator account has been
            created for you in PagTipon.
          </p>

          <p>
            Before accessing your account, please verify
            your email address by clicking the button below.
          </p>

          <p style="text-align:center;margin:32px 0;">
            <a
              href="${safeLink}"
              style="
                display:inline-block;
                padding:14px 24px;
                background:#4f46e5;
                color:#ffffff;
                text-decoration:none;
                border-radius:8px;
                font-weight:bold;
              "
            >
              Verify Email Address
            </a>
          </p>

          <p>
            After verification, sign in using your assigned
            initial password. You will be required to
            change that password before accessing the
            Municipal Admin dashboard.
          </p>

          <p style="
            color:#64748b;
            font-size:13px;
            line-height:1.6;
          ">
            If you were not expecting this account,
            please contact your Provincial Administrator.
            Do not share your verification link or password.
          </p>

          <hr style="
            border:none;
            border-top:1px solid #e2e8f0;
            margin:24px 0;
          " />

          <p style="
            color:#64748b;
            font-size:12px;
          ">
            PagTipon Event Management and Attendance System
          </p>
        </div>
      </body>
    </html>
  `;

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email,
            name,
          },
        ],
        subject: "Verify Your PagTipon Municipal Admin Account",
        htmlContent,
        tags: ["pagtipon-municipal-admin-verification"],
      }),
    },
  );

  if (!response.ok) {
    console.error(
      "Brevo Municipal Admin email failed:",
      response.status,
    );

    throw new Error(
      "Unable to send the email verification message.",
    );
  }
}

async function rollbackNewAccount(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(
    userId,
  );

  if (error) {
    console.error(
      "Unable to roll back newly created Municipal Admin:",
      error.message,
    );

    return false;
  }

  return true;
}

export async function POST(request: Request) {
  try {
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/)?.[1];

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { data: auth, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !auth.user) {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 },
      );
    }

    const { data: caller, error: callerError } =
      await supabaseAdmin
        .from("profiles")
        .select("role, verification_status")
        .eq("id", auth.user.id)
        .single();

    if (
      callerError ||
      caller?.role !== "provincial_admin" ||
      caller.verification_status !== "approved" ||
      !auth.user.email_confirmed_at ||
      auth.user.app_metadata?.must_change_password === true
    ) {
      return NextResponse.json(
        {
          error:
            "Only verified and approved Provincial Admins may create Municipal Admins.",
        },
        { status: 403 },
      );
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 },
      );
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 },
      );
    }

    const body = payload as Record<string, unknown>;

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

    const middleName =
      typeof body.middleName === "string"
        ? body.middleName.trim()
        : "";

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : "";

    const suffix =
      typeof body.suffix === "string"
        ? body.suffix.trim()
        : "";

    const municipality =
      typeof body.municipality === "string"
        ? body.municipality.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (
      !firstName ||
      !lastName ||
      [firstName, middleName, lastName, suffix].some(
        (value) => value.length > 100,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Provide first and last name, with each name field at most 100 characters.",
        },
        { status: 400 },
      );
    }

    if (
      !MUNICIPALITIES.some(
        (item) => item === municipality,
      ) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          error: "Provide a valid municipality and email.",
        },
        { status: 400 },
      );
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        { error: PASSWORD_POLICY_MESSAGE },
        { status: 400 },
      );
    }

    if (
      (await approvedCount(municipality)) >=
      MUNICIPAL_ADMIN_LIMIT
    ) {
      return NextResponse.json(
        { error: MUNICIPAL_ADMIN_LIMIT_MESSAGE },
        { status: 409 },
      );
    }

    // Verify email settings BEFORE creating an account.
    const appSiteUrl =
      process.env.APP_SITE_URL?.trim().replace(/\/+$/, "");

    if (
      !process.env.BREVO_API_KEY ||
      !process.env.BREVO_SENDER_EMAIL ||
      !appSiteUrl
    ) {
      console.error(
        "Municipal Admin verification configuration missing.",
      );

      return NextResponse.json(
        {
          error:
            "Email verification is not configured. Contact the system administrator.",
        },
        { status: 503 },
      );
    }

    let parsedSiteUrl: URL;

    try {
      parsedSiteUrl = new URL(appSiteUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid application site URL configuration." },
        { status: 503 },
      );
    }

    if (
      !["http:", "https:"].includes(
        parsedSiteUrl.protocol,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid application site URL configuration." },
        { status: 503 },
      );
    }

    const fullName = [
      firstName,
      middleName,
      lastName,
      suffix,
    ]
      .filter(Boolean)
      .join(" ");

    // Create an UNVERIFIED account first.
    // Trusted role information stays in app_metadata.
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,

        app_metadata: {
          provisioned_role: "municipal_admin",
          provisioned_by: auth.user.id,
          must_change_password: true,
        },

        user_metadata: {
          first_name: firstName,
          middle_name: middleName || null,
          last_name: lastName,
          suffix: suffix || null,
          full_name: fullName,
          municipality,
        },
      });

    if (createError || !created.user) {
      if (
        (await approvedCount(municipality)) >=
        MUNICIPAL_ADMIN_LIMIT
      ) {
        return NextResponse.json(
          { error: MUNICIPAL_ADMIN_LIMIT_MESSAGE },
          { status: 409 },
        );
      }

      console.error(
        "Municipal Admin creation failed:",
        createError?.message,
      );

      return NextResponse.json(
        {
          error:
            createError?.message ||
            "Unable to create Municipal Admin.",
        },
        { status: 400 },
      );
    }

    // Generate the signup confirmation link for
    // the newly created unverified account.
    const { data: generated, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: {
          redirectTo: `${appSiteUrl}/login`,
        },
      });

    const verificationLink =
      generated?.properties?.action_link;

    if (linkError || !verificationLink) {
      console.error(
        "Municipal Admin verification link failed:",
        linkError?.message,
      );

      const rolledBack = await rollbackNewAccount(
        created.user.id,
      );

      return NextResponse.json(
        {
          error: rolledBack
            ? "Unable to prepare the verification email. Account creation was rolled back."
            : "Account was created but verification email preparation failed. Contact the system administrator.",
        },
        { status: 502 },
      );
    }

    try {
      await sendVerificationEmail({
        email,
        name: fullName,
        verificationLink,
      });
    } catch (emailError) {
      console.error(
        "Municipal Admin verification email error:",
        emailError,
      );

      const rolledBack = await rollbackNewAccount(
        created.user.id,
      );

      return NextResponse.json(
        {
          error: rolledBack
            ? "Unable to send verification email. Account creation was rolled back."
            : "Account was created but verification email could not be sent. Contact the system administrator.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        message:
          "Municipal Admin created successfully. A verification email has been sent.",
        verification_email_sent: true,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Municipal Admin creation error:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to create Municipal Admin." },
      { status: 500 },
    );
  }
}
