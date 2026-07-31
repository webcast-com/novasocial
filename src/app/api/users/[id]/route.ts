import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTierForPoints } from "@/lib/gamification";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const results = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
    if (results.length === 0) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }
    let badges: string[] = [];
    try {
      badges = JSON.parse(results[0].equippedBadges || "[]");
    } catch {
      badges = [];
    }

    return NextResponse.json({
      success: true,
      user: {
        ...results[0],
        equippedBadges: badges,
        tierInfo: getTierForPoints(results[0].totalPoints),
      },
    });
  } catch (error: any) {
    console.error("Fetch single user error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number(id);
    const body = await request.json();

    const { name, bio, location, gender, avatarUrl, equippedBadges } = body;

    // Verify the user exists first
    const existing = await db.select().from(users).where(eq(users.id, numericId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    // Build a dynamic patch object with only the supplied fields
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (bio !== undefined) patch.bio = bio === null || bio === "" ? null : String(bio).trim();
    if (location !== undefined) patch.location = location === null || location === "" ? null : String(location).trim();
    if (gender !== undefined) patch.gender = gender === null || gender === "" ? null : String(gender);
    if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl === null || avatarUrl === "" ? null : String(avatarUrl).trim();
    if (equippedBadges !== undefined && Array.isArray(equippedBadges)) {
      patch.equippedBadges = JSON.stringify(equippedBadges);
    }

    if (name !== undefined && !patch.name) {
      return NextResponse.json({ success: false, error: "Name cannot be empty." }, { status: 400 });
    }

    const updated = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, numericId))
      .returning();

    let updatedBadges: string[] = [];
    try {
      updatedBadges = JSON.parse(updated[0].equippedBadges || "[]");
    } catch {
      updatedBadges = [];
    }

    return NextResponse.json({
      success: true,
      message: "Profile settings saved successfully!",
      user: {
        ...updated[0],
        equippedBadges: updatedBadges,
        tierInfo: getTierForPoints(updated[0].totalPoints),
      },
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
