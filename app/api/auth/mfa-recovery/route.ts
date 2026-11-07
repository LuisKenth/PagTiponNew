import { NextResponse } from "next/server";

// Retired request form: preserve old audit records, accept no new requests.
function retired() {
  return NextResponse.json(
    {
      error:
        "Recovery requests are no longer submitted here. Use your verified backup authenticator or contact the authorized PagTipon project maintainer.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = retired;
export const POST = retired;
