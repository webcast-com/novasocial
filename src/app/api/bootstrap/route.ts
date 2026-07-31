import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityRules, users } from "@/db/schema";
import { count } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { getSessionUser } from "@/lib/auth";

async function handle(request: NextRequest) {
  try {
    // Bootstrap is what seeds an EMPTY database on first run. Once data
    // exists, re-seeding is an admin-only operation — previously anyone could
    // invoke this endpoint at any time.
    const ruleCount = await db.select({ value: count() }).from(activityRules);
    const userCount = await db.select({ value: count() }).from(users);
    const isFresh = (ruleCount[0]?.value ?? 0) === 0 && (userCount[0]?.value ?? 0) === 0;

    if (!isFresh) {
      const sessionUser = await getSessionUser(request);
      if (!sessionUser || sessionUser.role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Bootstrap is admin-only once the database is seeded." },
          { status: 403 }
        );
      }
    }

    const seedResult = await ensureSeeded();
    return NextResponse.json({ success: true, ...seedResult });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
