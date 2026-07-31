import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, posts, comments, reactions, shares, referrals, activityLogs, userRewards } from "@/db/schema";
import { count, sum, eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const totalUsersRes = await db.select({ val: count() }).from(users);
    const totalPostsRes = await db.select({ val: count() }).from(posts);
    const totalCommentsRes = await db.select({ val: count() }).from(comments);
    const totalReactionsRes = await db.select({ val: count() }).from(reactions);
    const totalSharesRes = await db.select({ val: count() }).from(shares);
    const completedRefsRes = await db.select({ val: count() }).from(referrals).where(eq(referrals.status, "completed"));
    const totalRewardsRedeemedRes = await db.select({ val: count() }).from(userRewards);

    // Sum total points currently held
    const totalPointsRes = await db.select({ val: sum(users.totalPoints) }).from(users);

    // Group logs by activity type to see what generates the most engagement
    const breakdownRes = await db
      .select({
        activityType: activityLogs.activityType,
        count: count(),
        pointsGenerated: sum(activityLogs.pointsChange),
      })
      .from(activityLogs)
      .groupBy(activityLogs.activityType);

    const stats = {
      totalUsers: totalUsersRes[0]?.val ?? 0,
      totalPoints: Number(totalPointsRes[0]?.val ?? 0),
      totalPosts: totalPostsRes[0]?.val ?? 0,
      totalComments: totalCommentsRes[0]?.val ?? 0,
      totalReactions: totalReactionsRes[0]?.val ?? 0,
      totalShares: totalSharesRes[0]?.val ?? 0,
      totalReferrals: completedRefsRes[0]?.val ?? 0,
      totalRewardsRedeemed: totalRewardsRedeemedRes[0]?.val ?? 0,
      activityBreakdown: breakdownRes.map((b) => ({
        activityType: b.activityType,
        count: b.count,
        pointsGenerated: Number(b.pointsGenerated ?? 0),
      })),
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
