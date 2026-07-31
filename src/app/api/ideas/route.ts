import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ideaVotes, ideas } from "@/db/schema";
import { awardPoints } from "@/lib/gamification";
import { getSessionUser, forbidden, requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notify";
import { publish } from "@/lib/realtime";
import { hitRateLimit, rateLimitResponse } from "@/lib/ratelimit";

const IDEA_CATEGORIES = ["Product", "Experience", "Community", "Onboarding", "Rewards", "Integrations", "Other"] as const;
const IDEA_STATUSES = ["open", "planned", "in_progress", "shipped", "declined"] as const;
const IDEA_IMPACTS = ["low", "medium", "high"] as const;

type IdeaCategory = (typeof IDEA_CATEGORIES)[number];
type IdeaStatus = (typeof IDEA_STATUSES)[number];
type IdeaImpact = (typeof IDEA_IMPACTS)[number];

function isIdeaCategory(value: unknown): value is IdeaCategory {
  return typeof value === "string" && IDEA_CATEGORIES.includes(value as IdeaCategory);
}

function isIdeaStatus(value: unknown): value is IdeaStatus {
  return typeof value === "string" && IDEA_STATUSES.includes(value as IdeaStatus);
}

function isIdeaImpact(value: unknown): value is IdeaImpact {
  return typeof value === "string" && IDEA_IMPACTS.includes(value as IdeaImpact);
}

function asIdeaId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Read the product-feedback backlog. The viewer's vote is derived from the
 * session, never from a user id supplied in the URL.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const categoryParam = params.get("category");
    const statusParam = params.get("status");
    const search = params.get("q")?.trim().slice(0, 80) || "";
    const sort = params.get("sort") === "recent" ? "recent" : "popular";

    const filters: SQL[] = [];
    if (isIdeaCategory(categoryParam)) filters.push(eq(ideas.category, categoryParam));
    if (isIdeaStatus(statusParam)) filters.push(eq(ideas.status, statusParam));
    if (search) {
      filters.push(
        or(
          ilike(ideas.title, `%${search}%`),
          ilike(ideas.description, `%${search}%`),
          ilike(ideas.authorName, `%${search}%`)
        )!
      );
    }

    const whereClause = filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters);
    const orderBy = sort === "recent" ? [desc(ideas.createdAt)] : [desc(ideas.voteCount), desc(ideas.updatedAt)];
    const rows = whereClause
      ? await db.select().from(ideas).where(whereClause).orderBy(...orderBy).limit(100)
      : await db.select().from(ideas).orderBy(...orderBy).limit(100);

    const sessionUser = await getSessionUser(request);
    let votedIdeaIds = new Set<number>();
    if (sessionUser && rows.length > 0) {
      const votes = await db
        .select({ ideaId: ideaVotes.ideaId })
        .from(ideaVotes)
        .where(and(eq(ideaVotes.userId, sessionUser.id), inArray(ideaVotes.ideaId, rows.map((idea) => idea.id))));
      votedIdeaIds = new Set(votes.map((vote) => vote.ideaId));
    }

    return NextResponse.json({
      success: true,
      ideas: rows.map((idea) => ({ ...idea, hasVoted: votedIdeaIds.has(idea.id) })),
      total: rows.length,
      filters: { categories: IDEA_CATEGORIES, statuses: IDEA_STATUSES },
    });
  } catch (error: any) {
    console.error("Ideas GET error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

/** Create a member-authored feedback item. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const limit = hitRateLimit(`ideas:create:${auth.id}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = isIdeaCategory(body.category) ? body.category : "Product";
    const impact = isIdeaImpact(body.impact) ? body.impact : "medium";

    if (title.length < 8 || title.length > 140) {
      return NextResponse.json(
        { success: false, error: "Use a clear title between 8 and 140 characters." },
        { status: 400 }
      );
    }
    if (description.length < 20 || description.length > 2400) {
      return NextResponse.json(
        { success: false, error: "Describe the problem or outcome in 20 to 2,400 characters." },
        { status: 400 }
      );
    }

    const inserted = await db
      .insert(ideas)
      .values({
        authorId: auth.id,
        authorName: auth.name,
        authorUsername: auth.username,
        authorAvatar: auth.avatarUrl,
        title,
        description,
        category,
        impact,
        status: "open",
      })
      .returning();

    const reward = await awardPoints({
      userId: auth.id,
      actionType: "idea_submitted",
      title: "Submitted Product Idea",
      description: `Proposed: "${title.slice(0, 70)}${title.length > 70 ? "…" : ""}"`,
      metadata: `ideaId:${inserted[0].id}`,
    });

    const idea = { ...inserted[0], hasVoted: false };
    publish({ type: "idea_update", payload: { action: "created", idea } });

    return NextResponse.json({ success: true, idea, reward });
  } catch (error: any) {
    console.error("Ideas POST error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

/** Toggle a member vote, or let an admin advance an idea through the roadmap. */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const action = body.action;
    const ideaId = asIdeaId(body.ideaId);
    if (!ideaId) {
      return NextResponse.json({ success: false, error: "A valid idea ID is required." }, { status: 400 });
    }

    const targetRows = await db.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1);
    if (targetRows.length === 0) {
      return NextResponse.json({ success: false, error: "Idea not found." }, { status: 404 });
    }
    const target = targetRows[0];

    if (action === "toggle_vote") {
      const limit = hitRateLimit(`ideas:vote:${auth.id}`, 60, 60 * 1000);
      if (!limit.allowed) return rateLimitResponse(limit);

      // The unique DB index makes the first half race-safe. When the insert
      // conflicts, the existing vote is removed, giving members a true toggle.
      const insertedVote = await db
        .insert(ideaVotes)
        .values({ ideaId, userId: auth.id })
        .onConflictDoNothing()
        .returning();

      if (insertedVote.length > 0) {
        const updated = await db
          .update(ideas)
          .set({ voteCount: sql`${ideas.voteCount} + 1`, updatedAt: new Date() })
          .where(eq(ideas.id, ideaId))
          .returning();
        const idea = updated[0];
        publish({ type: "idea_update", payload: { action: "voted", ideaId, voteCount: idea.voteCount } });
        return NextResponse.json({ success: true, hasVoted: true, voteCount: idea.voteCount, message: "Vote added." });
      }

      const removedVote = await db
        .delete(ideaVotes)
        .where(and(eq(ideaVotes.ideaId, ideaId), eq(ideaVotes.userId, auth.id)))
        .returning();

      // A duplicate request may arrive after a previous toggle completed. In
      // that case there is simply no vote left to remove and no counter change.
      if (removedVote.length === 0) {
        return NextResponse.json({ success: true, hasVoted: false, voteCount: target.voteCount, message: "Vote already removed." });
      }

      const updated = await db
        .update(ideas)
        .set({ voteCount: sql`greatest(${ideas.voteCount} - 1, 0)`, updatedAt: new Date() })
        .where(eq(ideas.id, ideaId))
        .returning();
      const idea = updated[0];
      publish({ type: "idea_update", payload: { action: "unvoted", ideaId, voteCount: idea.voteCount } });
      return NextResponse.json({ success: true, hasVoted: false, voteCount: idea.voteCount, message: "Vote removed." });
    }

    if (action === "update_status") {
      if (auth.role !== "admin") return forbidden("Only an administrator can update roadmap status.");
      if (!isIdeaStatus(body.status)) {
        return NextResponse.json({ success: false, error: "Invalid roadmap status." }, { status: 400 });
      }

      const updated = await db
        .update(ideas)
        .set({ status: body.status, updatedAt: new Date() })
        .where(eq(ideas.id, ideaId))
        .returning();
      const idea = updated[0];

      if (target.authorId !== auth.id) {
        await createNotification({
          userId: target.authorId,
          type: "idea",
          title: "Your idea moved on the roadmap",
          message: `“${idea.title.slice(0, 70)}” is now ${String(idea.status).replace(/_/g, " ")}.`,
          actorId: auth.id,
          actorName: auth.name,
          actorAvatar: auth.avatarUrl,
          entityId: idea.id,
          iconEmoji: "💡",
        });
      }

      publish({ type: "idea_update", payload: { action: "status_changed", idea } });
      return NextResponse.json({ success: true, idea, message: "Roadmap status updated." });
    }

    return NextResponse.json({ success: false, error: "Unknown idea action." }, { status: 400 });
  } catch (error: any) {
    console.error("Ideas PATCH error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
