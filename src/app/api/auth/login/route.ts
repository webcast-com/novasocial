import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, setSessionCookie, toPublicUser, verifyPassword } from "@/lib/auth";
import { getClientIp, hitRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    // Throttle brute-force attempts per IP+username.
    const limit = hitRateLimit(`login:${getClientIp(request)}:${username}`, 10, 5 * 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit);

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = rows[0] ?? null;
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!ok) {
      // Generic message — do not reveal whether the username exists.
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ success: true, user: toPublicUser(user) });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
