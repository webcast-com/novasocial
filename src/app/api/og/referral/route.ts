import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTierForPoints } from "@/lib/gamification";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const refCode = searchParams.get("ref") || "VIBE_2026";

    const userRes = await db.select().from(users).where(eq(users.referralCode, refCode)).limit(1);
    const referrer = userRes[0] || {
      name: "VibePulse Pioneer",
      username: "vibepulse",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=vibepulse",
      totalPoints: 2450,
      currentLevel: "Community Champion",
    };

    const tierInfo = getTierForPoints(referrer.totalPoints || 0);

    return NextResponse.json({
      success: true,
      openGraph: {
        title: `${referrer.name} (@${referrer.username}) invited you to VibePulse!`,
        description: `Earn loyalty points for community posts, reactions, DMs, daily quests & referrals. Join now to earn +200 instant affiliate points!`,
        referrerName: referrer.name,
        referrerUsername: referrer.username,
        referrerAvatar: referrer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${referrer.username}`,
        totalPoints: referrer.totalPoints || 0,
        tierLevel: tierInfo.levelName,
        tierIcon: tierInfo.icon,
        shareUrl: `https://vibepulse.io/join?ref=${refCode}`,
      },
    });
  } catch (error: any) {
    console.error("OG endpoint error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
