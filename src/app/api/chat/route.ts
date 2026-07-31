import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatGroups, chatMessages, communityMemberships } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";
import { publish } from "@/lib/realtime";
import { requireUser } from "@/lib/auth";
import { hitRateLimit, rateLimitResponse } from "@/lib/ratelimit";

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
    // Sender identity comes from the verified session, never from the body.
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const sender = auth;

    const body = await request.json();
    const { action, groupId, content, name, description, category, isDirect } = body;

    if (action === "send") {
      const limit = hitRateLimit(`chat:${sender.id}`, 60, 60 * 1000);
      if (!limit.allowed) return rateLimitResponse(limit);

      if (!groupId || !content || !content.trim()) {
        return NextResponse.json(
          { success: false, error: "Group ID and content are required." },
          { status: 400 }
        );
      }
      if (content.trim().length > 2000) {
        return NextResponse.json({ success: false, error: "Message is too long (max 2000 characters)." }, { status: 400 });
      }
      const membership = await db.select({ id: communityMemberships.id }).from(communityMemberships).where(and(eq(communityMemberships.groupId, Number(groupId)), eq(communityMemberships.userId, sender.id))).limit(1);
      if (membership.length === 0) {
        return NextResponse.json({ success: false, error: "Join this community before posting in its chat." }, { status: 403 });
      }

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

      // Chat messages earn through the standard "comment_created" rule, which
      // means they share the same daily cap as post comments. (This replaces an
      // uncapped flat +15 per message that allowed unlimited chat farming.)
      const reward = await awardPoints({
        userId: sender.id,
        actionType: "comment_created",
        title: "In-App Community Chat",
        description: `Sent message in channel #${groupId}`,
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

      if (name.trim().length > 64) {
        return NextResponse.json({ success: false, error: "Channel name is too long (max 64 characters)." }, { status: 400 });
      }

      const insertedGroup = await db
        .insert(chatGroups)
        .values({
          name: name.trim(),
          description: (typeof description === "string" ? description.slice(0, 200) : null) || "Community interest discussion group",
          category: category || "General",
          isDirect: Boolean(isDirect),
          createdById: sender.id,
        })
        .returning();

      await db.insert(communityMemberships).values({ groupId: insertedGroup[0].id, userId: sender.id, role: "moderator" });

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
