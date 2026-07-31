import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { referrals, users } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import {
  createSession,
  hashPassword,
  newReferralCode,
  setSessionCookie,
  toPublicUser,
} from "@/lib/auth";
import { awardPoints } from "@/lib/gamification";
import { createNotification } from "@/lib/notify";
import { publish } from "@/lib/realtime";
import { getClientIp, hitRateLimit, rateLimitResponse } from "@/lib/ratelimit";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(request: NextRequest) {
  try {
    const limit = hitRateLimit(`register:${getClientIp(request)}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const referralCode = typeof body.referralCode === "string" ? body.referralCode.trim() : "";

    if (!name || name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { success: false, error: "Please provide your full name (2-80 characters)." },
        { status: 400 }
      );
    }
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { success: false, error: "Username must be 3-20 characters: letters, numbers and underscores only." },
        { status: 400 }
      );
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Resolve the referring member (if a valid, non-self referral code was supplied).
    let referrer: typeof users.$inferSelect | null = null;
    if (referralCode) {
      const refRows = await db
        .select()
        .from(users)
        .where(eq(users.referralCode, referralCode))
        .limit(1);
      if (refRows.length > 0) referrer = refRows[0];
    }

    const passwordHash = await hashPassword(password);

    let inserted;
    try {
      inserted = await db
        .insert(users)
        .values({
          name,
          username,
          passwordHash,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
          role: "user",
          referralCode: newReferralCode(username),
          referredById: referrer ? referrer.id : null,
          bio: "Excited to earn points and engage with the community!",
          totalPoints: 0,
          currentLevel: "Novice",
          equippedBadges: '["⭐ Pioneer"]',
        })
        .returning();
    } catch (err: any) {
      if (String(err?.message || err).includes("username")) {
        return NextResponse.json(
          { success: false, error: "That username is already taken. Try another one." },
          { status: 409 }
        );
      }
      throw err;
    }

    const newUser = inserted[0];

    // Attribute the referral: only counts when a real, distinct member registered.
    if (referrer && referrer.id !== newUser.id) {
      // Ignore duplicate attribution if this user was somehow already attributed.
      const dupes = await db
        .select()
        .from(referrals)
        .where(and(eq(referrals.referredUserId, newUser.id), ne(referrals.status, "void")))
        .limit(1);

      if (dupes.length === 0) {
        await db.insert(referrals).values({
          referrerId: referrer.id,
          referredUserId: newUser.id,
          referredEmail: `${username}@joined.vibe`,
          referredName: name,
          status: "completed",
          pointsAwarded: 200,
          completedAt: new Date(),
        });

        const reward = await awardPoints({
          userId: referrer.id,
          actionType: "referral_successful",
          title: "Successful Peer Referral",
          description: `Invited new verified member: ${name} (@${username})`,
          metadata: `referredUser:${newUser.id}`,
        });

        await createNotification({
          userId: referrer.id,
          type: "referral",
          title: "🎁 Referral completed!",
          message: `${name} joined using your invite link. You earned +${reward.pointsAwarded} pts!`,
          actorId: newUser.id,
          actorName: name,
          actorAvatar: newUser.avatarUrl,
          iconEmoji: "🎁",
        });

        // Welcome bonus for the new member.
        await awardPoints({
          userId: newUser.id,
          actionType: "welcome_bonus",
          title: "Welcome Bonus",
          description: `Joined via @${referrer.username}'s invite link`,
          customPoints: 50,
        });

        publish({ type: "leaderboard_update", payload: { reason: "referral" } });
      }
    }

    const { token, expiresAt } = await createSession(newUser.id);
    const response = NextResponse.json({
      success: true,
      user: toPublicUser(newUser),
      referralAttributed: Boolean(referrer && referrer.id !== newUser.id),
    });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
