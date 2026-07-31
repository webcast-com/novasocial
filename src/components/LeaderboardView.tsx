"use client";

import React from "react";
import { User } from "@/types";
import { motion } from "framer-motion";
import { Trophy, Award, Zap, Star, Shield, ChevronRight, Crown, Sparkles } from "lucide-react";

interface Props {
  users: User[];
  currentUser: User | null;
  onSelectUser: (user: User) => void;
}

const TIER_LIST = [
  { rankNum: 1, name: "Novice", min: 0, max: 249, icon: "🌱", desc: "Just starting out. Exploring feed & posting introductory thoughts.", color: "border-slate-600 text-slate-300 bg-slate-800" },
  { rankNum: 2, name: "Contributor", min: 250, max: 699, icon: "🚀", desc: "Active participant generating meaningful forum replies and social shares.", color: "border-blue-500 text-blue-300 bg-blue-950/80" },
  { rankNum: 3, name: "Rising Star", min: 700, max: 1499, icon: "⭐", desc: "Consistent community catalyst bringing in high-value conversations.", color: "border-purple-500 text-purple-300 bg-purple-950/80" },
  { rankNum: 4, name: "Community Champion", min: 1500, max: 2999, icon: "🏆", desc: "Recognized leader & frequent referrer with deep loyalty engagement.", color: "border-amber-500 text-amber-300 bg-amber-950/80" },
  { rankNum: 5, name: "Pulse Grandmaster", min: 3000, max: 99999, icon: "👑", desc: "The elite apex of community contribution! Unlocks founder mentoring & VIP status.", color: "border-rose-500 text-rose-300 bg-gradient-to-r from-indigo-950 via-purple-950 to-rose-950" },
];

export default function LeaderboardView({ users, currentUser, onSelectUser }: Props) {
  // Sort users descending by totalPoints
  const sortedUsers = [...users].sort((a, b) => b.totalPoints - a.totalPoints);
  const topThree = sortedUsers.slice(0, 3);
  const remainingUsers = sortedUsers.slice(3);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-8">
      {/* Header Banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-strong rounded-[28px] p-6 sm:p-8 shadow-xl text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-xs font-black shadow mb-3 uppercase tracking-wider">
            <Trophy className="w-4 h-4" /> Global Community Standings
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Leaderboard & Tier Progression
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-medium leading-relaxed">
            See where you rank among all active VibePulse members. Earn points by creating posts, replying, sharing, and inviting peers to conquer the Grandmaster rank!
          </p>
        </div>
        
        {currentUser && (
          <div className="bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 text-center min-w-[200px] flex-shrink-0 shadow-lg relative z-10">
            <div className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Your Current Standing</div>
            <div className="text-3xl font-black text-amber-400 mt-1">
              #{sortedUsers.findIndex((u) => u.id === currentUser.id) + 1} of {sortedUsers.length}
            </div>
            <div className="mt-1.5 flex items-center justify-center gap-1 text-xs font-bold text-white">
              <span>{currentUser.tierInfo.icon}</span>
              <span>{currentUser.tierInfo.levelName}</span>
              <span className="text-slate-400">({currentUser.totalPoints} pts)</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Top 3 Podium Cards */}
      {topThree.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Rank #2 */}
          <div
            onClick={() => onSelectUser(topThree[1])}
            className="md:order-1 bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 shadow-xl relative text-center hover:border-slate-500 transition-all cursor-pointer transform md:translate-y-4 group"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg border-2 border-slate-200">
              2nd
            </div>
            <div className="mt-3 relative w-20 h-20 mx-auto">
              <img
                src={topThree[1].avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topThree[1].username}`}
                alt={topThree[1].name}
                className="w-20 h-20 rounded-full object-cover border-4 border-slate-400 shadow-md mx-auto group-hover:scale-105 transition-transform"
              />
            </div>
            <h3 className="mt-3.5 font-black text-lg text-white truncate">{topThree[1].name}</h3>
            <p className="text-xs text-slate-400 font-semibold">@{topThree[1].username}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-extrabold border border-slate-700">
              <span>{topThree[1].tierInfo.icon}</span>
              <span>{topThree[1].tierInfo.levelName}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-1.5 font-extrabold text-amber-400 text-lg">
              <Zap className="w-5 h-5 fill-current" />
              <span>{topThree[1].totalPoints.toLocaleString()}</span>
              <span className="text-xs font-semibold text-slate-400 uppercase">Pts</span>
            </div>
          </div>

          {/* Rank #1 (Center & Taller) */}
          <div
            onClick={() => onSelectUser(topThree[0])}
            className="md:order-2 bg-gradient-to-b from-amber-950/70 via-slate-900 to-slate-900 border-2 border-amber-400/80 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/20 relative text-center hover:scale-105 transition-all cursor-pointer group"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 text-slate-950 font-black text-xl flex items-center justify-center shadow-xl border-2 border-white animate-bounce-slow">
              👑 1st
            </div>
            <div className="mt-4 relative w-24 h-24 mx-auto">
              <img
                src={topThree[0].avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topThree[0].username}`}
                alt={topThree[0].name}
                className="w-24 h-24 rounded-full object-cover border-4 border-amber-400 shadow-xl mx-auto group-hover:scale-105 transition-transform"
              />
            </div>
            <h3 className="mt-4 font-black text-xl text-amber-300 truncate flex items-center justify-center gap-1.5">
              <span>{topThree[0].name}</span>
              <Sparkles className="w-4 h-4 text-amber-400 fill-current" />
            </h3>
            <p className="text-xs text-slate-300 font-medium">@{topThree[0].username}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/40 shadow-inner">
              <span>{topThree[0].tierInfo.icon}</span>
              <span>{topThree[0].tierInfo.levelName}</span>
            </div>
            <div className="mt-5 pt-3.5 border-t border-amber-500/30 flex items-center justify-center gap-1.5 font-black text-amber-400 text-2xl">
              <Zap className="w-6 h-6 fill-current text-amber-400 animate-pulse" />
              <span>{topThree[0].totalPoints.toLocaleString()}</span>
              <span className="text-xs font-bold text-amber-300/80 uppercase">Pts</span>
            </div>
          </div>

          {/* Rank #3 */}
          <div
            onClick={() => onSelectUser(topThree[2])}
            className="md:order-3 bg-slate-900/90 border border-amber-800/60 rounded-3xl p-6 shadow-xl relative text-center hover:border-amber-700 transition-all cursor-pointer transform md:translate-y-6 group"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-black text-base flex items-center justify-center shadow-lg border-2 border-amber-500">
              3rd
            </div>
            <div className="mt-3 relative w-20 h-20 mx-auto">
              <img
                src={topThree[2].avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topThree[2].username}`}
                alt={topThree[2].name}
                className="w-20 h-20 rounded-full object-cover border-4 border-amber-700 shadow-md mx-auto group-hover:scale-105 transition-transform"
              />
            </div>
            <h3 className="mt-3.5 font-black text-lg text-white truncate">{topThree[2].name}</h3>
            <p className="text-xs text-slate-400 font-semibold">@{topThree[2].username}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-amber-200 text-xs font-extrabold border border-amber-900">
              <span>{topThree[2].tierInfo.icon}</span>
              <span>{topThree[2].tierInfo.levelName}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-1.5 font-extrabold text-amber-400 text-lg">
              <Zap className="w-5 h-5 fill-current" />
              <span>{topThree[2].totalPoints.toLocaleString()}</span>
              <span className="text-xs font-semibold text-slate-400 uppercase">Pts</span>
            </div>
          </div>
        </div>
      )}

      {/* Complete Leaderboard Ranks Table */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <span>Global Community Rankings</span>
            </h3>
            <p className="text-xs text-slate-400">Click any profile row to switch active test account instantly</p>
          </div>
          <span className="text-xs text-slate-400 font-bold">{sortedUsers.length} Active Members</span>
        </div>

        <div className="space-y-3">
          {sortedUsers.map((user, idx) => {
            const isMe = currentUser?.id === user.id;
            const rank = idx + 1;
            
            // Calculate progress to next tier
            const currentPoints = user.totalPoints;
            const currentTierNum = user.tierInfo?.tierNumber || 1;
            const nextTier = TIER_LIST.find((t) => t.rankNum === currentTierNum + 1);
            let progressPercent = 100;
            let neededPts = 0;
            if (nextTier) {
              const currentTierMin = user.tierInfo?.minPoints || 0;
              const tierSpan = nextTier.min - currentTierMin;
              const pointsInTier = currentPoints - currentTierMin;
              progressPercent = Math.min(100, Math.max(5, Math.floor((pointsInTier / tierSpan) * 100)));
              neededPts = nextTier.min - currentPoints;
            }

            return (
              <div
                key={user.id}
                onClick={() => onSelectUser(user)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                  isMe
                    ? "bg-indigo-950/60 border-indigo-500/70 shadow-md shadow-indigo-600/10 text-white"
                    : "bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 text-slate-200"
                }`}
              >
                {/* Left: Rank & User Details */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 sm:w-10 text-center font-black text-base sm:text-lg text-slate-400 flex-shrink-0">
                    {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                  </div>

                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    alt={user.name}
                    className="w-11 h-11 rounded-full object-cover border border-slate-600 flex-shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-white text-sm sm:text-base truncate">{user.name}</span>
                      {isMe && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-500 text-white uppercase tracking-wider">
                          YOU
                        </span>
                      )}
                      {user.role === "admin" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white uppercase">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                      <span>@{user.username}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold flex items-center">
                        {user.tierInfo?.icon} {user.tierInfo?.levelName}
                      </span>
                      {/* Showcased badges next to the name */}
                      {(user.equippedBadges || []).slice(0, 3).map((badge) => (
                        <span
                          key={badge}
                          title={badge}
                          className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-200 border border-slate-700"
                        >
                          {badge}
                        </span>
                      ))}
                      {(user.currentStreak || 0) > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          🔥 {user.currentStreak}-Day Streak
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Progress Bar & Total Points */}
                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 mt-3 sm:mt-0 border-t sm:border-0 border-slate-800/80">
                  <div className="hidden md:block w-40">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span>Tier Progress</span>
                      <span>{nextTier ? `Need +${neededPts} pts` : "Max Rank 👑"}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-amber-400 font-black text-lg sm:text-xl flex-shrink-0">
                    <Zap className="w-5 h-5 fill-current text-amber-400" />
                    <span>{user.totalPoints.toLocaleString()}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">Pts</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gamification Level Tiers Guide */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="mb-6">
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <span>Loyalty Tier Progression & Perks Guide</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">How activity points unlock permanent status ranks across VibePulse</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {TIER_LIST.map((tier) => (
            <div key={tier.rankNum} className={`p-5 rounded-2xl border ${tier.color} flex flex-col justify-between shadow-md`}>
              <div>
                <div className="text-3xl mb-2">{tier.icon}</div>
                <div className="font-black text-base text-white">{tier.name}</div>
                <div className="mt-1 inline-block px-2.5 py-0.5 rounded text-xs font-extrabold bg-black/40 text-amber-300 border border-white/10">
                  {tier.min} {tier.max < 99999 ? `- ${tier.max} pts` : "+ pts"}
                </div>
                <p className="mt-3 text-xs opacity-90 leading-relaxed font-medium">{tier.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-bold uppercase tracking-wider text-right opacity-80">
                Tier {tier.rankNum}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
