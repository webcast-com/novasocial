"use client";

import React, { useState, useEffect } from "react";
import { User, RewardItem, UserRedemptionItem } from "@/types";
import { Gift, Zap, ShoppingBag, CheckCircle, Tag, Lock, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  currentUser: User | null;
  onRefreshUser: () => void;
  onShowToast: (msg: string, pts?: number, err?: boolean) => void;
}

export default function RewardsStore({ currentUser, onRefreshUser, onShowToast }: Props) {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<UserRedemptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"catalog" | "vault">("catalog");

  const fetchRewardsData = async () => {
    setLoading(true);
    try {
      const query = currentUser ? `?userId=${currentUser.id}` : "";
      const res = await fetch(`/api/rewards${query}`);
      const data = await res.json();
      if (data.success) {
        setRewards(data.rewards);
        if (data.userRedemptions) {
          setRedemptions(data.userRedemptions);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewardsData();
  }, [currentUser?.id]);

  const handleRedeem = async (reward: RewardItem) => {
    if (!currentUser) {
      onShowToast("Please select an active profile in the top bar first", undefined, true);
      return;
    }
    if (currentUser.totalPoints < reward.costPoints) {
      onShowToast(
        `Insufficient point balance! You need ${reward.costPoints - currentUser.totalPoints} more points to redeem ${reward.name}.`,
        undefined,
        true
      );
      return;
    }

    setRedeemingId(reward.id);
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          rewardId: reward.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message);
        onRefreshUser();
        fetchRewardsData();
        setActiveSubTab("vault");
      } else {
        onShowToast(data.error || "Redemption failed", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setRedeemingId(null);
    }
  };

  const categoryBadges: Record<string, string> = {
    swag: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    voucher: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    vip: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-black shadow mb-3 uppercase tracking-wider">
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>Rewards & Swag Redemption Hub</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Exchange Points For Real Perks
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-medium leading-relaxed">
            Your high community activity pays dividends! Exchange accrued points for limited-edition apparel, digital coffee vouchers, VIP Discord role flair, or private engineering mentor strategy calls.
          </p>
        </div>

        {/* User balance pill */}
        {currentUser && (
          <div className="bg-slate-950/90 border-2 border-amber-500/60 rounded-3xl p-6 text-center min-w-[220px] flex-shrink-0 shadow-2xl relative z-10">
            <div className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Available Balance</div>
            <div className="text-4xl font-black text-amber-400 mt-1.5 flex items-center justify-center gap-1.5">
              <Zap className="w-7 h-7 fill-current text-amber-400 animate-bounce-slow" />
              <span>{currentUser.totalPoints.toLocaleString()}</span>
            </div>
            <div className="mt-1 text-xs font-bold text-slate-300 uppercase tracking-wide">Loyalty Points</div>
          </div>
        )}
      </div>

      {/* Sub-tab switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("catalog")}
            className={`px-5 py-2.5 rounded-2xl font-extrabold text-sm transition-all flex items-center gap-2 ${
              activeSubTab === "catalog"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Available Rewards Catalog ({rewards.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("vault")}
            className={`px-5 py-2.5 rounded-2xl font-extrabold text-sm transition-all flex items-center gap-2 ${
              activeSubTab === "vault"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>My Redemption Vault ({redemptions.length})</span>
          </button>
        </div>

        <button
          onClick={fetchRewardsData}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Store
        </button>
      </div>

      {/* View 1: Catalog Grid */}
      {activeSubTab === "catalog" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((item) => {
            const canAfford = currentUser && currentUser.totalPoints >= item.costPoints;
            const inStock = item.stock > 0;
            const badgeStyle = categoryBadges[item.category] || "bg-slate-800 text-slate-300 border-slate-700";

            return (
              <div
                key={item.id}
                className={`bg-slate-900/90 border rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                  canAfford
                    ? "border-slate-700 hover:border-amber-500/50 shadow-indigo-950/20"
                    : "border-slate-800/80 opacity-90 hover:opacity-100"
                }`}
              >
                <div>
                  <div className="relative h-48 bg-slate-950 overflow-hidden">
                    <img
                      src={
                        item.imageUrl ||
                        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=500&auto=format&fit=crop&q=80"
                      }
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border shadow-sm ${badgeStyle}`}>
                        {item.category}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md border border-slate-700 rounded-full px-3 py-1 text-xs font-bold text-slate-300">
                      Stock: {item.stock}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="font-extrabold text-lg text-white tracking-tight leading-snug">{item.name}</h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed min-h-[44px]">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-slate-800/60 mt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-amber-400 font-black text-xl">
                    <Zap className="w-5 h-5 fill-current text-amber-400 animate-pulse" />
                    <span>{item.costPoints.toLocaleString()}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase ml-0.5">Pts</span>
                  </div>

                  <button
                    onClick={() => handleRedeem(item)}
                    disabled={redeemingId === item.id || !inStock || !currentUser}
                    className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 ${
                      !inStock
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                        : canAfford
                        ? "bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white hover:opacity-95 shadow-amber-500/20 active:scale-95"
                        : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {!inStock ? (
                      <span>Out of Stock</span>
                    ) : canAfford ? (
                      <>
                        <Sparkles className="w-4 h-4 fill-current text-amber-300" />
                        <span>{redeemingId === item.id ? "Redeeming..." : "Redeem Now"}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Need {currentUser ? item.costPoints - currentUser.totalPoints : item.costPoints} Pts</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: User Redemption Vault */}
      {activeSubTab === "vault" && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="mb-6 pb-4 border-b border-slate-800">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <span>{currentUser?.name || "Your"}'s Redeemed Perks & Swag</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Confirmed perks you have previously unlocked using VibePulse activity points
            </p>
          </div>

          {!currentUser ? (
            <div className="py-16 text-center text-slate-400 text-sm">Please select a profile to view redemptions.</div>
          ) : redemptions.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-3xl p-8 bg-slate-950/50 max-w-lg mx-auto">
              <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="font-extrabold text-lg text-slate-200">No redemptions in your vault yet</h4>
              <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed">
                You have <strong>{currentUser.totalPoints} available loyalty points</strong>. Browse the catalog and exchange them for merch or exclusive digital badges!
              </p>
              <button
                onClick={() => setActiveSubTab("catalog")}
                className="px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-2xl shadow-lg hover:bg-indigo-500 transition-all"
              >
                Explore Rewards Catalog
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {redemptions.map((red) => {
                let rDate = "recently";
                try {
                  if (red.redeemedAt) {
                    rDate = formatDistanceToNow(new Date(red.redeemedAt), { addSuffix: true });
                  }
                } catch (e) {}

                return (
                  <div
                    key={red.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all shadow-inner"
                  >
                    <div className="flex items-center gap-4">
                      {red.imageUrl ? (
                        <img src={red.imageUrl} alt={red.rewardName} className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shadow" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-2xl">
                          🎁
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-white text-base">{red.rewardName}</h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Fulfilled ✓
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                          Redeemed {rDate} • Spent <strong>{red.pointsSpent} pts</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-bold bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
                        Voucher Code: VIBE-VP-{red.id * 187}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
