import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({error:"Provincial Admin management has moved to the Super Admin portal."}, {status:403});
}
