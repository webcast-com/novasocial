import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, toPublicUser, unauthorized } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized("Not signed in.");
  return NextResponse.json({ success: true, user: toPublicUser(user) });
}
