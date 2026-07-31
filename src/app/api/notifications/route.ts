import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required." }, { status: 400 });
    }

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, Number(userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(40);

    const unreadCount = list.filter((n) => !n.isRead).length;

    return NextResponse.json({ success: true, notifications: list, unreadCount });
  } catch (error: any) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, notificationId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required." }, { status: 400 });
    }

    if (action === "mark_read" && notificationId) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, Number(notificationId)), eq(notifications.userId, Number(userId))));
      return NextResponse.json({ success: true });
    }

    if (action === "mark_all_read") {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, Number(userId)));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    console.error("Notifications POST error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
