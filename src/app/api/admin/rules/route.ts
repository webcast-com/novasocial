import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityRules } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    const body = await request.json();
    const { id, name, description, points, isActive, dailyCap } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Rule ID is required." }, { status: 400 });
    }

    const updated = await db.update(activityRules).set({
      name,
      description,
      points: Number(points),
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
