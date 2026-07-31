import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rewards, userRewards, users, activityLogs } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { awardPoints, getTierForPoints } from "@/lib/gamification";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    const availableRewards = await db.select().from(rewards).orderBy(rewards.costPoints);

    let redemptions: any[] = [];
    if (userId) {
      const dbRedemptions = await db
        .select()
        .from(userRewards)
        .where(eq(userRewards.userId, Number(userId)))
        .orderBy(desc(userRewards.redeemedAt));

      const rewardMap = new Map(availableRewards.map((r) => [r.id, r]));
      redemptions = dbRedemptions.map((r) => {
        const item = rewardMap.get(r.rewardId);
        return {
          ...r,
          imageUrl: item?.imageUrl || null,
          category: item?.category || "reward",
        };
      });
    }

    return NextResponse.json({ success: true, rewards: availableRewards, userRedemptions: redemptions });
  } catch (error) {
    console.error("Get rewards error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, rewardId } = body;

    if (!userId || !rewardId) {
      return NextResponse.json({ success: false, error: "User ID and Reward ID are required." }, { status: 400 });
    }

    const uRes = await db.select().from(users).where(eq(users.id, Number(userId))).limit(1);
    const rRes = await db.select().from(rewards).where(eq(rewards.id, Number(rewardId))).limit(1);

    if (uRes.length === 0 || rRes.length === 0) {
      return NextResponse.json({ success: false, error: "User or reward item not found." }, { status: 404 });
    }

    const user = uRes[0];
    const reward = rRes[0];

    if (reward.stock <= 0) {
      return NextResponse.json({ success: false, error: "This item is out of stock!" }, { status: 400 });
    }

    if (user.totalPoints < reward.costPoints) {
      return NextResponse.json({
        success: false,
        error: `Insufficient points! You need ${reward.costPoints} pts, but have ${user.totalPoints} pts. Earn more points by interacting with the community!`,
      });
    }

    // Deduct points
    await db.update(users).set({
      totalPoints: user.totalPoints - reward.costPoints,
    }).where(eq(users.id, user.id));

    // Recalculate level after point spending or preserve highest? Generally level is current tier of points
    const newTotal = user.totalPoints - reward.costPoints;
    const newTier = getTierForPoints(newTotal);
    await db.update(users).set({ currentLevel: newTier.levelName }).where(eq(users.id, user.id));

    // Decrement stock
    await db.update(rewards).set({
      stock: sql`${rewards.stock} - 1`,
    }).where(eq(rewards.id, reward.id));

    // Record activity log
    await db.insert(activityLogs).values({
      userId: user.id,
      activityType: "reward_redeemed",
      title: `Redeemed Reward: ${reward.name}`,
      description: `Spent ${reward.costPoints} points on ${reward.category.toUpperCase()}`,
      pointsChange: -reward.costPoints,
      metadata: `rewardId:${reward.id}`,
      createdAt: new Date(),
    });

    // Insert user reward
    const newRedemption = await db.insert(userRewards).values({
      userId: user.id,
      rewardId: reward.id,
      rewardName: reward.name,
      pointsSpent: reward.costPoints,
      status: "fulfilled",
    }).returning();

    return NextResponse.json({
      success: true,
      message: `Successfully redeemed ${reward.name} for ${reward.costPoints} pts! Check your redemption vault.`,
      newTotalPoints: newTotal,
      redemption: newRedemption[0],
    });
  } catch (error: any) {
    console.error("Redeem reward error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
