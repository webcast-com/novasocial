"use client";

import React, { useState, useEffect } from "react";
import { User, ActivityLogItem } from "@/types";
import { 
  History, 
  Filter, 
  Zap, 
  Flame, 
  FileText, 
  MessageSquare, 
  Heart, 
  Share2, 
  UserPlus, 
  Gift, 
  Sparkles, 
  Search,
  CheckCircle2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Props {
  currentUser: User | null;
  allUsers: User[];
  onReward: (rewardData: any) => void;
  onShowToast: (msg: string, pts?: number, err?: boolean) => void;
}

export default function ActivityTimeline({ currentUser, allUsers, onReward, onShowToast }: Props) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserFilter, setSelectedUserFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [claimingCheckin, setClaimingCheckin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedUserFilter !== "all") queryParams.append("userId", selectedUserFilter);
      if (selectedTypeFilter !== "all") queryParams.append("type", selectedTypeFilter);
      queryParams.append("limit", "75");

      const res = await fetch(`/api/activity?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedUserFilter, selectedTypeFilter]);

  const handleClaimCheckin = async () => {
    if (!currentUser) {
      onShowToast("Please select an active profile in the header first", undefined, true);
      return;
    }
    setClaimingCheckin(true);
    try {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          action: "checkin",
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLogs();
        if (data.reward) {
          onReward(data.reward);
        }
      } else {
        onShowToast(data.error || "Daily check-in claim failed", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setClaimingCheckin(false);
    }
  };

  const activityTypeConfig: Record<string, { label: string; icon: React.ReactNode; badge: string }> = {
    post_created: { label: "Published Post", icon: <FileText className="w-4 h-4 text-blue-400" />, badge: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    comment_created: { label: "Discussion Reply", icon: <MessageSquare className="w-4 h-4 text-indigo-400" />, badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
    reaction_given: { label: "Given Reaction", icon: <Heart className="w-4 h-4 text-rose-400" />, badge: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
    post_shared: { label: "Shared Content", icon: <Share2 className="w-4 h-4 text-emerald-400" />, badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    referral_successful: { label: "Member Referral", icon: <UserPlus className="w-4 h-4 text-amber-400" />, badge: "bg-amber-500/20 text-amber-300 border-amber-500/30 font-black" },
    daily_login: { label: "Daily Check-In", icon: <Flame className="w-4 h-4 text-orange-400" />, badge: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
    reward_redeemed: { label: "Store Redemption", icon: <Gift className="w-4 h-4 text-purple-400" />, badge: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  };

  const typeOptions = [
    { key: "all", label: "All Activities" },
    { key: "referral_successful", label: "🎁 Referrals (+200 pts)" },
    { key: "post_created", label: "📄 Posts (+50 pts)" },
    { key: "comment_created", label: "💬 Comments (+25 pts)" },
    { key: "reaction_given", label: "❤️ Reactions (+10 pts)" },
    { key: "post_shared", label: "🚀 Shares (+30 pts)" },
    { key: "daily_login", label: "🔥 Daily Streaks (+15 pts)" },
    { key: "reward_redeemed", label: "🛍️ Redemptions" },
  ];

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.title?.toLowerCase().includes(q) ||
      log.description?.toLowerCase().includes(q) ||
      log.userName?.toLowerCase().includes(q) ||
      log.userHandle?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Daily Checkin Action */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider mb-2">
            <History className="w-4 h-4" /> Comprehensive Activity Ledger & Audit Feed
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            Activity Timeline & Points Log
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-medium leading-relaxed">
            Real-time feed of every point awarded or redeemed across VibePulse. Monitor community engagement dynamics or filter by specific member profiles!
          </p>
        </div>

        {/* Daily checkin card */}
        <div className="bg-slate-950 border-2 border-orange-500/50 rounded-2xl p-5 shadow-xl min-w-[240px] w-full md:w-auto text-center flex-shrink-0">
          <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-orange-400 uppercase tracking-wider">
            <Flame className="w-4 h-4 fill-current text-orange-500 animate-pulse" />
            <span>Daily Streak Bounty</span>
          </div>
          <div className="text-2xl font-black text-white mt-1">+15 Points</div>
          <p className="text-[11px] text-slate-400 mt-1 mb-3.5">Check in once per day to score bonus loyalty loyalty points!</p>
          <button
            onClick={handleClaimCheckin}
            disabled={claimingCheckin || !currentUser}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-slate-950 font-black text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{claimingCheckin ? "Claiming..." : "Claim Check-In (+15 Pts)"}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search descriptions, usernames, or actions..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Member selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Profile Filter:</span>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="all">🌐 All Community Members</option>
              {currentUser && <option value={String(currentUser.id)}>👤 My Activities ({currentUser.name})</option>}
              {allUsers
                .filter((u) => u.id !== currentUser?.id)
                .map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name} (@{u.username})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Activity Type Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 hidden md:inline">Action Type:</span>
          {typeOptions.map((opt) => {
            const isActive = selectedTypeFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setSelectedTypeFilter(opt.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-400/30"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity Timeline Records */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
          <h3 className="text-lg font-extrabold text-white">Recorded Activity Stream</h3>
          <span className="text-xs text-slate-400 font-bold">{filteredLogs.length} events logged</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm animate-pulse">Loading audit trail...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl p-6 bg-slate-950/40">
            <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="font-bold text-slate-200">No activity events match your filter</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try removing filter restrictions or interact in the Community Stream to generate new activity logs!
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredLogs.map((log) => {
              const cfg = activityTypeConfig[log.activityType] || {
                label: log.activityType.replace(/_/g, " "),
                icon: <Sparkles className="w-4 h-4 text-slate-400" />,
                badge: "bg-slate-800 text-slate-300 border-slate-700",
              };
              const isPositive = log.pointsChange > 0;
              const isZero = log.pointsChange === 0;

              let relativeTime = "recently";
              let exactTime = "";
              try {
                if (log.createdAt) {
                  relativeTime = formatDistanceToNow(new Date(log.createdAt), { addSuffix: true });
                  exactTime = format(new Date(log.createdAt), "MMM d, yyyy • h:mm a");
                }
              } catch (e) {}

              return (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 transition-all"
                >
                  {/* Left: User Avatar + Event details */}
                  <div className="flex items-start gap-4 min-w-0">
                    <img
                      src={
                        log.userAvatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.userHandle || "member"}`
                      }
                      alt={log.userName || "User"}
                      className="w-11 h-11 rounded-full object-cover border border-slate-600 flex-shrink-0 mt-0.5 shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">{log.userName || "Member"}</span>
                        <span className="text-xs text-slate-400">(@{log.userHandle})</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-slate-400" title={exactTime}>{relativeTime}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${cfg.badge}`}>
                          {cfg.icon}
                          <span>{cfg.label}</span>
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-lg">
                          {log.description || log.title}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Point Change Delta */}
                  <div className="flex items-center sm:justify-end gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                    <div className={`px-3 py-1.5 rounded-xl font-black text-sm sm:text-base flex items-center gap-1 shadow-inner ${
                      isPositive
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : isZero
                        ? "bg-slate-800 text-slate-400 border border-slate-700"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}>
                      <Zap className={`w-4 h-4 ${isPositive ? "fill-current text-amber-400" : isZero ? "text-slate-500" : "fill-current text-rose-400"}`} />
                      <span>{isPositive ? `+${log.pointsChange}` : log.pointsChange} Pts</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
