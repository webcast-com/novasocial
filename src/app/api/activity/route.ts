import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";
import { requireUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("userId");
    const typeParam = searchParams.get("type");
    const limitParam = searchParams.get("limit");
    const maxRows = limitParam ? Number(limitParam) : 50;

    let logs;
    if (userIdParam && userIdParam !== "all") {
      if (typeParam && typeParam !== "all") {
        logs = await db
          .select()
          .from(activityLogs)
          .where(and(eq(activityLogs.userId, Number(userIdParam)), eq(activityLogs.activityType, typeParam)))
          .orderBy(desc(activityLogs.createdAt))
          .limit(maxRows);
      } else {
        logs = await db
          .select()
          .from(activityLogs)
          .where(eq(activityLogs.userId, Number(userIdParam)))
          .orderBy(desc(activityLogs.createdAt))
          .limit(maxRows);
      }
    } else if (typeParam && typeParam !== "all") {
      logs = await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.activityType, typeParam))
        .orderBy(desc(activityLogs.createdAt))
        .limit(maxRows);
    } else {
      logs = await db
        .select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(maxRows);
    }

    // Enhance logs with user details
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const enrichedLogs = logs.map((log) => {
      const u = userMap.get(log.userId);
      return {
        ...log,
        userName: u?.name || "Member",
        userHandle: u?.username || "user",
        userAvatar: u?.avatarUrl || null,
      };
    });

    return NextResponse.json({ success: true, logs: enrichedLogs });
  } catch (error) {
    console.error("Get activity logs error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check-ins execute as the signed-in user (never a spoofed body userId).
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.id;

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: "Action is required." }, { status: 400 });
    }

    if (action === "checkin") {
      // Check if already checked in today (in last 12 hours for demo fluidity)
      const twelveHoursAgo = new Date(Date.now() - 12 * 3600 * 1000);
      const existing = await db
        .select()
        .from(activityLogs)
        .where(and(eq(activityLogs.userId, userId), eq(activityLogs.activityType, "daily_login")))
        .limit(1);

      if (existing.length > 0 && existing[0].createdAt > twelveHoursAgo) {
        return NextResponse.json({
          success: false,
          error: "You have already claimed your Daily Pulse Check-In today! Check back later.",
        });
      }

      const reward = await awardPoints({
        userId: Number(userId),
        actionType: "daily_login",
        title: "Daily Pulse Check-In",
        description: "Checked in to maintain active community connection streak!",
      });

      return NextResponse.json({ success: true, reward });
    }

    return NextResponse.json({ success: false, error: "Unknown activity action." }, { status: 400 });
  } catch (error: any) {
    console.error("Activity trigger error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
