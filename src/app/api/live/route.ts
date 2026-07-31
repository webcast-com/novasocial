import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { liveRoomParticipants, liveRooms, users } from "@/db/schema";
import { requireUser, toPublicUser } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import { hitRateLimit, rateLimitResponse } from "@/lib/ratelimit";

const validId = (value: unknown) => { const id = Number(value); return Number.isInteger(id) && id > 0 ? id : null; };

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request); if (auth instanceof NextResponse) return auth;
    const rooms = await db.select().from(liveRooms).where(eq(liveRooms.status, "live")).orderBy(desc(liveRooms.createdAt)).limit(50);
    const items = [];
    for (const room of rooms) {
      const host = await db.select().from(users).where(eq(users.id, room.hostId)).limit(1);
      const viewers = await db.select({ value: count() }).from(liveRoomParticipants).where(eq(liveRoomParticipants.roomId, room.id));
      const joined = await db.select({ id: liveRoomParticipants.id }).from(liveRoomParticipants).where(and(eq(liveRoomParticipants.roomId, room.id), eq(liveRoomParticipants.userId, auth.id))).limit(1);
      if (host[0]) items.push({ ...room, host: toPublicUser(host[0]), viewerCount: viewers[0]?.value ?? 0, isJoined: joined.length > 0 });
    }
    return NextResponse.json({ success: true, rooms: items });
  } catch (error: any) { return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request); if (auth instanceof NextResponse) return auth;
    const limit = hitRateLimit(`live:${auth.id}`, 80, 60 * 1000); if (!limit.allowed) return rateLimitResponse(limit);
    const body = await request.json(); const action = body.action;
    if (action === "start") {
      const title = typeof body.title === "string" ? body.title.trim() : ""; const mode = body.mode === "audio" ? "audio" : "video";
      if (title.length < 3 || title.length > 120) return NextResponse.json({ success: false, error: "Broadcast title must be 3–120 characters." }, { status: 400 });
      const room = await db.insert(liveRooms).values({ hostId: auth.id, title, description: typeof body.description === "string" ? body.description.trim().slice(0, 300) : null, mode, status: "live" }).returning();
      await db.insert(liveRoomParticipants).values({ roomId: room[0].id, userId: auth.id, role: "host" });
      publish({ type: "live_room", payload: { action: "started", room: room[0] } });
      return NextResponse.json({ success: true, room: room[0] });
    }
    const roomId = validId(body.roomId); if (!roomId) return NextResponse.json({ success: false, error: "Valid room required." }, { status: 400 });
    const roomRows = await db.select().from(liveRooms).where(eq(liveRooms.id, roomId)).limit(1); const room = roomRows[0];
    if (!room || room.status !== "live") return NextResponse.json({ success: false, error: "Live room not found." }, { status: 404 });
    if (action === "join") {
      await db.insert(liveRoomParticipants).values({ roomId, userId: auth.id, role: auth.id === room.hostId ? "host" : "viewer" }).onConflictDoNothing();
      if (auth.id !== room.hostId) publish({ type: "live_signal", targetUserId: room.hostId, payload: { roomId, fromUserId: auth.id, signal: { type: "viewer_ready" } } });
      return NextResponse.json({ success: true });
    }
    if (action === "end") {
      if (room.hostId !== auth.id) return NextResponse.json({ success: false, error: "Only the host can end this broadcast." }, { status: 403 });
      await db.update(liveRooms).set({ status: "ended", endedAt: new Date() }).where(eq(liveRooms.id, roomId));
      publish({ type: "live_room", payload: { action: "ended", roomId } });
      return NextResponse.json({ success: true });
    }
    if (action === "signal") {
      const targetUserId = validId(body.targetUserId); const signal = body.signal;
      if (!targetUserId || !signal || typeof signal.type !== "string") return NextResponse.json({ success: false, error: "Invalid live signaling payload." }, { status: 400 });
      const participants = await db.select({ userId: liveRoomParticipants.userId }).from(liveRoomParticipants).where(eq(liveRoomParticipants.roomId, roomId));
      const participantIds = participants.map((participant) => participant.userId);
      if (!participantIds.includes(auth.id) || !participantIds.includes(targetUserId)) return NextResponse.json({ success: false, error: "Room participant required." }, { status: 403 });
      publish({ type: "live_signal", targetUserId, payload: { roomId, fromUserId: auth.id, signal } });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Unknown live action." }, { status: 400 });
  } catch (error: any) { console.error("Live POST error:", error); return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 }); }
}
