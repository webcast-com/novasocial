"use client";

import React, { useState, useEffect } from "react";
import { User, ReferralItem } from "@/types";
import { Users, Gift, Copy, Check, Sparkles, Send, Zap, UserPlus, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import SocialPreviewCard from "@/components/SocialPreviewCard";
import { formatDistanceToNow } from "date-fns";

interface Props {
  currentUser: User | null;
  onReward: (rewardData: any) => void;
  onUserCreated: (newUser: User) => void;
  onShowToast: (msg: string, pts?: number, err?: boolean) => void;
}

export default function ReferralHub({ currentUser, onReward, onUserCreated, onShowToast }: Props) {
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchReferrals = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/referrals?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setReferrals(data.referrals);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [currentUser?.id]);

  const referralLink = typeof window !== "undefined" && currentUser
    ? `${window.location.origin}/join?ref=${currentUser.referralCode}`
    : `https://vibepulse.io/join?ref=${currentUser?.referralCode || "PULSE"}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    onShowToast("Personal referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onShowToast("Please select an active persona first", undefined, true);
      return;
    }
    if (!inviteEmail) return;

    setInviting(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          referrerId: currentUser.id,
          email: inviteEmail.trim(),
          name: inviteName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInviteEmail("");
        setInviteName("");
        fetchReferrals();
        onShowToast(data.message);
      } else {
        onShowToast(data.error || "Invitation failed", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setInviting(false);
    }
  };

  const handleSimulateSignup = async (targetReferralId?: number) => {
    if (!currentUser) {
      onShowToast("Please select an active persona first", undefined, true);
      return;
    }

    setSimulating(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate_signup",
          referrerId: currentUser.id,
          referralId: targetReferralId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchReferrals();
        if (data.newUser) {
          onUserCreated(data.newUser);
        }
        if (data.reward) {
          onReward(data.reward);
        }
      } else {
        onShowToast(data.error || "Simulation failed", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setSimulating(false);
    }
  };

  const completedCount = referrals.filter((r) => r.status === "completed").length;
  const pendingCount = referrals.filter((r) => r.status === "pending").length;
  const totalReferralPoints = referrals.reduce((acc, curr) => acc + (curr.pointsAwarded || 0), 0);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 relative overflow-hidden">
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold shadow mb-3 uppercase tracking-wider">
            <Gift className="w-4 h-4 stroke-[2.5]" />
            <span>Highest Reward Bounty: +200 Points per referral</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Referral & Affiliate Hub
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
            Invite friends, engineers, or coworkers to join VibePulse! Every verified friend sign-up automatically awards your account <strong className="text-amber-400 font-bold">+200 loyalty points</strong>—propelling you immediately across tier boundaries!
          </p>
        </div>

        {/* Affiliate Box */}
        <div className="mt-8 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-inner relative z-10">
          <div className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-4 h-4 fill-current text-amber-400" />
            <span>Your Personal Affiliate Invitation Link</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 font-mono text-xs sm:text-sm text-slate-200 truncate select-all shadow-inner">
              {referralLink}
            </div>
            <button
              onClick={handleCopyLink}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Link Copied!" : "Copy Link"}</span>
            </button>
            <button
              onClick={() => handleSimulateSignup()}
              disabled={simulating || !currentUser}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>{simulating ? "Simulating..." : "✨ Simulate Instant Sign-Up (+200 Pts)"}</span>
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            💡 <strong>Sandbox Tip:</strong> Clicking "Simulate Instant Sign-Up" immediately spawns a verified teammate using your invite code and credits your balance!
          </p>
        </div>
      </div>

      {/* Dynamic OpenGraph Rich Link Preview */}
      {currentUser && (
        <SocialPreviewCard
          referrerName={currentUser.name}
          referrerUsername={currentUser.username}
          referrerAvatar={currentUser.avatarUrl}
          totalPoints={currentUser.totalPoints}
          tierLevel={currentUser.tierInfo.levelName}
          tierIcon={currentUser.tierInfo.icon}
          referralCode={currentUser.referralCode}
        />
      )}

      {/* Referral Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{completedCount}</div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wide mt-0.5">Completed Referrals</div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <Clock className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{pendingCount}</div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wide mt-0.5">Pending Invitations</div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Zap className="w-7 h-7 fill-current" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">{totalReferralPoints.toLocaleString()} Pts</div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wide mt-0.5">Points From Referrals</div>
          </div>
        </div>
      </div>

      {/* Grid: Send Email Invitation & Referral History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Send Email Invite Box (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Send Email Invitation</h3>
              <p className="text-xs text-slate-400">Invite peers to join your team network</p>
            </div>
          </div>

          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Colleague Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Jason Mora"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Email Address <span className="text-rose-400">*</span></label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jason@company.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-indigo-400">How it works:</div>
              <p className="text-slate-400 leading-relaxed">
                When an invited email address completes sign-up, your status converts from <em>Pending</em> to <em>Completed</em> and credits +200 points.
              </p>
            </div>

            <button
              type="submit"
              disabled={inviting || !currentUser}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{inviting ? "Sending Invite..." : "Send Invitation"}</span>
            </button>
          </form>
        </div>

        {/* Referrals History Table (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Referral Tracker & Audit List</span>
              </h3>
              <p className="text-xs text-slate-400">History of invites initiated by {currentUser?.name || "your account"}</p>
            </div>
            <button
              onClick={fetchReferrals}
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">Loading referral records...</div>
          ) : referrals.length === 0 ? (
            <div className="py-14 text-center border border-dashed border-slate-800 rounded-2xl p-6 bg-slate-950/40">
              <Gift className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-200">No invitations recorded yet</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Send an invite or test out the "Simulate Instant Sign-Up" button above to witness the instant +200 points referral loop!
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {referrals.map((ref) => {
                const isCompleted = ref.status === "completed";
                let timeStr = "recently";
                try {
                  if (ref.createdAt) {
                    timeStr = formatDistanceToNow(new Date(ref.createdAt), { addSuffix: true });
                  }
                } catch (e) {}

                return (
                  <div
                    key={ref.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold flex-shrink-0 text-sm ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                        {isCompleted ? "✓" : "⏳"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm truncate">{ref.referredName || ref.referredEmail}</span>
                          <span className="text-xs text-slate-400 truncate">({ref.referredEmail})</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium">
                          <span>Invited {timeStr}</span>
                          {ref.completedAt && (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              • Verified & Joined
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                      <div>
                        {isCompleted ? (
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 fill-current text-emerald-400" /> +{ref.pointsAwarded} Pts Awarded
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Pending Conversion
                          </span>
                        )}
                      </div>

                      {!isCompleted && (
                        <button
                          onClick={() => handleSimulateSignup(ref.id)}
                          disabled={simulating}
                          title="Simulate this friend signing up now"
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Convert (+200 Pts)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
