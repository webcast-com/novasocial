import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getTierForPoints } from "@/lib/gamification";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const roleFilter = searchParams.get("role");

    let userList;
    if (roleFilter) {
      userList = await db.select().from(users).where(eq(users.role, roleFilter)).orderBy(desc(users.totalPoints));
    } else {
      userList = await db.select().from(users).orderBy(desc(users.totalPoints));
    }

    // Enhance with exact tier info + parsed showcase badges
    const enhancedUsers = userList.map((user, idx) => {
      let badges: string[] = [];
      try {
        badges = JSON.parse(user.equippedBadges || "[]");
      } catch {
        badges = [];
      }
      return {
        ...user,
        rank: idx + 1,
        equippedBadges: badges,
        tierInfo: getTierForPoints(user.totalPoints),
      };
    });

    return NextResponse.json({ success: true, users: enhancedUsers });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, avatarUrl, bio, role } = body;

    if (!name || !username) {
      return NextResponse.json({ success: false, error: "Name and username are required." }, { status: 400 });
    }

    // Generate referral code
    const cleanHandle = username.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const referralCode = `${cleanHandle}_REF_${randomSuffix}`;

    const newAvatar = avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

    const inserted = await db.insert(users).values({
      name,
      username: username.toLowerCase().trim(),
      avatarUrl: newAvatar,
      role: role === "admin" ? "admin" : "user",
      referralCode,
      bio: bio || "Excited to earn points and engage with the community!",
      totalPoints: 0,
      currentLevel: "Novice",
    }).returning();

    return NextResponse.json({
      success: true,
      user: {
        ...inserted[0],
        tierInfo: getTierForPoints(inserted[0].totalPoints),
      },
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
