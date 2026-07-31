import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { referrals, users } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";
import { createNotification } from "@/lib/notify";
import { publish } from "@/lib/realtime";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("userId");

    let referralList;
    if (userIdParam && userIdParam !== "all") {
      referralList = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referrerId, Number(userIdParam)))
        .orderBy(desc(referrals.createdAt));
    } else {
      referralList = await db.select().from(referrals).orderBy(desc(referrals.createdAt));
    }

    // Enhance with referrer details if needed
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const enriched = referralList.map((ref) => {
      const referrer = userMap.get(ref.referrerId);
      return {
        ...ref,
        referrerName: referrer?.name || "Unknown",
        referrerUsername: referrer?.username || "unknown",
        referrerCode: referrer?.referralCode || "N/A",
      };
    });

    return NextResponse.json({ success: true, referrals: enriched });
  } catch (error) {
    console.error("Fetch referrals error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, referrerId, email, name, referralId } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: "Action is required." }, { status: 400 });
    }

    // 1. Action: send invite (pending referral)
    if (action === "invite") {
      if (!referrerId || !email) {
        return NextResponse.json({ success: false, error: "Referrer ID and recipient email are required." }, { status: 400 });
      }

      const referrerRes = await db.select().from(users).where(eq(users.id, Number(referrerId))).limit(1);
      if (referrerRes.length === 0) {
        return NextResponse.json({ success: false, error: "Referrer user not found." }, { status: 404 });
      }
      const referrer = referrerRes[0];

      // Check if email already referred by this user
      const existing = await db.select().from(referrals).where(
        and(eq(referrals.referrerId, referrer.id), eq(referrals.referredEmail, email.trim().toLowerCase()))
      ).limit(1);

      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: "An invitation has already been sent to this email address." }, { status: 400 });
      }

      const inserted = await db.insert(referrals).values({
        referrerId: referrer.id,
        referredEmail: email.trim().toLowerCase(),
        referredName: name || email.split("@")[0],
        status: "pending",
        pointsAwarded: 0,
      }).returning();

      return NextResponse.json({
        success: true,
        message: `Invitation sent to ${email}! Points will be awarded upon their completion.`,
        referral: inserted[0],
      });
    }

    // 2. Action: simulate_signup (completing a pending referral or generating instant simulated conversion)
    if (action === "simulate_signup") {
      let targetReferral;

      if (referralId) {
        const refRes = await db.select().from(referrals).where(eq(referrals.id, Number(referralId))).limit(1);
        if (refRes.length > 0 && refRes[0].status === "pending") {
          targetReferral = refRes[0];
        }
      }

      let referrerUser;
      if (targetReferral) {
        const uRes = await db.select().from(users).where(eq(users.id, targetReferral.referrerId)).limit(1);
        referrerUser = uRes[0];
      } else if (referrerId) {
        const uRes = await db.select().from(users).where(eq(users.id, Number(referrerId))).limit(1);
        referrerUser = uRes[0];
      }

      if (!referrerUser) {
        return NextResponse.json({ success: false, error: "Could not identify referrer user." }, { status: 404 });
      }

      // Create a brand new simulated community member
      const simNames = ["Samantha Cole", "Jordan Rivera", "Tyler Chen", "Taylor Vance", "Alex Mercer", "Chloe Brooks", "Casey Morgan", "Dana Scully"];
      const randomName = targetReferral?.referredName || simNames[Math.floor(Math.random() * simNames.length)];
      const randomUserHandle = `${randomName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Math.floor(100 + Math.random() * 900)}`;

      // Insert new user
      const newSimUser = await db.insert(users).values({
        name: randomName,
        username: randomUserHandle,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomUserHandle}`,
        role: "user",
        referralCode: `${randomUserHandle.toUpperCase().slice(0, 8)}_VIP`,
        referredById: referrerUser.id,
        totalPoints: 50, // Welcome bonus!
        currentLevel: "Novice",
        bio: `Joined VibePulse via referral from @${referrerUser.username}!`,
      }).returning();

      // Update or create referral record
      let completedReferral;
      if (targetReferral) {
        const updated = await db.update(referrals).set({
          referredUserId: newSimUser[0].id,
          status: "completed",
          pointsAwarded: 200,
          completedAt: new Date(),
        }).where(eq(referrals.id, targetReferral.id)).returning();
        completedReferral = updated[0];
      } else {
        const created = await db.insert(referrals).values({
          referrerId: referrerUser.id,
          referredUserId: newSimUser[0].id,
          referredEmail: `${randomUserHandle}@vibe-mail.org`,
          referredName: randomName,
          status: "completed",
          pointsAwarded: 200,
          completedAt: new Date(),
        }).returning();
        completedReferral = created[0];
      }

      // Award points to referrer
      const reward = await awardPoints({
        userId: referrerUser.id,
        actionType: "referral_successful",
        title: "Successful Peer Referral",
        description: `Invited new verified member: ${randomName} (@${randomUserHandle})`,
        metadata: `referredUser:${newSimUser[0].id}`,
      });

      // Real-time: notify the referrer + refresh leaderboard for everyone
      await createNotification({
        userId: referrerUser.id,
        type: "referral",
        title: "🎁 Referral completed!",
        message: `${randomName} joined using your invite link. You earned +${reward.pointsAwarded} pts!`,
        actorId: newSimUser[0].id,
        actorName: randomName,
        actorAvatar: newSimUser[0].avatarUrl,
        iconEmoji: "🎁",
      });
      publish({ type: "leaderboard_update", payload: { reason: "referral" } });

      return NextResponse.json({
        success: true,
        message: `🎉 Success! ${randomName} joined via @${referrerUser.username}'s referral link! Awarded +${reward.pointsAwarded} pts!`,
        referral: completedReferral,
        newUser: newSimUser[0],
        reward,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid referral action." }, { status: 400 });
  } catch (error: any) {
    console.error("Referrals post error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
