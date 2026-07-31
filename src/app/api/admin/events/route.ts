import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { flashEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { publish } from "@/lib/realtime";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const events = await db.select().from(flashEvents).orderBy(flashEvents.id);
    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    console.error("Fetch flash events error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Flash events multiply the entire points economy — admin-only.
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { action, id, title, description, multiplier, isActive, bannerText } = body;

    if (action === "toggle") {
      if (!id) {
        return NextResponse.json({ success: false, error: "Event ID is required." }, { status: 400 });
      }

      const updated = await db
        .update(flashEvents)
        .set({
          isActive: Boolean(isActive),
          updatedAt: new Date(),
        })
        .where(eq(flashEvents.id, Number(id)))
        .returning();

      // Real-time: push the flash-event banner change to all connected clients
      publish({ type: "flash_event", payload: { event: updated[0] } });

      return NextResponse.json({
        success: true,
        event: updated[0],
        message: `Flash event '${updated[0].title}' is now ${isActive ? "ACTIVE (2X Multiplier Enabled)" : "Disabled"}.`,
      });
    }

    if (action === "create") {
      const parsedMultiplier = multiplier ? Number(multiplier) : 2;
      if (!Number.isInteger(parsedMultiplier) || parsedMultiplier < 1 || parsedMultiplier > 5) {
        return NextResponse.json({ success: false, error: "Multiplier must be an integer between 1 and 5." }, { status: 400 });
      }

      const inserted = await db
        .insert(flashEvents)
        .values({
          title: title || "🎉 HAPPY HOUR MULTIPLIER EVENT",
          description: description || "All points earned from posting, commenting, and reacting are DOUBLED!",
          multiplier: parsedMultiplier,
          isActive: true,
          bannerText: bannerText || "⚡ HAPPY HOUR ACTIVE: ALL ACTIVITY POINTS MULTIPLIED!",
        })
        .returning();

      return NextResponse.json({
        success: true,
        event: inserted[0],
        message: `Created Flash Event '${inserted[0].title}' successfully!`,
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Flash events POST error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
