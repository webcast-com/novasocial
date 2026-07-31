import { NextRequest, NextResponse } from "next/server";
import { randomBytes, scrypt, timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq, lt } from "drizzle-orm";
import { getTierForPoints } from "@/lib/gamification";

const scryptAsync = promisify(scrypt);

// ---------------------------------------------------------------------------
// Password hashing (scrypt, per-user random salt, constant-time comparison)
// ---------------------------------------------------------------------------

const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string | null): Promise<boolean> {
  if (!storedHash) return false;
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hex] = parts;
  try {
    const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
    const expected = Buffer.from(hex, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sessions (opaque bearer token; only the SHA-256 hash is persisted)
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = "vp_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newReferralCode(username: string): string {
  const clean = username.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10) || "PULSE";
  const suffix = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${clean}_REF_${suffix}`;
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

// ---------------------------------------------------------------------------
// Session lookup
// ---------------------------------------------------------------------------

export type SessionUser = typeof users.$inferSelect;

/**
 * Resolve the authenticated user from the request's session cookie.
 * Returns null when there is no valid (unexpired) session.
 */
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const tokenHash = hashToken(token);
  const rows = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1);
  if (rows.length === 0) return null;

  const session = rows[0];
  if (session.expiresAt.getTime() <= Date.now()) {
    // Clean up the expired session eagerly.
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }

  const userRows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (userRows.length === 0) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }

  // Occasionally sweep expired sessions so the table does not grow unbounded.
  if (Math.random() < 0.02) {
    db.delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .catch(() => {});
  }

  return userRows[0];
}

export function unauthorized(message = "You must be signed in to perform this action.") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = "You do not have permission to perform this action.") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

/**
 * Returns the authenticated user, or a ready-to-return 401 NextResponse.
 * Usage: const auth = await requireUser(req); if (auth instanceof NextResponse) return auth;
 */
export async function requireUser(request: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  return user;
}

/**
 * Returns the authenticated admin user, or a ready-to-return 401/403 NextResponse.
 */
export async function requireAdmin(request: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden("Admin access required.");
  return user;
}

// ---------------------------------------------------------------------------
// Serialization — never leak the password hash to clients.
// ---------------------------------------------------------------------------

export function toPublicUser<T extends Record<string, any>>(user: T) {
  if (!user) return user;
  const { passwordHash: _passwordHash, ...rest } = user as any;
  let badges: string[] = [];
  if (typeof rest.equippedBadges === "string") {
    try {
      badges = JSON.parse(rest.equippedBadges || "[]");
    } catch {
      badges = [];
    }
  }
  return {
    ...rest,
    equippedBadges: Array.isArray(rest.equippedBadges) ? rest.equippedBadges : badges,
    tierInfo: getTierForPoints(rest.totalPoints ?? 0),
  };
}
