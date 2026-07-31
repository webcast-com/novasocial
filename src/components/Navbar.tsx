"use client";

import React, { useState } from "react";
import { User } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Users, Shield, Plus, ChevronDown, Check, Award, Sparkles, X, UserCircle2 } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

interface Props {
  currentUser: User | null;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onUserCreated: (user: User) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onShowToast: (msg: string, pts?: number, err?: boolean) => void;
  notificationSignal?: number;
  isLive?: boolean;
}

export default function Navbar({
  currentUser,
  allUsers,
  onSelectUser,
  onUserCreated,
  activeTab,
  setActiveTab,
  onShowToast,
  notificationSignal = 0,
  isLive = false,
}: Props) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim()) {
      onShowToast("Please provide both name and username", undefined, true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          username: newUsername.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUserCreated(data.user);
        setShowNewUserModal(false);
        setNewName("");
        setNewUsername("");
        onShowToast(`Welcome ${data.user.name}! Account created with 0 points. Start engaging!`);
      } else {
        onShowToast(data.error || "Failed to create account", undefined, true);
      }
    } catch (err) {
      onShowToast(String(err), undefined, true);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: "stream", label: "Feed", fullLabel: "Community Feed", icon: "💬" },
    { id: "chat", label: "Groups", fullLabel: "Groups & DMs", icon: "🗨️", badge: "Live" },
    { id: "quests", label: "Quests", fullLabel: "Quests & Streaks", icon: "🎯", badge: "Daily" },
    { id: "referrals", label: "Referrals", fullLabel: "Referrals & Invites", icon: "🎁", badge: "200 pts" },
    { id: "leaderboard", label: "Ranking", fullLabel: "Leaderboard", icon: "👑" },
    { id: "timeline", label: "Activity", fullLabel: "Activity Log", icon: "📈" },
    { id: "rewards", label: "Store", fullLabel: "Rewards Store", icon: "🛍️" },
    { id: "rules", label: "Admin", fullLabel: "Rule Engine", icon: "⚙️" },
    { id: "analytics", label: "Insights", fullLabel: "Platform Stats", icon: "📊" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-[18px] border-b border-slate-800/80 text-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
        style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.88))" }}>
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
              <NotificationBell userId={currentUser?.id ?? null} realtimeSignal={notificationSignal} />

              <a
                href="/profile"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold transition-all"
              >
                <UserCircle2 className="w-4 h-4 text-indigo-400" />
                <span>My Profile</span>
              </a>

              <div className="relative">
                {currentUser ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
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
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showUserDropdown ? "rotate-180" : ""}`} />
                  </motion.button>
                ) : (
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-full text-white text-sm shadow-md"
                  >
                    Select Persona
                  </button>
                )}

                <AnimatePresence>
                  {showUserDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.22, ease: [0.16,1,0.3,1] as any }}
                      className="absolute right-0 mt-3 w-80 sm:w-96 glass-strong rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-3 z-50 overflow-hidden"
                    >
                      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 px-2">
                        <div>
                          <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-400" /> Switch Persona
                          </h4>
                          <p className="text-[11px] text-slate-400">Test realtime across accounts</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <a href="/profile" className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">Profile</a>
                          <button onClick={() => { setShowUserDropdown(false); setShowNewUserModal(true); }} className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> New
                          </button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {allUsers.map((u) => {
                          const isSelected = currentUser?.id === u.id;
                          return (
                            <motion.div
                              key={u.id}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => { onSelectUser(u); setShowUserDropdown(false); onShowToast(`Switched to ${u.name}`); }}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${isSelected ? "bg-indigo-900/40 border-indigo-500/60" : "hover:bg-slate-800/80 border-transparent"}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} alt={u.name} className="w-8 h-8 rounded-full border border-slate-600 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold truncate text-white">{u.name}</span>
                                    {u.role === "admin" && <span className="px-1 py-0.2 text-[9px] font-black bg-rose-600 text-white rounded uppercase">Admin</span>}
                                  </div>
                                  <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <span>@{u.username}</span> • <span className="text-amber-400 font-semibold">{u.tierInfo?.icon} {u.tierInfo?.levelName}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="font-bold text-sm text-amber-400 flex items-center"><Zap className="w-3.5 h-3.5 mr-0.5 fill-current" />{u.totalPoints}</span>
                                {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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

      <AnimatePresence>
        {showNewUserModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }} transition={{ type: "spring", damping: 24, stiffness: 260 }} className="glass-strong w-full max-w-md rounded-[20px] p-6 shadow-2xl relative">
              <button onClick={() => setShowNewUserModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition"><X className="w-4 h-4" /></button>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center"><Sparkles className="w-6 h-6" /></div>
                <div><h3 className="text-[15px] font-black text-white">Create Persona</h3><p className="text-xs text-slate-400">New test account with referral code</p></div>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div><label className="block text-xs font-bold text-slate-300 uppercase mb-1">Full Name</label><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Alex Doe" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 outline-none" required /></div>
                <div><label className="block text-xs font-bold text-slate-300 uppercase mb-1">Username</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span><input value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="alex_dev" className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white focus:border-indigo-500 outline-none" required /></div></div>
                <div><label className="block text-xs font-bold text-slate-300 uppercase mb-1">Role</label><select value={newRole} onChange={e=>setNewRole(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"><option value="user">User</option><option value="admin">Admin</option></select></div>
                <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-xs text-indigo-300 flex gap-2"><Award className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>Starts at Novice with custom referral code. Earn points instantly!</span></div>
                <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={()=>setShowNewUserModal(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">Cancel</button><button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg disabled:opacity-50">{loading ? "Creating..." : "Launch ✨"}</button></div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
