import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rewards, userRewards, users, activityLogs } from "@/db/schema";
import { desc, eq, and, sql, gte } from "drizzle-orm";
import { getTierForPoints } from "@/lib/gamification";
import { getSessionUser, requireUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Redemption history is private: it is only returned for the session user.
    const sessionUser = await getSessionUser(request);

    const availableRewards = await db.select().from(rewards).orderBy(rewards.costPoints);

    let redemptions: any[] = [];
    if (sessionUser) {
      const dbRedemptions = await db
        .select()
        .from(userRewards)
        .where(eq(userRewards.userId, sessionUser.id))
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
    // Points can only be spent by their owner: the session user.
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json({ success: false, error: "Reward ID is required." }, { status: 400 });
    }

    const rRes = await db.select().from(rewards).where(eq(rewards.id, Number(rewardId))).limit(1);
    if (rRes.length === 0) {
      return NextResponse.json({ success: false, error: "Reward item not found." }, { status: 404 });
    }

    const user = auth;
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

    // Deduct points ATOMICALLY: the UPDATE only applies if the balance still
    // covers the cost, so concurrent redemptions can never double-spend.
    const deducted = await db
      .update(users)
      .set({ totalPoints: sql`${users.totalPoints} - ${reward.costPoints}` })
      .where(and(eq(users.id, user.id), gte(users.totalPoints, reward.costPoints)))
      .returning();
    if (deducted.length === 0) {
      return NextResponse.json({ success: false, error: "Insufficient points (balance changed) — please retry." }, { status: 400 });
    }

    // Decrement stock atomically as well; if the last item was just taken,
    // refund the points so the user is never charged for nothing.
    const stocked = await db
      .update(rewards)
      .set({ stock: sql`${rewards.stock} - 1` })
      .where(and(eq(rewards.id, reward.id), gte(rewards.stock, 1)))
      .returning();
    if (stocked.length === 0) {
      await db
        .update(users)
        .set({ totalPoints: sql`${users.totalPoints} + ${reward.costPoints}` })
        .where(eq(users.id, user.id));
      return NextResponse.json({ success: false, error: "This item is out of stock!" }, { status: 400 });
    }

    // Recalculate level based on the true post-deduction balance
    const newTotal = deducted[0].totalPoints;
    const newTier = getTierForPoints(newTotal);
    await db.update(users).set({ currentLevel: newTier.levelName }).where(eq(users.id, user.id));

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
