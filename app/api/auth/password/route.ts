import { NextResponse } from "next/server";
import { serverAuthClient } from "@/lib/serverAuthClient";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";

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

    const client = serverAuthClient(token);
    const { data, error: authError } = await client.auth.getUser(token);

    if (authError || !data.user) {
      return NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    if (!body || !isStrongPassword(body.password)) {
      return NextResponse.json(
        { error: PASSWORD_POLICY_MESSAGE },
        { status: 400 },
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error("Missing authentication configuration.");
    }

    const response = await fetch(new URL("/auth/v1/user", url), {
      method: "PUT",
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: body.password,
        ...(typeof body.nonce === "string" ? { nonce: body.nonce } : {}),
      }),
      cache: "no-store",
      redirect: "error",
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      const message = result?.msg ?? result?.message;

      return NextResponse.json(
        {
          error:
            typeof message === "string"
              ? message
              : "Unable to update password.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Password updated." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to update password." },
      { status: 500 },
    );
  }
}