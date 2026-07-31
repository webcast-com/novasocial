import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatGroups, chatMessages, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";
import { publish } from "@/lib/realtime";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupIdParam = searchParams.get("groupId");

    if (groupIdParam) {
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.groupId, Number(groupIdParam)))
        .orderBy(chatMessages.createdAt);

      return NextResponse.json({ success: true, messages });
    }

    // Return all chat groups
    const groups = await db.select().from(chatGroups).orderBy(desc(chatGroups.createdAt));
    return NextResponse.json({ success: true, groups });
  } catch (error: any) {
    console.error("Chat GET error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, groupId, senderId, content, name, description, category, isDirect } = body;

    if (action === "send") {
      if (!groupId || !senderId || !content || !content.trim()) {
        return NextResponse.json(
          { success: false, error: "Group ID, sender ID, and content are required." },
          { status: 400 }
        );
      }

      const senderRes = await db.select().from(users).where(eq(users.id, Number(senderId))).limit(1);
      if (senderRes.length === 0) {
        return NextResponse.json({ success: false, error: "Sender user not found." }, { status: 404 });
      }
      const sender = senderRes[0];

      const insertedMsg = await db
        .insert(chatMessages)
        .values({
          groupId: Number(groupId),
          senderId: sender.id,
          senderName: sender.name,
          senderUsername: sender.username,
          senderAvatar: sender.avatarUrl,
          content: content.trim(),
        })
        .returning();

      // Optionally award points for participating in chat discussions (+15 pts)
      const reward = await awardPoints({
        userId: sender.id,
        actionType: "comment_created", // maps to community discussion progress
        title: "In-App Community Chat",
        description: `Sent message in channel #${groupId}`,
        customPoints: 15,
      });

      // Real-time: broadcast the new message to everyone viewing this channel
      publish({
        type: "chat_message",
        payload: { scope: "group_message", groupId: Number(groupId), message: insertedMsg[0] },
      });

      return NextResponse.json({ success: true, message: insertedMsg[0], reward });
    }

    if (action === "create_group") {
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: "Channel name is required." }, { status: 400 });
      }

      const insertedGroup = await db
        .insert(chatGroups)
        .values({
          name: name.trim(),
          description: description || "Community interest discussion group",
          category: category || "General",
          isDirect: Boolean(isDirect),
          createdById: senderId ? Number(senderId) : null,
        })
        .returning();

      return NextResponse.json({
        success: true,
        group: insertedGroup[0],
        message: `Created channel '${insertedGroup[0].name}' successfully!`,
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Chat POST error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
