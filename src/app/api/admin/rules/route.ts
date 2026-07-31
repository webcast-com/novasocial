import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const rules = await db.select().from(activityRules).orderBy(activityRules.id);
    return NextResponse.json({ success: true, rules });
  } catch (error) {
    console.error("Fetch rules error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Editing the points economy is an admin-only operation.
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, name, description, points, isActive, dailyCap } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Rule ID is required." }, { status: 400 });
    }

    const parsedPoints = Number(points);
    if (!Number.isFinite(parsedPoints) || parsedPoints < 0 || parsedPoints > 100000) {
      return NextResponse.json({ success: false, error: "Points must be a number between 0 and 100,000." }, { status: 400 });
    }
    if (dailyCap !== undefined && dailyCap !== null && dailyCap !== "") {
      const cap = Number(dailyCap);
      if (!Number.isFinite(cap) || cap < 0 || cap > 1000000) {
        return NextResponse.json({ success: false, error: "Daily cap must be a positive number." }, { status: 400 });
      }
    }
    if (name !== undefined && (typeof name !== "string" || !name.trim() || name.trim().length > 80)) {
      return NextResponse.json({ success: false, error: "Name must be 1-80 characters." }, { status: 400 });
    }

    const updated = await db.update(activityRules).set({
      name: String(name).trim(),
      description: typeof description === "string" ? description.slice(0, 500) : "",
      points: parsedPoints,
      dailyCap: dailyCap !== undefined && dailyCap !== null && dailyCap !== "" ? Number(dailyCap) : null,
      isActive: Boolean(isActive),
      updatedAt: new Date(),
    }).where(eq(activityRules.id, Number(id))).returning();

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: "Rule not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Activity rule '${updated[0].name}' updated to ${updated[0].points} pts!`,
      rule: updated[0],
    });
  } catch (error: any) {
    console.error("Update rule error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
