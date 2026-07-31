import { db } from "@/db";
import { users, activityRules, activityLogs, flashEvents, quests, userQuestProgress } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { publish } from "@/lib/realtime";

export interface TierInfo {
  levelName: string;
  minPoints: number;
  maxPoints: number;
  badgeColor: string;
  icon: string;
  tierNumber: number;
}

export const TIERS: TierInfo[] = [
  { tierNumber: 1, levelName: "Novice", minPoints: 0, maxPoints: 249, badgeColor: "bg-slate-200 text-slate-800 border-slate-400", icon: "🌱" },
  { tierNumber: 2, levelName: "Contributor", minPoints: 250, maxPoints: 699, badgeColor: "bg-blue-100 text-blue-800 border-blue-400", icon: "🚀" },
  { tierNumber: 3, levelName: "Rising Star", minPoints: 700, maxPoints: 1499, badgeColor: "bg-purple-100 text-purple-800 border-purple-400", icon: "⭐" },
  { tierNumber: 4, levelName: "Community Champion", minPoints: 1500, maxPoints: 2999, badgeColor: "bg-amber-100 text-amber-800 border-amber-400", icon: "🏆" },
  { tierNumber: 5, levelName: "Pulse Grandmaster", minPoints: 3000, maxPoints: 99999, badgeColor: "bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 text-white border-transparent shadow-md", icon: "👑" },
];

export function getTierForPoints(points: number): TierInfo {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].minPoints) {
      return TIERS[i];
    }
  }
  return TIERS[0];
}

export async function awardPoints({
  userId,
  actionType,
  title,
  description,
  metadata,
  customPoints,
}: {
  userId: number;
  actionType: string;
  title?: string;
  description?: string;
  metadata?: string;
  customPoints?: number;
}): Promise<{
  success: boolean;
  pointsAwarded: number;
  newTotalPoints: number;
  previousLevel: string;
  newLevel: string;
  leveledUp: boolean;
  message: string;
}> {
  // 1. Fetch user
  const userResults = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userResults.length === 0) {
    throw new Error("User not found");
  }
  const user = userResults[0];

  // 2. Fetch rule or use custom points
  let pointsToAward = customPoints !== undefined ? customPoints : 0;
  let ruleTitle = title || actionType;
  let dailyCap: number | null = null;
  let capReached = false;

  if (customPoints === undefined) {
    const ruleResults = await db.select().from(activityRules).where(eq(activityRules.actionType, actionType)).limit(1);
    if (ruleResults.length > 0) {
      const rule = ruleResults[0];
      if (!rule.isActive) {
        pointsToAward = 0;
      } else {
        pointsToAward = rule.points;
        dailyCap = rule.dailyCap;
      }
      if (!title) {
        ruleTitle = rule.name;
      }
    }
  }

  // 2b. Enforce the rule's daily cap: count points already earned TODAY for this
  // exact action (rule-based awards only; custom-point awards like quest claims
  // and streak bonuses have their own once-a-day safeguards).
  let capRemaining = Infinity;
  if (dailyCap !== null && dailyCap !== undefined && pointsToAward > 0) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const earnedRows = await db
      .select({ total: sql<number>`coalesce(sum(${activityLogs.pointsChange}), 0)` })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.userId, userId),
          eq(activityLogs.activityType, actionType),
          gt(activityLogs.createdAt, startOfDay),
          gt(activityLogs.pointsChange, 0)
        )
      );
    const earnedToday = Number(earnedRows[0]?.total ?? 0);
    capRemaining = Math.max(0, dailyCap - earnedToday);
    if (capRemaining <= 0) {
      pointsToAward = 0;
      capReached = true;
    }
  }

  // Check if there is an active Flash Event multiplier (e.g. 2X Happy Hour).
  // Multipliers only apply to RULE-BASED activity awards (posting, commenting,
  // reacting, sharing, referrals). One-off custom bonuses (quest claims,
  // streak bonuses, welcome bonuses) are never multiplied — otherwise flash
  // events would inflate fixed-value rewards far beyond their design.
  let appliedMultiplier = 1;
  if (pointsToAward > 0 && customPoints === undefined) {
    try {
      const activeEvents = await db.select().from(flashEvents).where(eq(flashEvents.isActive, true)).limit(1);
      if (activeEvents.length > 0 && activeEvents[0].multiplier > 1) {
        appliedMultiplier = activeEvents[0].multiplier;
        pointsToAward = pointsToAward * appliedMultiplier;
        ruleTitle = `${ruleTitle} (${activeEvents[0].title} ${appliedMultiplier}X Bonus!)`;
      }
    } catch (e) {
      console.error("Flash event lookup error:", e);
    }
  }

  // Clamp the (possibly multiplied) award to what remains under the daily cap.
  if (pointsToAward > 0 && capRemaining !== Infinity && pointsToAward > capRemaining) {
    pointsToAward = capRemaining;
  }

  const previousTotal = user.totalPoints;
  const newTotalPoints = Math.max(0, previousTotal + pointsToAward);
  
  const oldTier = getTierForPoints(previousTotal);
  const newTier = getTierForPoints(newTotalPoints);
  const leveledUp = newTier.tierNumber > oldTier.tierNumber;

  // 3. Log activity
  await db.insert(activityLogs).values({
    userId,
    activityType: actionType,
    title: ruleTitle,
    description: description || `Earned +${pointsToAward} pts for ${actionType.replace("_", " ")}`,
    pointsChange: pointsToAward,
    metadata: metadata || "",
    createdAt: new Date(),
  });

  // 4. Update user profile
  await db.update(users).set({
    totalPoints: newTotalPoints,
    currentLevel: newTier.levelName,
  }).where(eq(users.id, userId));

  // 5. Check and advance any daily/weekly quests for this action.
  // Only actions that actually earned points count — this stops zero-point
  // spam (past the daily cap) from inflating quest progress.
  if (pointsToAward > 0) {
    try {
      await recordQuestProgress(userId, actionType);
    } catch (err) {
      console.error("Quest recording error:", err);
    }
  }

  // 6. Real-time: push live points ticker to the user + refresh leaderboard
  try {
    publish({
      type: "points_update",
      targetUserId: userId,
      payload: { userId, newTotalPoints, pointsAwarded: pointsToAward, newLevel: newTier.levelName, leveledUp },
    });
    if (pointsToAward !== 0) {
      publish({ type: "leaderboard_update", payload: { reason: "points", userId } });
    }
  } catch (err) {
    console.error("Realtime publish error:", err);
  }

  return {
    success: true,
    pointsAwarded: pointsToAward,
    newTotalPoints,
    previousLevel: oldTier.levelName,
    newLevel: newTier.levelName,
    leveledUp,
    message: capReached
      ? `Daily cap reached for ${ruleTitle} — come back tomorrow to keep earning!`
      : leveledUp
        ? `Level Up! You earned +${pointsToAward} pts and reached ${newTier.levelName} (${newTier.icon})!`
        : `Awesome! You earned +${pointsToAward} pts!`,
  };
}

export async function recordQuestProgress(userId: number, actionType: string) {
  const dateKey = new Date().toISOString().slice(0, 10); // e.g. '2026-03-30'
  const matchingQuests = await db
    .select()
    .from(quests)
    .where(and(eq(quests.isActive, true), eq(quests.targetAction, actionType)));

  for (const q of matchingQuests) {
    const existing = await db
      .select()
      .from(userQuestProgress)
      .where(
        and(
          eq(userQuestProgress.userId, userId),
          eq(userQuestProgress.questId, q.id),
          eq(userQuestProgress.dateKey, dateKey)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      const isCompleted = 1 >= q.targetCount;
      await db.insert(userQuestProgress).values({
        userId,
        questId: q.id,
        currentCount: 1,
        isCompleted,
        isClaimed: false,
        completedAt: isCompleted ? new Date() : null,
        dateKey,
      });
    } else {
      const prog = existing[0];
      if (!prog.isCompleted) {
        const nextCount = prog.currentCount + 1;
        const isCompleted = nextCount >= q.targetCount;
        await db
          .update(userQuestProgress)
          .set({
            currentCount: nextCount,
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
          })
          .where(eq(userQuestProgress.id, prog.id));
      }
    }
  }
}
