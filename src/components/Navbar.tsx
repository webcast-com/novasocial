"use client";

import React, { useState } from "react";
import { User } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Shield, UserCircle2, LogOut, ChevronDown, Copy, Check, LogIn } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

interface Props {
  currentUser: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onShowToast: (msg: string, pts?: number, err?: boolean) => void;
  notificationSignal?: number;
  isLive?: boolean;
}

export default function Navbar({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  onShowToast,
  notificationSignal = 0,
  isLive = false,
}: Props) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const navItems = [
    { id: "stream", label: "Feed", fullLabel: "Community Feed", icon: "💬" },
    { id: "reels", label: "Reels", fullLabel: "Creator Reels", icon: "🎬", badge: "Video" },
    ...(currentUser ? [{ id: "messages", label: "Messages", fullLabel: "Private Messages", icon: "✉️" }] : []),
    { id: "live", label: "Live", fullLabel: "Live Broadcasts", icon: "📡", badge: "WebRTC" },
    { id: "ideas", label: "Ideas", fullLabel: "Ideas & Roadmap", icon: "💡", badge: "New" },
    { id: "chat", label: "Groups", fullLabel: "Communities", icon: "🗨️", badge: "Live" },
    { id: "quests", label: "Quests", fullLabel: "Quests & Streaks", icon: "🎯", badge: "Daily" },
    ...(currentUser ? [{ id: "referrals", label: "Referrals", fullLabel: "Referrals & Invites", icon: "🎁", badge: "200 pts" }] : []),
    { id: "leaderboard", label: "Ranking", fullLabel: "Leaderboard", icon: "👑" },
    { id: "timeline", label: "Activity", fullLabel: "Activity Log", icon: "📈" },
    { id: "rewards", label: "Store", fullLabel: "Rewards Store", icon: "🛍️" },
    // The Rule Engine is only visible to admins (the API enforces it server-side too).
    ...(currentUser?.role === "admin"
      ? [{ id: "rules", label: "Admin", fullLabel: "Rule Engine", icon: "⚙️" }]
      : []),
    { id: "analytics", label: "Insights", fullLabel: "Platform Stats", icon: "📊" },
  ];

  const handleCopyReferral = async () => {
    if (!currentUser) return;
    const link = `${window.location.origin}/join?ref=${currentUser.referralCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCode(true);
      onShowToast("Referral link copied to clipboard! 🎁");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      onShowToast("Could not copy link", undefined, true);
    }
  };

  return (
    <header className="dashboard-header-surface sticky top-0 z-40 backdrop-blur-[18px] border-b border-slate-800/80 text-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px] gap-4">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16,1,0.3,1] as any }}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab("stream")}
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.97 }}
              className="relative w-11 h-11 rounded-[14px] bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_8px_24px_rgba(244,63,94,0.25)] font-black text-[18px] tracking-tighter"
            >
              <span className="relative z-10">VP</span>
              <div className="absolute inset-0 rounded-[14px] bg-gradient-to-tr from-white/20 to-transparent opacity-60" />
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-[17px] sm:text-[20px] tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  VibePulse
                </h1>
                <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Realtime Engine
                </span>
                <motion.span
                  animate={{ scale: isLive ? [1,1.15,1] : 1 }}
                  transition={{ repeat: isLive ? Infinity : 0, duration: 1.8 } as any}
                  className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${isLive ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                  {isLive ? "Live" : "Syncing"}
                </motion.span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block -mt-0.5">
                Posts • Reactions • Quests • DMs • Real-time
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-2 sm:gap-2.5"
          >
            {currentUser ? (
              <>
                <NotificationBell userId={currentUser.id} realtimeSignal={notificationSignal} />
                <a
                  href="/profile"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold transition-all"
                >
                  <UserCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>My Profile</span>
                </a>
              </>
            ) : (
              <button
                onClick={() => setActiveTab("auth")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold transition-all"
              >
                <LogIn className="w-4 h-4 text-indigo-400" />
                <span>Sign In</span>
              </button>
            )}

            {currentUser && (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 p-1 sm:pl-1 sm:pr-3 sm:py-1 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-all"
                >
                  <div className="relative">
                    <img
                      src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`}
                      alt={currentUser.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-600"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
                    {currentUser.role === "admin" && (
                      <span className="absolute -top-1 -right-1 bg-rose-600 text-white p-0.5 rounded-full text-[10px] shadow">
                        <Shield className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                      {currentUser.name}
                      <span className="text-[10px] text-slate-400">@{currentUser.username}</span>
                    </div>
                    <div className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                      {currentUser.tierInfo.icon} {currentUser.tierInfo.levelName}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/10 border border-amber-500/30 text-amber-300 font-black text-[13px] shadow-inner">
                    <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                    <span>{currentUser.totalPoints.toLocaleString()}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.22, ease: [0.16,1,0.3,1] as any }}
                      className="absolute right-0 mt-3 w-72 glass-strong rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-3 z-50 overflow-hidden"
                    >
                      <div className="px-2.5 py-2 mb-1">
                        <div className="text-sm font-black text-white flex items-center gap-2">
                          {currentUser.name}
                          {currentUser.role === "admin" && (
                            <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-600 text-white rounded uppercase">Admin</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">@{currentUser.username} • {currentUser.tierInfo?.icon} {currentUser.tierInfo?.levelName}</div>
                      </div>

                      <button
                        onClick={handleCopyReferral}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-slate-800/80 text-left transition-all"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200">Copy referral link</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">{currentUser.referralCode}</div>
                        </div>
                      </button>

                      <a
                        href="/profile"
                        className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-slate-800/80 text-left transition-all"
                      >
                        <UserCircle2 className="w-4 h-4 text-indigo-400" />
                        <div className="text-xs font-bold text-slate-200">Edit profile</div>
                      </a>

                      <button
                        onClick={() => { setShowUserMenu(false); onLogout(); }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-rose-950/50 text-left transition-all border-t border-slate-800/80 mt-1 pt-3"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <div className="text-xs font-bold text-rose-300">Sign out</div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="border-t border-slate-800/60 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 sm:gap-1.5 h-[52px] overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.fullLabel}
                  className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all"
                >
                  {isActive && (
                    <motion.div layoutId="nav-active" className="absolute inset-0 bg-indigo-600/90 rounded-xl shadow-[0_4px_16px_rgba(99,102,241,0.3)] border border-indigo-400/30" />
                  )}
                  <span className={`relative z-10 flex items-center gap-2 ${isActive ? "text-white" : "text-slate-400 hover:text-slate-200"}`}>
                    <span>{item.icon}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.fullLabel}</span>
                    {item.badge && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${isActive ? "bg-white/20 text-white" : "bg-rose-500 text-white animate-pulse"}`}>
                        {item.badge}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
