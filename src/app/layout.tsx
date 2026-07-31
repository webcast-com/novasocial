import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#4f46e5",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  applicationName: "VibePulse",
  title: {
    default: "VibePulse — Gamified Activity & Loyalty Engine",
    template: "%s | VibePulse",
  },
  description:
    "Earn loyalty points for community posts, reactions, comments, shares, group chats, daily quests, and referrals. Join the interactive leaderboard and claim your rewards.",
  keywords: [
    "gamification",
    "loyalty points",
    "community engagement",
    "referral engine",
    "activity tracking",
    "social rewards",
    "creator reels",
    "private messages",
    "live video broadcast",
    "audio rooms",
    "community moderation",
    "next.js",
    "postgresql",
    "vibe pulse",
  ],
  authors: [{ name: "VibePulse Team", url: "https://vibepulse.io" }],
  creator: "VibePulse",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://vibepulse.io",
    siteName: "VibePulse",
    title: "VibePulse — Activity & Gamified Loyalty Tracker",
    description:
      "Earn real-time points for posts, reactions, comments, shares, group chats, quests, streaks, and referrals. Join the interactive community leaderboard!",
    images: [
      {
        url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&auto=format&fit=crop&q=80",
        width: 1200,
        height: 630,
        alt: "VibePulse — Gamified Community & Loyalty Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VibePulse — Gamified Activity & Loyalty Tracker",
    description:
      "Earn points for every post, reaction, comment, share, chat message, quest, and referral. Level up to Grandmaster!",
    images: [
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&auto=format&fit=crop&q=80",
    ],
    creator: "@vibepulse",
  },
  metadataBase: new URL("https://vibepulse.io"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#4f46e5" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no, email=no, address=no" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
