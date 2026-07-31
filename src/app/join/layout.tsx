import type { Metadata } from "next";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTierForPoints } from "@/lib/gamification";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParams;
}): Promise<Metadata> {
  let refCode = "VIBE_2026";
  try {
    const sp = searchParams ? await searchParams : undefined;
    const raw = sp?.ref;
    if (typeof raw === "string" && raw.trim()) refCode = raw.trim();
  } catch {
    /* fall back to default */
  }

  let title = "Join VibePulse — Earn Points For Every Interaction";
  let description =
    "Earn loyalty points for posts, reactions, comments, shares, group chats, daily quests and referrals. Claim your +200 point sign-up bonus!";
  let imageUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=vibepulse`;

  try {
    const found = await db.select().from(users).where(eq(users.referralCode, refCode)).limit(1);
    if (found.length > 0) {
      const referrer = found[0];
      const tier = getTierForPoints(referrer.totalPoints);
      title = `${referrer.name} (@${referrer.username}) invited you to VibePulse!`;
      description = `${tier.icon} ${tier.levelName} • ${referrer.totalPoints.toLocaleString()} loyalty points earned. Join with code ${refCode} and claim your +200 point welcome bonus!`;
      imageUrl =
        referrer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${referrer.username}`;
    }
  } catch (err) {
    console.error("generateMetadata referral lookup failed:", err);
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "VibePulse",
      images: [{ url: imageUrl, width: 400, height: 400, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
