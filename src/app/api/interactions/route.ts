import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comments, reactions, shares, posts, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";
import { createNotification } from "@/lib/notify";
import { publish } from "@/lib/realtime";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, postId, userId, content, reactionType, platform } = body;

    if (!action || !postId || !userId) {
      return NextResponse.json({ success: false, error: "Missing required interaction parameters." }, { status: 400 });
    }

    const numericUserId = Number(userId);
    const numericPostId = Number(postId);

    // Verify user and post exist
    const userRes = await db.select().from(users).where(eq(users.id, numericUserId)).limit(1);
    const postRes = await db.select().from(posts).where(eq(posts.id, numericPostId)).limit(1);
    
    if (userRes.length === 0 || postRes.length === 0) {
      return NextResponse.json({ success: false, error: "User or Post not found." }, { status: 404 });
    }

    const activeUser = userRes[0];
    const targetPost = postRes[0];

    if (action === "comment") {
      if (!content || !content.trim()) {
        return NextResponse.json({ success: false, error: "Comment content cannot be empty." }, { status: 400 });
      }

      const insertedComment = await db.insert(comments).values({
        postId: numericPostId,
        userId: numericUserId,
        authorName: activeUser.name,
        authorUsername: activeUser.username,
        authorAvatar: activeUser.avatarUrl,
        content: content.trim(),
      }).returning();

      // Increment comments count
      await db.update(posts).set({
        commentsCount: sql`${posts.commentsCount} + 1`,
      }).where(eq(posts.id, numericPostId));

      const reward = await awardPoints({
        userId: numericUserId,
        actionType: "comment_created",
        title: "Wrote Insightful Comment",
        description: `Commented on "${targetPost.title.slice(0, 35)}..."`,
        metadata: `commentId:${insertedComment[0].id}`,
      });

      // Real-time: notify the post author + broadcast the new comment
      await createNotification({
        userId: targetPost.userId,
        type: "comment",
        title: "New comment on your post",
        message: `${activeUser.name} commented: "${content.trim().slice(0, 60)}"`,
        actorId: activeUser.id,
        actorName: activeUser.name,
        actorAvatar: activeUser.avatarUrl,
        entityId: numericPostId,
        iconEmoji: "💬",
      });
      publish({
        type: "chat_message",
        payload: { scope: "post_comment", postId: numericPostId, comment: insertedComment[0] },
      });

      return NextResponse.json({ success: true, comment: insertedComment[0], reward });
    } 

    if (action === "react") {
      const chosenReaction = reactionType || "like";

      // Check if user already reacted to this post with this exact reaction
      const existing = await db.select().from(reactions).where(
        and(eq(reactions.postId, numericPostId), eq(reactions.userId, numericUserId))
      ).limit(1);

      if (existing.length > 0) {
        // Update reaction type if changed, but do not spam duplicate points
        await db.update(reactions).set({ reactionType: chosenReaction }).where(eq(reactions.id, existing[0].id));
        return NextResponse.json({ 
          success: true, 
          message: "Reaction updated!", 
          reward: null 
        });
      }

      const insertedReaction = await db.insert(reactions).values({
        postId: numericPostId,
        userId: numericUserId,
        reactionType: chosenReaction,
      }).returning();

      // Increment reaction count
      await db.update(posts).set({
        reactionsCount: sql`${posts.reactionsCount} + 1`,
      }).where(eq(posts.id, numericPostId));

      const reward = await awardPoints({
        userId: numericUserId,
        actionType: "reaction_given",
        title: "Reacted to Post",
        description: `Gave a '${chosenReaction}' reaction to "${targetPost.title.slice(0, 30)}..."`,
        metadata: `reactionId:${insertedReaction[0].id}`,
      });

      // Real-time: notify the post author of the new reaction
      const reactionEmoji: Record<string, string> = {
        like: "👍", love: "❤️", celebrate: "🎉", fire: "🔥", mindblown: "🤯",
      };
      await createNotification({
        userId: targetPost.userId,
        type: "reaction",
        title: "Someone reacted to your post",
        message: `${activeUser.name} reacted ${reactionEmoji[chosenReaction] || "👍"} to "${targetPost.title.slice(0, 40)}"`,
        actorId: activeUser.id,
        actorName: activeUser.name,
        actorAvatar: activeUser.avatarUrl,
        entityId: numericPostId,
        iconEmoji: reactionEmoji[chosenReaction] || "👍",
      });
      publish({
        type: "poll_update",
        payload: { scope: "reaction", postId: numericPostId },
      });

      return NextResponse.json({ success: true, reaction: insertedReaction[0], reward });
    }

    if (action === "share") {
      const sharePlatform = platform || "copy_link";

      const insertedShare = await db.insert(shares).values({
        postId: numericPostId,
        userId: numericUserId,
        platform: sharePlatform,
        shareToken: `vibe-${numericPostId}-${Date.now().toString(36)}`,
      }).returning();

      // Increment share count
      await db.update(posts).set({
        sharesCount: sql`${posts.sharesCount} + 1`,
      }).where(eq(posts.id, numericPostId));

      const reward = await awardPoints({
        userId: numericUserId,
        actionType: "post_shared",
        title: "Shared Community Post",
        description: `Shared post via ${sharePlatform.replace("_", " ")} to external network`,
        metadata: `shareId:${insertedShare[0].id}`,
      });

      return NextResponse.json({ success: true, share: insertedShare[0], reward });
    }

    if (action === "vote_poll") {
      const { option } = body;
      if (!option) {
        return NextResponse.json({ success: false, error: "Poll option is required." }, { status: 400 });
      }

      let currentVotes: Record<string, number> = {};
      try {
        if (targetPost.pollVotes) {
          currentVotes = JSON.parse(targetPost.pollVotes);
        }
      } catch (e) {}

      currentVotes[option] = (currentVotes[option] || 0) + 1;

      await db
        .update(posts)
        .set({
          pollVotes: JSON.stringify(currentVotes),
        })
        .where(eq(posts.id, numericPostId));

      const reward = await awardPoints({
        userId: numericUserId,
        actionType: "reaction_given", // maps to daily reaction/engagement quest
        title: "Voted on Community Poll",
        description: `Voted for '${option}' on "${targetPost.title.slice(0, 30)}..."`,
        customPoints: 20,
      });

      // Real-time: broadcast live poll results to all connected clients
      publish({
        type: "poll_update",
        payload: { scope: "poll_vote", postId: numericPostId, pollVotes: currentVotes },
      });

      return NextResponse.json({
        success: true,
        pollVotes: currentVotes,
        reward,
        message: `Voted for "${option}"! Awarded +20 points!`,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid interaction action." }, { status: 400 });
  } catch (error: any) {
    console.error("Interaction error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
