import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, destroySession, getSessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = getSessionToken(request);
    if (token) {
      await destroySession(token);
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
