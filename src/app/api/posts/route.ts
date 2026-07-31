import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, comments, reactions, shares, savedPosts, userFollows } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";
import { publish } from "@/lib/realtime";
import { getSessionUser, requireUser } from "@/lib/auth";
import { hitRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const media = searchParams.get("media");
    const feed = searchParams.get("feed") || "all";
    const sessionUser = await getSessionUser(request);

    // A signed-in member can switch from the global feed to creators they
    // follow, or to their private saved-post library. The session—not a userId
    // query parameter—always determines both collections.
    const filters = [];
    if (category && category !== "All") filters.push(eq(posts.category, category));
    if (media === "video") filters.push(eq(posts.mediaType, "video"));

    if (feed === "following" || feed === "saved") {
      if (!sessionUser) {
        return NextResponse.json({ success: false, error: "Sign in to use this feed." }, { status: 401 });
      }

      const ids = feed === "following"
        ? (await db.select({ id: userFollows.followedId }).from(userFollows).where(eq(userFollows.followerId, sessionUser.id))).map((row) => row.id)
        : (await db.select({ id: savedPosts.postId }).from(savedPosts).where(eq(savedPosts.userId, sessionUser.id))).map((row) => row.id);

      if (ids.length === 0) {
        return NextResponse.json({ success: true, posts: [], feed });
      }
      filters.push(feed === "following" ? inArray(posts.userId, ids) : inArray(posts.id, ids));
    }

    const whereClause = filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters);
    const allPosts = whereClause
      ? await db.select().from(posts).where(whereClause).orderBy(desc(posts.createdAt))
      : await db.select().from(posts).orderBy(desc(posts.createdAt));

    if (allPosts.length === 0) {
      return NextResponse.json({ success: true, posts: [], feed });
    }

    const postIds = allPosts.map((p) => p.id);

    // Fetch related comments and reactions
    const allComments = await db
      .select()
      .from(comments)
      .where(inArray(comments.postId, postIds))
      .orderBy(desc(comments.createdAt));

    const allReactions = await db
      .select()
      .from(reactions)
      .where(inArray(reactions.postId, postIds));

    const bookmarkedPostIds = new Set<number>();
    if (sessionUser) {
      const memberBookmarks = await db
        .select({ postId: savedPosts.postId })
        .from(savedPosts)
        .where(and(eq(savedPosts.userId, sessionUser.id), inArray(savedPosts.postId, postIds)));
      for (const bookmark of memberBookmarks) bookmarkedPostIds.add(bookmark.postId);
    }

    // Map them together
    const enrichedPosts = allPosts.map((post) => {
      const postComments = allComments.filter((c) => c.postId === post.id);
      const postReactions = allReactions.filter((r) => r.postId === post.id);

      // Summarize reactions
      const reactionsBreakdown: Record<string, number> = {};
      const reactedUserIds = new Set<number>();
      postReactions.forEach((r) => {
        reactionsBreakdown[r.reactionType] = (reactionsBreakdown[r.reactionType] || 0) + 1;
        reactedUserIds.add(r.userId);
      });

      let parsedOptions: string[] | undefined = undefined;
      let parsedVotes: Record<string, number> | undefined = undefined;
      try {
        if (post.pollOptions) parsedOptions = JSON.parse(post.pollOptions);
        if (post.pollVotes) parsedVotes = JSON.parse(post.pollVotes);
      } catch (e) {}

      return {
        ...post,
        commentsList: postComments,
        reactionsList: postReactions,
        reactionsBreakdown,
        reactedUserIds: Array.from(reactedUserIds),
        isBookmarked: bookmarkedPostIds.has(post.id),
        pollOptions: parsedOptions,
        pollVotes: parsedVotes,
      };
    });

    return NextResponse.json({ success: true, posts: enrichedPosts });
  } catch (error) {
    console.error("Get posts error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Author is resolved from the session — a client can no longer post as
    // someone else by sending their userId.
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const author = auth;

    const limit = hitRateLimit(`posts:${author.id}`, 20, 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = await request.json();
    const {
      title,
      content,
      category,
      mediaUrl,
      mediaType,
      codeSnippet,
      codeLanguage,
      pollQuestion,
      pollOptions,
    } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: "Title and content are required." }, { status: 400 });
    }
    if (typeof title !== "string" || typeof content !== "string" || title.trim().length === 0 || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Title and content cannot be empty." }, { status: 400 });
    }
    if (title.trim().length > 200) {
      return NextResponse.json({ success: false, error: "Title is too long (max 200 characters)." }, { status: 400 });
    }
    if (content.trim().length > 10000) {
      return NextResponse.json({ success: false, error: "Content is too long (max 10,000 characters)." }, { status: 400 });
    }
    if (pollOptions !== undefined && pollOptions !== null) {
      if (!Array.isArray(pollOptions) || pollOptions.length < 2 || pollOptions.length > 6 || pollOptions.some((o: any) => typeof o !== "string" || !o.trim())) {
        return NextResponse.json({ success: false, error: "Polls need 2-6 non-empty text options." }, { status: 400 });
      }
    }

    let pollOptionsStr: string | null = null;
    let pollVotesStr: string | null = null;
    if (pollOptions && Array.isArray(pollOptions) && pollOptions.length > 0) {
      pollOptionsStr = JSON.stringify(pollOptions);
      const initialVotes: Record<string, number> = {};
      pollOptions.forEach((opt: string) => {
        initialVotes[opt] = 0;
      });
      pollVotesStr = JSON.stringify(initialVotes);
    }

    // Insert post
    const inserted = await db.insert(posts).values({
      userId: author.id,
      authorName: author.name,
      authorUsername: author.username,
      authorAvatar: author.avatarUrl,
      title: title.trim(),
      content: content.trim(),
      category: category || "General",
      sharesCount: 0,
      reactionsCount: 0,
      commentsCount: 0,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      codeSnippet: codeSnippet || null,
      codeLanguage: codeLanguage || "javascript",
      pollQuestion: pollQuestion || null,
      pollOptions: pollOptionsStr,
      pollVotes: pollVotesStr,
    }).returning();

    // Award points for creating post
    const rewardResult = await awardPoints({
      userId: author.id,
      actionType: "post_created",
      title: "Published Community Post",
      description: `Published: "${title.slice(0, 45)}${title.length > 45 ? "..." : ""}"`,
      metadata: `postId:${inserted[0].id}`,
    });

    // Real-time: broadcast the new post so live feeds insert it instantly
    publish({
      type: "new_post",
      payload: {
        post: {
          ...inserted[0],
          commentsList: [],
          reactionsList: [],
          reactionsBreakdown: {},
          reactedUserIds: [],
          pollOptions: pollOptionsStr ? JSON.parse(pollOptionsStr) : undefined,
          pollVotes: pollVotesStr ? JSON.parse(pollVotesStr) : undefined,
        },
      },
    });

    return NextResponse.json({
      success: true,
      post: {
        ...inserted[0],
        commentsList: [],
        reactionsList: [],
        reactionsBreakdown: {},
        reactedUserIds: [],
      },
      reward: rewardResult,
    });
  } catch (error: any) {
    console.error("Create post error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
