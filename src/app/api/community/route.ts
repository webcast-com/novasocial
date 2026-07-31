import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatGroups, communityMemberships, users } from "@/db/schema";
import { requireUser, toPublicUser } from "@/lib/auth";

const positiveId = (value: unknown) => { const id = Number(value); return Number.isInteger(id) && id > 0 ? id : null; };

async function canModerate(groupId: number, userId: number, systemRole: string) {
  if (systemRole === "admin") return true;
  const group = await db.select().from(chatGroups).where(eq(chatGroups.id, groupId)).limit(1);
  if (group[0]?.createdById === userId) return true;
  const membership = await db.select().from(communityMemberships).where(and(eq(communityMemberships.groupId, groupId), eq(communityMemberships.userId, userId))).limit(1);
  return membership[0]?.role === "moderator";
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request); if (auth instanceof NextResponse) return auth;
    const groupId = positiveId(request.nextUrl.searchParams.get("groupId"));
    if (!groupId) return NextResponse.json({ success: false, error: "Group required." }, { status: 400 });
    const memberships = await db.select().from(communityMemberships).where(eq(communityMemberships.groupId, groupId));
    const members = [];
    for (const membership of memberships) { const person = await db.select().from(users).where(eq(users.id, membership.userId)).limit(1); if (person[0]) members.push({ ...membership, user: toPublicUser(person[0]) }); }
    const mine = memberships.find((membership) => membership.userId === auth.id);
    return NextResponse.json({ success: true, members, isMember: Boolean(mine), myRole: mine?.role || null, canModerate: await canModerate(groupId, auth.id, auth.role) });
  } catch (error: any) { return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request); if (auth instanceof NextResponse) return auth;
    const body = await request.json(); const groupId = positiveId(body.groupId);
    if (!groupId) return NextResponse.json({ success: false, error: "Group required." }, { status: 400 });
    if (body.action === "join") { await db.insert(communityMemberships).values({ groupId, userId: auth.id, role: "member" }).onConflictDoNothing(); return NextResponse.json({ success: true }); }
    if (body.action === "leave") { await db.delete(communityMemberships).where(and(eq(communityMemberships.groupId, groupId), eq(communityMemberships.userId, auth.id))); return NextResponse.json({ success: true }); }
    if (body.action === "set_role") {
      const userId = positiveId(body.userId); const role = body.role === "moderator" ? "moderator" : body.role === "member" ? "member" : null;
      if (!userId || !role) return NextResponse.json({ success: false, error: "Valid member and role required." }, { status: 400 });
      if (!(await canModerate(groupId, auth.id, auth.role))) return NextResponse.json({ success: false, error: "Moderator access required." }, { status: 403 });
      await db.update(communityMemberships).set({ role }).where(and(eq(communityMemberships.groupId, groupId), eq(communityMemberships.userId, userId)));
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Unknown community action." }, { status: 400 });
  } catch (error: any) { return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 }); }
}
