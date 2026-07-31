import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser, toPublicUser } from "@/lib/auth";

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

    return NextResponse.json({
      success: true,
      user: toPublicUser(results[0]),
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

    // Users may only edit their OWN profile (admins excepted).
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "You must be signed in." }, { status: 401 });
    }
    if (sessionUser.id !== numericId && sessionUser.role !== "admin") {
      return NextResponse.json({ success: false, error: "You can only edit your own profile." }, { status: 403 });
    }

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

    return NextResponse.json({
      success: true,
      message: "Profile settings saved successfully!",
      user: toPublicUser(updated[0]),
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
