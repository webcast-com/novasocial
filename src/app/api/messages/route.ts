import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { directConversations, directMessages, users } from "@/db/schema";
import { requireUser, toPublicUser } from "@/lib/auth";
import { createNotification } from "@/lib/notify";
import { publish } from "@/lib/realtime";
import { hitRateLimit, rateLimitResponse } from "@/lib/ratelimit";

function id(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

async function conversationForUser(conversationId: number, userId: number) {
  const rows = await db.select().from(directConversations).where(eq(directConversations.id, conversationId)).limit(1);
  const conversation = rows[0];
  if (!conversation || (conversation.participantOneId !== userId && conversation.participantTwoId !== userId)) return null;
  return conversation;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const conversationId = id(request.nextUrl.searchParams.get("conversationId"));

    if (conversationId) {
      const conversation = await conversationForUser(conversationId, auth.id);
      if (!conversation) return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });
      const messages = await db.select().from(directMessages).where(eq(directMessages.conversationId, conversationId)).orderBy(directMessages.createdAt).limit(300);
      await db.update(directMessages).set({ isRead: true }).where(and(eq(directMessages.conversationId, conversationId), eq(directMessages.isRead, false)));
      return NextResponse.json({ success: true, messages });
    }

    const conversations = await db
      .select()
      .from(directConversations)
      .where(or(eq(directConversations.participantOneId, auth.id), eq(directConversations.participantTwoId, auth.id)))
      .orderBy(desc(directConversations.updatedAt));

    const result = [];
    for (const conversation of conversations) {
      const partnerId = conversation.participantOneId === auth.id ? conversation.participantTwoId : conversation.participantOneId;
      const partnerRows = await db.select().from(users).where(eq(users.id, partnerId)).limit(1);
      if (!partnerRows[0]) continue;
      const latest = await db.select().from(directMessages).where(eq(directMessages.conversationId, conversation.id)).orderBy(desc(directMessages.createdAt)).limit(1);
      const unread = await db.select().from(directMessages).where(and(eq(directMessages.conversationId, conversation.id), eq(directMessages.isRead, false))).limit(300);
      result.push({
        ...conversation,
        partner: toPublicUser(partnerRows[0]),
        lastMessage: latest[0]?.content || null,
        unreadCount: unread.filter((message) => message.senderId !== auth.id).length,
      });
    }

    return NextResponse.json({ success: true, conversations: result });
  } catch (error: any) {
    console.error("Messages GET error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const limit = hitRateLimit(`dm:${auth.id}`, 80, 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit);
    const body = await request.json();

    if (body.action === "start") {
      const partnerId = id(body.partnerId);
      if (!partnerId || partnerId === auth.id) return NextResponse.json({ success: false, error: "Choose another member to message." }, { status: 400 });
      const partner = await db.select().from(users).where(eq(users.id, partnerId)).limit(1);
      if (!partner[0]) return NextResponse.json({ success: false, error: "Member not found." }, { status: 404 });
      const [one, two] = auth.id < partnerId ? [auth.id, partnerId] : [partnerId, auth.id];
      let conversation = await db.select().from(directConversations).where(and(eq(directConversations.participantOneId, one), eq(directConversations.participantTwoId, two))).limit(1);
      if (!conversation[0]) {
        conversation = await db.insert(directConversations).values({ participantOneId: one, participantTwoId: two }).onConflictDoNothing().returning();
        if (!conversation[0]) conversation = await db.select().from(directConversations).where(and(eq(directConversations.participantOneId, one), eq(directConversations.participantTwoId, two))).limit(1);
      }
      return NextResponse.json({ success: true, conversation: conversation[0], partner: toPublicUser(partner[0]) });
    }

    if (body.action === "send") {
      const conversationId = id(body.conversationId);
      const content = typeof body.content === "string" ? body.content.trim() : "";
      if (!conversationId || !content || content.length > 2000) return NextResponse.json({ success: false, error: "Message must be 1–2,000 characters." }, { status: 400 });
      const conversation = await conversationForUser(conversationId, auth.id);
      if (!conversation) return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });
      const recipientId = conversation.participantOneId === auth.id ? conversation.participantTwoId : conversation.participantOneId;
      const inserted = await db.insert(directMessages).values({ conversationId, senderId: auth.id, content }).returning();
      await db.update(directConversations).set({ updatedAt: new Date() }).where(eq(directConversations.id, conversationId));
      await createNotification({ userId: recipientId, type: "dm", title: "New private message", message: `${auth.name}: ${content.slice(0, 80)}`, actorId: auth.id, actorName: auth.name, actorAvatar: auth.avatarUrl, entityId: conversationId, iconEmoji: "✉️" });
      publish({ type: "direct_message", targetUserId: recipientId, payload: { conversationId, message: inserted[0] } });
      return NextResponse.json({ success: true, message: inserted[0] });
    }

    return NextResponse.json({ success: false, error: "Unknown message action." }, { status: 400 });
  } catch (error: any) {
    console.error("Messages POST error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
