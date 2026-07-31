"use client";

import React, { useState, useEffect } from "react";
import { User, QuestItem } from "@/types";
import {
  Flame,
  Award,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Target,
  Trophy,
  Calendar,
  ChevronRight,
} from "lucide-react";

interface Props {
  currentUser: User | null;
  onReward: (rewardData: any) => void;
  onShowToast: (msg: string, pts?: number, err?: boolean) => void;
}

export default function QuestsAndStreaks({ currentUser, onReward, onShowToast }: Props) {
  const [quests, setQuests] = useState<any[]>([]);
  const [streakInfo, setStreakInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchQuestsData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quests?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setQuests(data.quests);
        setStreakInfo(data.userStreakInfo);
      }
    } catch (e) {
      console.error("Fetch quests error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestsData();
  }, [currentUser?.id]);

  const handleClaimQuest = async (questId: number) => {
    if (!currentUser) {
      onShowToast("Please select an active persona first", undefined, true);
      return;
    }
    setClaimingId(questId);
    try {
      const res = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim_quest",
          userId: currentUser.id,
          questId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message);
        fetchQuestsData();
        if (data.reward) {
          onReward(data.reward);
        }
      } else {
        onShowToast(data.error || "Claim failed", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setClaimingId(null);
    }
  };

  const handleStreakCheckin = async () => {
    if (!currentUser) {
      onShowToast("Please select an active persona first", undefined, true);
      return;
    }
    setCheckingIn(true);
    try {
      const res = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "streak_checkin",
          userId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message);
        fetchQuestsData();
        if (data.reward) {
          onReward(data.reward);
        }
      } else {
        onShowToast(data.error || "Streak checkin failed", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setCheckingIn(false);
    }
  };

  const currentStreakNum = streakInfo?.currentStreak || currentUser?.currentStreak || 1;
  const maxStreakNum = streakInfo?.maxStreak || currentUser?.maxStreak || 1;
  const todayKey = new Date().toISOString().slice(0, 10);
  const checkedInToday = streakInfo?.lastCheckinDate === todayKey;

  return (
    <div className="space-y-8">
      {/* Top Banner with Streak Card */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black shadow mb-3 uppercase tracking-wider">
            <Flame className="w-4 h-4 fill-current" />
            <span>Multi-Day Streaks & Quests</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Daily Quests & Streak Multipliers
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-medium leading-relaxed">
            Complete daily micro-challenges to unlock instant point bonuses. Log in consecutive days to trigger exponential streak multipliers and unlock exclusive Streak Master badges!
          </p>
        </div>

        {/* Multi-Day Streak Check-in Card */}
        <div className="bg-slate-950 border-2 border-orange-500/60 rounded-3xl p-6 text-center min-w-[260px] flex-shrink-0 shadow-2xl relative z-10">
          <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-orange-400 uppercase tracking-wider">
            <Flame className="w-4 h-4 fill-current text-orange-500 animate-pulse" />
            <span>Active Login Streak</span>
          </div>

          <div className="mt-2 flex items-center justify-center gap-3">
            <div className="text-4xl font-black text-white">{currentStreakNum}</div>
            <div className="text-left">
              <div className="text-xs font-bold text-amber-400">Days Streak</div>
              <div className="text-[11px] text-slate-400">Best: {maxStreakNum} Days</div>
            </div>
          </div>

          <div className="mt-3 py-1 px-3 rounded-full bg-orange-500/20 text-orange-300 text-xs font-extrabold border border-orange-500/30 inline-block">
            ⚡ {Math.min(100, 15 + (currentStreakNum - 1) * 10)} Pts Streak Multiplier Bonus
          </div>

          <button
            onClick={handleStreakCheckin}
            disabled={checkingIn || checkedInToday || !currentUser}
            className={`mt-4 w-full py-3 px-5 rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
              checkedInToday
                ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-default"
                : "bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-slate-950 shadow-orange-500/30 scale-105 animate-pulse"
            }`}
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>
              {checkedInToday
                ? "Checked In Today ✓"
                : checkingIn
                ? "Checking in..."
                : "Claim Daily Streak Bonus"}
            </span>
          </button>
        </div>
      </div>

      {/* Quests Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            <span>Active Daily & Weekly Challenges</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Progress updates automatically as you interact in the Community Stream
          </p>
        </div>
        <button
          onClick={fetchQuestsData}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Quests Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm animate-pulse">Loading daily quests...</div>
      ) : quests.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">No active quests found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quests.map((quest) => {
            const current = quest.currentCount || 0;
            const target = quest.targetCount || 1;
            const progressPercent = Math.min(100, Math.floor((current / target) * 100));
            const isCompleted = quest.isCompleted || current >= target;
            const isClaimed = quest.isClaimed;

            return (
              <div
                key={quest.id}
                className={`bg-slate-900/90 border rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all ${
                  isClaimed
                    ? "border-slate-800 opacity-75"
                    : isCompleted
                    ? "border-emerald-500/70 shadow-emerald-950/30"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-inner ${
                          isCompleted
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        }`}
                      >
                        {isCompleted ? "✓" : "🎯"}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-white leading-tight">{quest.title}</h4>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-400">
                          {quest.frequency} challenge
                        </span>
                      </div>
                    </div>

                    <div className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center gap-1 flex-shrink-0">
                      <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
                      <span>+{quest.pointsReward} Pts</span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">{quest.description}</p>
                </div>

                {/* Progress Bar & Claim Button */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Progress:</span>
                    <span className={isCompleted ? "text-emerald-400" : "text-white"}>
                      {Math.min(current, target)} / {target} Completed
                    </span>
                  </div>

                  <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : "bg-gradient-to-r from-indigo-500 to-purple-500"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="pt-2">
                    {isClaimed ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-2xl bg-slate-800 text-slate-400 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-default"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Reward Claimed ✓</span>
                      </button>
                    ) : isCompleted ? (
                      <button
                        onClick={() => handleClaimQuest(quest.id)}
                        disabled={claimingId === quest.id}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 scale-[1.02] animate-pulse"
                      >
                        <Sparkles className="w-4 h-4 fill-current" />
                        <span>
                          {claimingId === quest.id
                            ? "Claiming..."
                            : `Claim Challenge Reward (+${quest.pointsReward} Pts) ✨`}
                        </span>
                      </button>
                    ) : (
                      <div className="w-full py-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 font-bold text-xs text-center">
                        Complete challenge in feed to unlock reward
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
