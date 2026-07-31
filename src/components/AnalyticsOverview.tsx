"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Users, 
  Zap, 
  FileText, 
  MessageSquare, 
  Heart, 
  Share2, 
  UserPlus, 
  Gift, 
  RefreshCw,
  TrendingUp,
  PieChart
} from "lucide-react";

export default function AnalyticsOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold animate-pulse text-lg">
        Calculating system statistics and loyalty insights...
      </div>
    );
  }

  const breakdown = stats.activityBreakdown || [];
  const maxPointsInGroup = Math.max(...breakdown.map((b: any) => b.pointsGenerated), 1);

  const typeNames: Record<string, { label: string; icon: string; color: string }> = {
    referral_successful: { label: "Peer Referrals (+200)", icon: "🎁", color: "from-amber-500 to-rose-500" },
    post_created: { label: "Published Posts (+50)", icon: "📄", color: "from-blue-500 to-indigo-500" },
    comment_created: { label: "Comments (+25)", icon: "💬", color: "from-indigo-500 to-purple-500" },
    reaction_given: { label: "Reactions (+10)", icon: "❤️", color: "from-rose-500 to-pink-500" },
    post_shared: { label: "Social Shares (+30)", icon: "🚀", color: "from-emerald-500 to-teal-500" },
    daily_login: { label: "Daily Streaks (+15)", icon: "🔥", color: "from-orange-500 to-amber-500" },
    reward_redeemed: { label: "Store Redemptions", icon: "🛍️", color: "from-purple-500 to-violet-500" },
  };

  return (
    <div className="space-y-8">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-indigo-400 uppercase tracking-wider mb-2">
            <TrendingUp className="w-4 h-4" /> Comprehensive Ecosystem Metrics
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Platform Activity Analytics
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-medium leading-relaxed max-w-2xl">
            Live summary of total loyalty points distributed, social shares, friend referrals converted, and engagement metrics generated across all community personas.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 flex-shrink-0"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Stats
        </button>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Points Held</span>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-6 h-6 fill-current" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-black text-amber-400">{stats.totalPoints.toLocaleString()} Pts</div>
          <div className="mt-2 text-xs font-medium text-slate-400">Distributed across all member accounts</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Members</span>
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-black text-white">{stats.totalUsers}</div>
          <div className="mt-2 text-xs font-medium text-slate-400">Registered community contributors</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Verified Referrals</span>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <UserPlus className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-black text-emerald-400">{stats.totalReferrals}</div>
          <div className="mt-2 text-xs font-medium text-slate-400">Successful friend invitations converted</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Store Redemptions</span>
            <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Gift className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-black text-white">{stats.totalRewardsRedeemed}</div>
          <div className="mt-2 text-xs font-medium text-slate-400">Perks & merch fulfilled from vault</div>
        </div>
      </div>

      {/* Second row of metrics (Posts, Comments, Reactions, Shares) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 text-center shadow-md">
          <FileText className="w-6 h-6 text-blue-400 mx-auto mb-1.5" />
          <div className="text-2xl font-black text-white">{stats.totalPosts}</div>
          <div className="text-xs text-slate-400 font-bold uppercase mt-0.5">Posts Created</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 text-center shadow-md">
          <MessageSquare className="w-6 h-6 text-indigo-400 mx-auto mb-1.5" />
          <div className="text-2xl font-black text-white">{stats.totalComments}</div>
          <div className="text-xs text-slate-400 font-bold uppercase mt-0.5">Comments Written</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 text-center shadow-md">
          <Heart className="w-6 h-6 text-rose-400 mx-auto mb-1.5" />
          <div className="text-2xl font-black text-white">{stats.totalReactions}</div>
          <div className="text-xs text-slate-400 font-bold uppercase mt-0.5">Reactions Given</div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 text-center shadow-md">
          <Share2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
          <div className="text-2xl font-black text-white">{stats.totalShares}</div>
          <div className="text-xs text-slate-400 font-bold uppercase mt-0.5">Social Shares</div>
        </div>
      </div>

      {/* Visual Activity & Points Distribution Breakdown */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-400" />
              <span>Points Generation Breakdown By Activity</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Which community actions produce the highest loyalty value</p>
          </div>
        </div>

        <div className="space-y-6">
          {breakdown.map((item: any, idx: number) => {
            const info = typeNames[item.activityType] || {
              label: item.activityType.replace(/_/g, " "),
              icon: "📌",
              color: "from-slate-500 to-slate-700",
            };
            const pts = Number(item.pointsGenerated ?? 0);
            const count = Number(item.count ?? 0);
            const percentOfMax = Math.min(100, Math.max(8, Math.floor((Math.abs(pts) / maxPointsInGroup) * 100)));

            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 font-black text-white">
                    <span className="text-lg">{info.icon}</span>
                    <span>{info.label}</span>
                    <span className="text-xs font-semibold text-slate-400">({count} total events)</span>
                  </div>
                  <div className="font-extrabold text-amber-400 flex items-center gap-1">
                    <span>{pts > 0 ? `+${pts.toLocaleString()}` : pts.toLocaleString()} Pts</span>
                  </div>
                </div>

                <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner">
                  <div
                    className={`h-full bg-gradient-to-r ${info.color} rounded-full transition-all duration-700 shadow-sm`}
                    style={{ width: `${percentOfMax}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
