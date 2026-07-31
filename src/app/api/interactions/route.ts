import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comments, reactions, shares, posts, pollVotes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";
import { createNotification } from "@/lib/notify";
import { publish } from "@/lib/realtime";
import { requireUser } from "@/lib/auth";
import { hitRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    // The acting user ALWAYS comes from the verified session — never from the
    // request body, where it could be spoofed.
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
    const activeUser = auth;

    const limit = hitRateLimit(`interactions:${activeUser.id}`, 90, 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = await request.json();
    const { action, postId, content, reactionType, platform } = body;

    if (!action || !postId) {
      return NextResponse.json({ success: false, error: "Missing required interaction parameters." }, { status: 400 });
    }

    const numericUserId = activeUser.id;
    const numericPostId = Number(postId);

    // Verify the target post exists
    const postRes = await db.select().from(posts).where(eq(posts.id, numericPostId)).limit(1);
    if (postRes.length === 0) {
      return NextResponse.json({ success: false, error: "Post not found." }, { status: 404 });
    }

    const targetPost = postRes[0];
    const isOwnPost = targetPost.userId === activeUser.id;

    if (action === "comment") {
      if (!content || !content.trim()) {
        return NextResponse.json({ success: false, error: "Comment content cannot be empty." }, { status: 400 });
      }
      if (content.trim().length > 1000) {
        return NextResponse.json({ success: false, error: "Comment is too long (max 1000 characters)." }, { status: 400 });
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
      const allowedReactions = ["like", "love", "celebrate", "fire", "mindblown"];
      if (!allowedReactions.includes(chosenReaction)) {
        return NextResponse.json({ success: false, error: "Invalid reaction type." }, { status: 400 });
      }

      // Check if user already reacted to this post
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

      let insertedReaction;
      try {
        insertedReaction = await db.insert(reactions).values({
          postId: numericPostId,
          userId: numericUserId,
          reactionType: chosenReaction,
        }).returning();
      } catch (err: any) {
        // Unique constraint (postId, userId): a concurrent request already
        // recorded this reaction — treat it as an update, award nothing.
        if (String(err?.message || err).includes("reactions_post_user_unique")) {
          await db
            .update(reactions)
            .set({ reactionType: chosenReaction })
            .where(and(eq(reactions.postId, numericPostId), eq(reactions.userId, numericUserId)));
          return NextResponse.json({ success: true, message: "Reaction updated!", reward: null });
        }
        throw err;
      }

      // Increment reaction count
      await db.update(posts).set({
        reactionsCount: sql`${posts.reactionsCount} + 1`,
      }).where(eq(posts.id, numericPostId));

      // Self-reactions never earn points — appreciation must come from others.
      const reward = isOwnPost
        ? null
        : await awardPoints({
            userId: numericUserId,
            actionType: "reaction_given",
            title: "Reacted to Post",
            description: `Gave a '${chosenReaction}' reaction to "${targetPost.title.slice(0, 30)}..."`,
            metadata: `reactionId:${insertedReaction[0].id}`,
          });

      // Real-time: notify the post author of the new reaction (never yourself)
      const reactionEmoji: Record<string, string> = {
        like: "👍", love: "❤️", celebrate: "🎉", fire: "🔥", mindblown: "🤯",
      };
      if (!isOwnPost) {
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
      }
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
      if (!option || typeof option !== "string") {
        return NextResponse.json({ success: false, error: "Poll option is required." }, { status: 400 });
      }

      let currentVotes: Record<string, number> = {};
      let options: string[] = [];
      try {
        if (targetPost.pollVotes) {
          currentVotes = JSON.parse(targetPost.pollVotes);
        }
        if (targetPost.pollOptions) {
          options = JSON.parse(targetPost.pollOptions);
        }
      } catch (e) {}

      if (options.length === 0) {
        return NextResponse.json({ success: false, error: "This post does not have an active poll." }, { status: 400 });
      }
      if (!options.includes(option)) {
        return NextResponse.json({ success: false, error: "Invalid poll option." }, { status: 400 });
      }

      // One vote per user per poll — enforced by the poll_votes table (unique
      // on postId+userId). Changing your vote is allowed, but only the FIRST
      // vote earns points.
      const existingVote = await db
        .select()
        .from(pollVotes)
        .where(and(eq(pollVotes.postId, numericPostId), eq(pollVotes.userId, numericUserId)))
        .limit(1);

      if (existingVote.length > 0) {
        const previous = existingVote[0];
        if (previous.option === option) {
          return NextResponse.json({
            success: false,
            error: `You already voted for "${option}" on this poll.`,
            pollVotes: currentVotes,
          }, { status: 400 });
        }

        // Change vote: move the tally, award no extra points.
        await db.update(pollVotes).set({ option }).where(eq(pollVotes.id, previous.id));
        currentVotes[previous.option] = Math.max(0, (currentVotes[previous.option] || 0) - 1);
        currentVotes[option] = (currentVotes[option] || 0) + 1;
        await db.update(posts).set({ pollVotes: JSON.stringify(currentVotes) }).where(eq(posts.id, numericPostId));

        publish({
          type: "poll_update",
          payload: { scope: "poll_vote", postId: numericPostId, pollVotes: currentVotes },
        });

        return NextResponse.json({
          success: true,
          pollVotes: currentVotes,
          reward: null,
          message: `Vote changed to "${option}".`,
        });
      }

      try {
        await db.insert(pollVotes).values({
          postId: numericPostId,
          userId: numericUserId,
          option,
        });
      } catch (err: any) {
        if (String(err?.message || err).includes("poll_votes_post_user_unique")) {
          return NextResponse.json({
            success: false,
            error: "You have already voted on this poll.",
            pollVotes: currentVotes,
          }, { status: 400 });
        }
        throw err;
      }

      currentVotes[option] = (currentVotes[option] || 0) + 1;

      await db
        .update(posts)
        .set({
          pollVotes: JSON.stringify(currentVotes),
        })
        .where(eq(posts.id, numericPostId));

      const reward = await awardPoints({
        userId: numericUserId,
        actionType: "reaction_given", // maps to daily reaction/engagement quest + daily cap
        title: "Voted on Community Poll",
        description: `Voted for '${option}' on "${targetPost.title.slice(0, 30)}..."`,
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
        message: `Voted for "${option}"! Awarded +${reward.pointsAwarded} points!`,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid interaction action." }, { status: 400 });
  } catch (error: any) {
    console.error("Interaction error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
