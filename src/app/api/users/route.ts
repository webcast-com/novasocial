import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { hashPassword, newReferralCode, requireAdmin, toPublicUser } from "@/lib/auth";

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

    // Enhance with exact tier info + parsed showcase badges (password hashes stripped)
    const enhancedUsers = userList.map((user, idx) => ({
      ...toPublicUser(user),
      rank: idx + 1,
    }));

    return NextResponse.json({ success: true, users: enhancedUsers });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/**
 * Admin-only manual account creation. Public self-service signups (including
 * passwords and referral attribution) go through /api/auth/register.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, username, avatarUrl, bio, role, password } = body;

    if (!name || !username) {
      return NextResponse.json({ success: false, error: "Name and username are required." }, { status: 400 });
    }

    const newAvatar = avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
    // Admin-created accounts get a default password unless one is supplied.
    const passwordHash = await hashPassword(
      typeof password === "string" && password.length >= 8 ? password : "Welcome123!"
    );

    const inserted = await db.insert(users).values({
      name,
      username: username.toLowerCase().trim(),
      passwordHash,
      avatarUrl: newAvatar,
      role: role === "admin" ? "admin" : "user",
      referralCode: newReferralCode(username),
      bio: bio || "Excited to earn points and engage with the community!",
      totalPoints: 0,
      currentLevel: "Novice",
    }).returning();

    return NextResponse.json({
      success: true,
      user: toPublicUser(inserted[0]),
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
