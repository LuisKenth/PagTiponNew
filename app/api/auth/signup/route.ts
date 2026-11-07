import { NextResponse } from "next/server";
import { serverAuthClient } from "@/lib/serverAuthClient";
import { MUNICIPALITIES } from "@/lib/municipalities";
import {
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/passwordPolicy";
import {
  normalizeMobileNumber,
  MOBILE_NUMBER_MESSAGE,
} from "@/lib/mobileNumber";
import {
  normalizeParticipantName,
  validateParticipantName,
} from "@/lib/participantName";
export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (!body || typeof body !== "object")
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    if (!isStrongPassword(body.password))
      return NextResponse.json(
        { error: PASSWORD_POLICY_MESSAGE },
        { status: 400 },
      );
    const raw = body.options?.data;
    if (!raw || typeof raw !== "object")
      return NextResponse.json(
        { error: "Participant details required." },
        { status: 400 },
      );
    const text = (key: string) =>
      typeof raw[key] === "string" ? raw[key].trim() : "";
    for (const key of ["first_name", "middle_name", "last_name", "suffix"]) {
      if (raw[key] != null && typeof raw[key] !== "string")
        return NextResponse.json(
          { error: "Name fields must be text." },
          { status: 400 },
        );
    }
    const names = normalizeParticipantName({
      first_name: text("first_name"),
      middle_name: text("middle_name"),
      last_name: text("last_name"),
      suffix: text("suffix"),
    });
    const nameErrors = validateParticipantName(names);
    if (Object.keys(nameErrors).length)
      return NextResponse.json(
        { error: Object.values(nameErrors)[0], fieldErrors: nameErrors },
        { status: 400 },
      );
    const {
      first_name: first,
      middle_name: middle,
      last_name: last,
      suffix,
    } = names;
    const municipality = text("municipality"),
      category = text("participant_category"),
      other = text("participant_category_other");
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (
      !first ||
      !last ||
      !MUNICIPALITIES.includes(municipality) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !["farmer", "fisherman", "senior_citizen", "4ps", "others"].includes(
        category,
      ) ||
      (category === "others" && (!other || other.length > 100))
    )
      return NextResponse.json(
        { error: "Please provide valid participant details." },
        { status: 400 },
      );
    if (raw.mobile_number != null && typeof raw.mobile_number !== "string")
      return NextResponse.json(
        { error: MOBILE_NUMBER_MESSAGE },
        { status: 400 },
      );
    const mobileInput = text("mobile_number");
    const mobile = mobileInput ? normalizeMobileNumber(mobileInput) : null;
    if (mobileInput && !mobile)
      return NextResponse.json(
        { error: MOBILE_NUMBER_MESSAGE },
        { status: 400 },
      );
    const client = serverAuthClient();
    const { data, error } = await client.auth.signUp({
      email,
      password: body.password,
      options: {
        data: {
          mobile_number: mobile,
          first_name: first,
          middle_name: middle || null,
          last_name: last,
          suffix: suffix || null,
          full_name: [first, middle, last, suffix].filter(Boolean).join(" "),
          role: "participant",
          municipality,
          participant_category: category,
          participant_category_other: category === "others" ? other : null,
        },
      },
    });
    if (error)
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json(
      {
        session: data.session
          ? {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to create account." },
      { status: 500 },
    );
  }
}
