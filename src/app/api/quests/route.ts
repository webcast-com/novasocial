import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quests, userQuestProgress, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { awardPoints, getTierForPoints } from "@/lib/gamification";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const dateKey = new Date().toISOString().slice(0, 10); // e.g. '2026-03-30'

    const activeQuests = await db.select().from(quests).where(eq(quests.isActive, true));

    let userProgressList: any[] = [];
    let userStreakInfo = null;

    if (userId) {
      const uRes = await db.select().from(users).where(eq(users.id, Number(userId))).limit(1);
      if (uRes.length > 0) {
        const u = uRes[0];
        userStreakInfo = {
          currentStreak: u.currentStreak || 1,
          maxStreak: u.maxStreak || 1,
          lastCheckinDate: u.lastCheckinDate,
          equippedBadges: (() => {
            try {
              return JSON.parse(u.equippedBadges || '["🔥 7-Day Streak", "⭐ Pioneer"]');
            } catch {
              return ["🔥 7-Day Streak", "⭐ Pioneer"];
            }
          })(),
        };
      }

      const progress = await db
        .select()
        .from(userQuestProgress)
        .where(and(eq(userQuestProgress.userId, Number(userId)), eq(userQuestProgress.dateKey, dateKey)));

      const questMap = new Map(activeQuests.map((q) => [q.id, q]));
      userProgressList = progress.map((p) => ({
        ...p,
        quest: questMap.get(p.questId),
      }));
    }

    // Merge activeQuests with progress so frontend sees all quests even if count is 0
    const progressMap = new Map(userProgressList.map((p) => [p.questId, p]));
    const mergedQuests = activeQuests.map((q) => {
      const p = progressMap.get(q.id);
      return {
        ...q,
        currentCount: p?.currentCount ?? 0,
        isCompleted: p?.isCompleted ?? false,
        isClaimed: p?.isClaimed ?? false,
        progressId: p?.id ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      quests: mergedQuests,
      userStreakInfo,
      dateKey,
    });
  } catch (error: any) {
    console.error("Quests GET error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, questId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    const numericUserId = Number(userId);

    if (action === "claim_quest") {
      if (!questId) {
        return NextResponse.json({ success: false, error: "Quest ID is required." }, { status: 400 });
      }

      const dateKey = new Date().toISOString().slice(0, 10);
      const qRes = await db.select().from(quests).where(eq(quests.id, Number(questId))).limit(1);
      if (qRes.length === 0) {
        return NextResponse.json({ success: false, error: "Quest not found." }, { status: 404 });
      }
      const quest = qRes[0];

      const progRes = await db
        .select()
        .from(userQuestProgress)
        .where(
          and(
            eq(userQuestProgress.userId, numericUserId),
            eq(userQuestProgress.questId, quest.id),
            eq(userQuestProgress.dateKey, dateKey)
          )
        )
        .limit(1);

      if (progRes.length === 0 || !progRes[0].isCompleted) {
        return NextResponse.json({ success: false, error: "Quest is not completed yet." }, { status: 400 });
      }
      if (progRes[0].isClaimed) {
        return NextResponse.json({ success: false, error: "Quest reward already claimed today." }, { status: 400 });
      }

      // Mark claimed
      await db
        .update(userQuestProgress)
        .set({ isClaimed: true })
        .where(eq(userQuestProgress.id, progRes[0].id));

      const reward = await awardPoints({
        userId: numericUserId,
        actionType: "quest_completed",
        title: `Quest Completed: ${quest.title}`,
        description: `Claimed +${quest.pointsReward} pts for daily challenge`,
        customPoints: quest.pointsReward,
      });

      return NextResponse.json({
        success: true,
        message: `🎉 Quest Claimed! Awarded +${reward.pointsAwarded} pts!`,
        reward,
      });
    }

    if (action === "streak_checkin") {
      const uRes = await db.select().from(users).where(eq(users.id, numericUserId)).limit(1);
      if (uRes.length === 0) {
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }
      const u = uRes[0];
      const dateKey = new Date().toISOString().slice(0, 10);

      if (u.lastCheckinDate === dateKey) {
        return NextResponse.json({
          success: false,
          error: "You have already checked in today! Check back tomorrow for your streak bonus.",
        });
      }

      const newStreak = (u.currentStreak || 0) + 1;
      const newMax = Math.max(u.maxStreak || 0, newStreak);

      // Multi-day Streak exponential bonus: e.g. day 1=+15, day 3=+30, day 7=+70
      const streakBonus = Math.min(100, 15 + (newStreak - 1) * 10);

      // Check if 7-Day streak badge should be added
      let badges: string[] = ["🔥 7-Day Streak", "⭐ Pioneer"];
      try {
        badges = JSON.parse(u.equippedBadges || '["🔥 7-Day Streak", "⭐ Pioneer"]');
      } catch {}
      if (newStreak >= 7 && !badges.includes("👑 7-Day Streak Master")) {
        badges.push("👑 7-Day Streak Master");
      }

      await db
        .update(users)
        .set({
          currentStreak: newStreak,
          maxStreak: newMax,
          lastCheckinDate: dateKey,
          equippedBadges: JSON.stringify(badges),
        })
        .where(eq(users.id, numericUserId));

      const reward = await awardPoints({
        userId: numericUserId,
        actionType: "daily_login",
        title: `Day ${newStreak} Consecutive Active Streak!`,
        description: `Daily Check-In Streak Multiplier Bonus (+${streakBonus} pts)`,
        customPoints: streakBonus,
      });

      return NextResponse.json({
        success: true,
        newStreak,
        reward,
        message: `🔥 Day ${newStreak} Streak! You earned +${reward.pointsAwarded} pts with streak multiplier!`,
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Quests POST error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
