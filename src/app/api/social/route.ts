import { NextRequest, NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { posts, savedPosts, userFollows, users } from "@/db/schema";
import { getSessionUser, requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notify";
import { hitRateLimit, rateLimitResponse } from "@/lib/ratelimit";

function toPositiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function profileStats(profileId: number, viewerId?: number) {
  // Sequential queries keep the bundled PGlite socket development database
  // happy while remaining negligible for this small profile summary.
  const followers = await db.select({ value: count() }).from(userFollows).where(eq(userFollows.followedId, profileId));
  const following = await db.select({ value: count() }).from(userFollows).where(eq(userFollows.followerId, profileId));

  let isFollowing = false;
  if (viewerId && viewerId !== profileId) {
    const connection = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(and(eq(userFollows.followerId, viewerId), eq(userFollows.followedId, profileId)))
      .limit(1);
    isFollowing = connection.length > 0;
  }

  return {
    followerCount: followers[0]?.value ?? 0,
    followingCount: following[0]?.value ?? 0,
    isFollowing,
  };
}

/**
 * Public profile counts or the signed-in member's following IDs. The session is
 * only used to determine the viewer's own relationship, never from a query
 * string supplied by the browser.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    const profileId = toPositiveId(request.nextUrl.searchParams.get("profileId"));

    if (profileId) {
      const target = await db.select({ id: users.id }).from(users).where(eq(users.id, profileId)).limit(1);
      if (target.length === 0) {
        return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        profileId,
        stats: await profileStats(profileId, sessionUser?.id),
      });
    }

    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "You must be signed in." }, { status: 401 });
    }

    const following = await db
      .select({ userId: userFollows.followedId })
      .from(userFollows)
      .where(eq(userFollows.followerId, sessionUser.id));
    return NextResponse.json({ success: true, followingIds: following.map((row) => row.userId) });
  } catch (error: any) {
    console.error("Social GET error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

/** Follow/unfollow a creator or save/unsave a post for the session user. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const limit = hitRateLimit(`social:${auth.id}`, 120, 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = await request.json();
    const action = body.action;

    if (action === "toggle_follow") {
      const profileId = toPositiveId(body.profileId);
      if (!profileId) {
        return NextResponse.json({ success: false, error: "A valid profile is required." }, { status: 400 });
      }
      if (profileId === auth.id) {
        return NextResponse.json({ success: false, error: "You cannot follow your own profile." }, { status: 400 });
      }

      const target = await db.select().from(users).where(eq(users.id, profileId)).limit(1);
      if (target.length === 0) {
        return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });
      }

      const inserted = await db
        .insert(userFollows)
        .values({ followerId: auth.id, followedId: profileId })
        .onConflictDoNothing()
        .returning();

      let isFollowing = inserted.length > 0;
      if (inserted.length > 0) {
        await createNotification({
          userId: profileId,
          type: "follow",
          title: "You have a new follower",
          message: `${auth.name} started following your updates.`,
          actorId: auth.id,
          actorName: auth.name,
          actorAvatar: auth.avatarUrl,
          iconEmoji: "👤",
        });
      } else {
        await db
          .delete(userFollows)
          .where(and(eq(userFollows.followerId, auth.id), eq(userFollows.followedId, profileId)));
        // If a concurrent request removed it already, the final state is still
        // correctly reported as unfollowed and no extra side effect occurs.
        isFollowing = false;
      }

      return NextResponse.json({
        success: true,
        isFollowing,
        stats: await profileStats(profileId, auth.id),
        message: isFollowing ? `Following @${target[0].username}.` : `Unfollowed @${target[0].username}.`,
      });
    }

    if (action === "toggle_save") {
      const postId = toPositiveId(body.postId);
      if (!postId) {
        return NextResponse.json({ success: false, error: "A valid post is required." }, { status: 400 });
      }

      const targetPost = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId)).limit(1);
      if (targetPost.length === 0) {
        return NextResponse.json({ success: false, error: "Post not found." }, { status: 404 });
      }

      const inserted = await db
        .insert(savedPosts)
        .values({ userId: auth.id, postId })
        .onConflictDoNothing()
        .returning();

      if (inserted.length > 0) {
        return NextResponse.json({ success: true, isBookmarked: true, message: "Post saved to your private library." });
      }

      await db
        .delete(savedPosts)
        .where(and(eq(savedPosts.userId, auth.id), eq(savedPosts.postId, postId)));
      return NextResponse.json({ success: true, isBookmarked: false, message: "Post removed from your saved library." });
    }

    return NextResponse.json({ success: false, error: "Unknown social action." }, { status: 400 });
  } catch (error: any) {
    console.error("Social POST error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
