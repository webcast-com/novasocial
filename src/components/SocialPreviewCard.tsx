"use client";

import React, { useState } from "react";
import { Zap, ExternalLink, Shield, Trophy, Award, Sparkles } from "lucide-react";

interface Props {
  referrerName: string;
  referrerUsername: string;
  referrerAvatar: string | null;
  totalPoints: number;
  tierLevel: string;
  tierIcon?: string;
  referralCode: string;
}

export default function SocialPreviewCard({
  referrerName,
  referrerUsername,
  referrerAvatar,
  totalPoints,
  tierLevel,
  tierIcon = "👑",
  referralCode,
}: Props) {
  const [platform, setPlatform] = useState<"facebook" | "x" | "whatsapp" | "telegram">("whatsapp");

  const avatar = referrerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${referrerUsername}`;
  const shareUrl = typeof window !== "undefined" ? `${window.location.host}/join?ref=${referralCode}` : `vibepulse.io/join?ref=${referralCode}`;

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Dynamic OpenGraph Rich Link Card Preview</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(["whatsapp", "facebook", "x", "telegram"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                platform === p
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {p === "x" ? "X (Twitter)" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Simulated Social App Bubble / Card Container */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          platform === "whatsapp"
            ? "bg-[#0B141A] border-[#1f2c34] text-white"
            : platform === "facebook"
            ? "bg-[#242526] border-[#3E4042] text-white"
            : platform === "x"
            ? "bg-[#16181C] border-[#2F3336] text-white"
            : "bg-[#17212B] border-[#2B5278] text-white"
        }`}
      >
        {/* Top bar / domain tag */}
        <div className="px-4 py-2 bg-black/30 border-b border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono tracking-tight text-slate-300">{shareUrl}</span>
          <span className="uppercase text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white/10">
            {platform.toUpperCase()} PREVIEW
          </span>
        </div>

        {/* Dynamic OG Card Visual Banner */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border-b border-white/10 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="relative">
              <img
                src={avatar}
                alt={referrerName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-indigo-500/50 shadow-2xl"
              />
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 px-2 py-0.5 rounded-full text-xs font-black shadow-lg">
                +200 Pts
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                  {tierIcon} {tierLevel}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                  Verified Referrer
                </span>
              </div>

              <h4 className="mt-2 text-lg sm:text-xl font-black text-white leading-snug">
                {referrerName} invites you to join VibePulse!
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 line-clamp-2">
                Earn instant activity points for posting, commenting, DMs & daily streaks. Claim your +200 affiliate sign-up bonus now!
              </p>

              <div className="mt-3 flex items-center justify-center sm:justify-start gap-3 text-xs font-black text-amber-400">
                <span className="inline-flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full border border-amber-500/30">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{totalPoints.toLocaleString()} Total Points</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Code: {referralCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom preview footer bar */}
        <div className="px-4 py-3 bg-black/20 flex items-center justify-between text-xs">
          <div className="min-w-0">
            <div className="font-extrabold text-white truncate">VibePulse — Activity & Gamified Loyalty Engine</div>
            <div className="text-[11px] text-slate-400 truncate">vibepulse.io • Interactive Community Rewards</div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex-shrink-0 shadow">
            Accept Invite
          </span>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 text-center">
        💡 <strong>Click-Through Boost:</strong> Rich preview cards showing real user avatars and points increase social click-through rates by up to 3.4x!
      </p>
    </div>
  );
}
