"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, PostItem } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import NotificationToast, { RewardToastData } from "@/components/NotificationToast";
import CommunityStream from "@/components/CommunityStream";
import ReferralHub from "@/components/ReferralHub";
import LeaderboardView from "@/components/LeaderboardView";
import ActivityTimeline from "@/components/ActivityTimeline";
import RewardsStore from "@/components/RewardsStore";
import AdminRuleEngine from "@/components/AdminRuleEngine";
import AnalyticsOverview from "@/components/AnalyticsOverview";
import CommunityChat from "@/components/CommunityChat";
import QuestsAndStreaks from "@/components/QuestsAndStreaks";
import BackgroundOrbs from "@/components/ui/BackgroundOrbs";
import AuthGate from "@/components/AuthGate";
import { PostSkeleton } from "@/components/ui/Skeleton";
import { fadeInUp, stagger } from "@/components/ui/motion";
import { useRealtime, RealtimeMessage } from "@/hooks/useRealtime";
import { Sparkles, Zap, Users, Gift, ArrowUpRight, Activity, Trophy, Target } from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [activeTab, setActiveTab] = useState("stream");
  const [toasts, setToasts] = useState<RewardToastData[]>([]);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [notificationSignal, setNotificationSignal] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const currentUserRef = useRef<User | null>(currentUser);
  currentUserRef.current = currentUser;

  const addToast = (message: string, pointsAwarded?: number, isError = false, leveledUp = false, newLevel = "") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        pointsAwarded,
        type: isError ? "error" : "success",
        leveledUp,
        newLevel,
      },
    ]);
  };

  const handleDismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchUsers = async (keepCurrentId?: number) => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        const uList = data.users;
        setAllUsers(uList);
        if (keepCurrentId) {
          const updatedCurr = uList.find((u: User) => u.id === keepCurrentId);
          if (updatedCurr) setCurrentUser((prev) => (prev ? updatedCurr : prev));
        }
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  // Refresh the signed-in user from the authoritative session endpoint.
  const fetchMe = async (): Promise<User | null> => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        return data.user;
      }
      setCurrentUser(null);
      return null;
    } catch (err) {
      console.error("Failed to fetch session user:", err);
      return null;
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      if (data.success) setPosts(data.posts);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    }
  };

  const fetchActiveEvent = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (data.success) {
        const live = (data.events || []).find((e: any) => e.isActive);
        setActiveEvent(live || null);
      }
    } catch (err) {
      console.error("Failed to fetch flash events:", err);
    }
  };

  const bootstrapAndInit = async () => {
    setLoading(true);
    try {
      // Seeds an EMPTY database on first run (returns 403 afterwards unless admin — harmless).
      await fetch("/api/bootstrap", { method: "POST" }).catch(() => null);
      const me = await fetchMe();
      setAuthChecked(true);
      if (me) {
        await fetchUsers(me.id);
        await fetchPosts();
        await fetchActiveEvent();
      }
    } catch (err) {
      console.error("Bootstrap init error:", err);
      addToast("Error connecting to database services", undefined, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrapAndInit();
  }, []);

  const handleAuthenticated = async (user: User) => {
    setLoading(true);
    setAuthChecked(true);
    setCurrentUser(user);
    await Promise.all([fetchUsers(user.id), fetchPosts(), fetchActiveEvent()]);
    setLoading(false);
    addToast(`Welcome, ${user.name}! You're signed in as @${user.username}.`);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setCurrentUser(null);
    setActiveTab("stream");
    addToast("You have been signed out. See you soon! 👋");
  };

  const handleReward = (rewardData: any) => {
    if (!rewardData) return;
    const { pointsAwarded, message, leveledUp, newLevel } = rewardData;
    if (currentUser) {
      fetchUsers(currentUser.id);
      fetchMe();
    }
    fetchActiveEvent();
    addToast(
      message || `You earned +${pointsAwarded} points!`,
      pointsAwarded,
      false,
      leveledUp,
      leveledUp ? newLevel : undefined
    );
  };

  const handleRealtimeMessage = (msg: RealtimeMessage) => {
    const cu = currentUserRef.current;
    const tab = activeTabRef.current;
    switch (msg.type) {
      case "presence":
        if (msg.payload?.status === "connected") setIsLive(true);
        break;
      case "notification":
        setNotificationSignal((n) => n + 1);
        if (msg.payload?.title) addToast(`${msg.payload.iconEmoji || "🔔"} ${msg.payload.message || msg.payload.title}`);
        break;
      case "points_update":
        if (cu && msg.payload?.userId === cu.id) {
          fetchUsers(cu.id);
          fetchMe();
        }
        break;
      case "new_post":
        if (msg.payload?.post) {
          setPosts((prev) => {
            if (prev.some((p) => p.id === msg.payload.post.id)) return prev;
            return [msg.payload.post, ...prev];
          });
        }
        break;
      case "poll_update":
        if (tab === "stream") fetchPosts();
        break;
      case "leaderboard_update":
        fetchUsers(cu?.id);
        break;
      case "flash_event":
        fetchActiveEvent();
        break;
      default:
        break;
    }
  };

  useRealtime(currentUser?.id, handleRealtimeMessage);

  // ------------------------------------------------------------------
  // Unauthenticated: full-screen sign-in / join experience.
  // ------------------------------------------------------------------
  if (!loading && authChecked && !currentUser) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white relative overflow-x-hidden">
        <BackgroundOrbs />
        <NotificationToast toasts={toasts} onDismiss={handleDismissToast} />
        <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-[14px] bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_8px_24px_rgba(244,63,94,0.25)] font-black text-[18px] tracking-tighter">
            VP
          </div>
          <div>
            <h1 className="font-black text-[20px] tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              VibePulse
            </h1>
            <p className="text-[11px] text-slate-400 font-medium -mt-0.5">Realtime Gamified Loyalty Engine</p>
          </div>
        </header>
        <main className="flex-1 relative z-10 px-4 flex flex-col justify-center">
          <AuthGate onAuthenticated={handleAuthenticated} />
        </main>
        <footer className="relative z-10 text-center text-[11px] text-slate-600 pb-6">
          © {new Date().getFullYear()} VibePulse — Posts • Quests • Rewards • Referrals • Real-time
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white relative overflow-x-hidden">
      <BackgroundOrbs />
      <NotificationToast toasts={toasts} onDismiss={handleDismissToast} />

      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onShowToast={(msg, pts, err) => addToast(msg, pts, err)}
        notificationSignal={notificationSignal}
        isLive={isLive}
      />

      <AnimatePresence>
        {activeEvent && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="relative z-20 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-slate-950 shadow-[0_8px_32px_rgba(244,63,94,0.35)]"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-3 flex-wrap text-center">
              <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 fill-current" /> {activeEvent.bannerText || activeEvent.title}
              </motion.span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950/85 text-amber-300 text-xs font-black border border-amber-300/20 shadow">
                {activeEvent.multiplier}X MULTIPLIER LIVE
              </span>
              {currentUser?.role === "admin" && (
                <button onClick={() => setActiveTab("rules")} className="px-3 py-0.5 rounded-full bg-white/25 hover:bg-white/40 text-slate-950 text-xs font-black transition-all">Manage Event →</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 py-10">
            <div className="flex flex-col items-center gap-4 py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} className="w-20 h-20 rounded-[22px] bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-[0_16px_40px_rgba(244,63,94,0.35)]">
                <Sparkles className="w-9 h-9 text-white" />
              </motion.div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white tracking-tight">Bootstrapping VibePulse Engine</h3>
                <p className="text-sm text-slate-400 mt-1">Syncing realtime stream • Loading community • Verifying quests</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[0,1,2].map(i=>(
                <div key={i} className="glass rounded-3xl p-6">
                  <div className="w-24 h-3 bg-slate-800 rounded mb-4 animate-shimmer" />
                  <div className="w-20 h-8 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
            <div className="space-y-5">
              {[0,1,2].map(i=><PostSkeleton key={i} />)}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16,1,0.3,1] as any }}
            >
              {/* Quick live stats strip */}
              <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {[
                  { label: "Active Members", value: allUsers.length, icon: Users, color: "from-indigo-500/20 to-indigo-600/10", border: "border-indigo-500/30", iconColor: "text-indigo-400" },
                  { label: "Total Posts", value: posts.length, icon: Activity, color: "from-emerald-500/20 to-emerald-600/10", border: "border-emerald-500/30", iconColor: "text-emerald-400" },
                  { label: "Your Points", value: currentUser?.totalPoints ?? 0, icon: Zap, color: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/30", iconColor: "text-amber-400" },
                  { label: "Live Status", value: isLive ? "Connected" : "Syncing", icon: Target, color: "from-rose-500/20 to-purple-500/10", border: "border-rose-500/30", iconColor: "text-rose-400" },
                ].map((stat, i)=>(
                  <motion.div key={stat.label} variants={fadeInUp} className={`glass rounded-2xl p-4 flex items-center gap-3 border ${stat.border} bg-gradient-to-br ${stat.color}`}>
                    <div className={`w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${stat.iconColor}`}><stat.icon className="w-5 h-5" /></div>
                    <div><div className="text-[11px] font-black uppercase tracking-wider text-slate-400">{stat.label}</div><div className="text-[18px] font-black text-white leading-tight">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</div></div>
                  </motion.div>
                ))}
              </motion.div>

              {activeTab === "stream" && <CommunityStream currentUser={currentUser} posts={posts} onRefreshPosts={fetchPosts} onReward={handleReward} onShowToast={(msg, pts, err) => addToast(msg, pts, err)} />}
              {activeTab === "chat" && <CommunityChat currentUser={currentUser} allUsers={allUsers} onReward={handleReward} onShowToast={(msg, pts, err) => addToast(msg, pts, err)} />}
              {activeTab === "quests" && <QuestsAndStreaks currentUser={currentUser} onReward={handleReward} onShowToast={(msg, pts, err) => addToast(msg, pts, err)} />}
              {activeTab === "referrals" && <ReferralHub currentUser={currentUser} onReward={handleReward} onUserCreated={(u)=>setAllUsers(prev=>[...prev, u])} onShowToast={(msg, pts, err)=>addToast(msg, pts, err)} />}
              {activeTab === "leaderboard" && <LeaderboardView users={allUsers} currentUser={currentUser} onSelectUser={(u)=>{ window.location.href = `/profile?userId=${u.id}`; }} />}
              {activeTab === "timeline" && <ActivityTimeline currentUser={currentUser} allUsers={allUsers} onReward={handleReward} onShowToast={(msg, pts, err)=>addToast(msg, pts, err)} />}
              {activeTab === "rewards" && <RewardsStore currentUser={currentUser} onRefreshUser={()=>currentUser && fetchUsers(currentUser.id)} onShowToast={(msg, pts, err)=>addToast(msg, pts, err)} />}
              {activeTab === "rules" && <AdminRuleEngine currentUser={currentUser} onShowToast={(msg, pts, err)=>addToast(msg, pts, err)} />}
              {activeTab === "analytics" && <AnalyticsOverview />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-xl mt-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white font-black">VP</div>
                <span className="font-black text-white">VibePulse</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">Live</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">Realtime gamified loyalty engine. Next.js + Drizzle + PostgreSQL + SSE. Earn points for every meaningful interaction.</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Built with</span>
                <span className="text-xs">⚡ Next.js 16 • 🐘 Postgres • 🎨 Tailwind • 🔔 SSE</span>
              </div>
            </div>
            {[
              {
                title: "Earn Points Instantly",
                icon: Zap,
                items: [
                  { l: "📄 Publish Post", r: "+50 pts", c: "text-amber-400" },
                  { l: "💬 Comment Reply", r: "+25 pts", c: "text-indigo-400" },
                  { l: "❤️ Reaction", r: "+10 pts", c: "text-rose-400" },
                  { l: "🚀 Share Link", r: "+30 pts", c: "text-emerald-400" },
                ]
              },
              {
                title: "Referrals & Quests",
                icon: Gift,
                items: [
                  { l: "🎁 Referral", r: "+200 pts", c: "text-amber-300 font-black" },
                  { l: "🔥 Daily Streak", r: "+15 pts", c: "text-orange-400" },
                  { l: "🎯 Quests", r: "+30-50 pts", c: "text-purple-400" },
                  { l: "🗨️ Group Chat", r: "capped", c: "text-blue-400" },
                ]
              },
              {
                title: "Live Platform",
                icon: Trophy,
                items: [
                  { l: "Notification Bell", r: "Realtime", c: "text-slate-300" },
                  { l: "Poll Bars", r: "Live Update", c: "text-slate-300" },
                  { l: "Flash Events", r: "2X • 3X", c: "text-rose-400" },
                  { l: "Presence", r: "Online pulse", c: "text-emerald-400" },
                ]
              }
            ].map((col)=>(
              <div key={col.title}>
                <h4 className="font-black text-white text-[13px] uppercase tracking-wider flex items-center gap-1.5 mb-3"><col.icon className="w-4 h-4 text-amber-400" />{col.title}</h4>
                <ul className="space-y-2 text-xs">
                  {col.items.map((it,i)=>(
                    <li key={i} className="flex items-center justify-between text-slate-400"><span>{it.l}</span><strong className={it.c}>{it.r}</strong></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-8 border-t border-slate-800/60 text-xs text-slate-500">
            <div>© {new Date().getFullYear()} VibePulse — Realtime Loyalty Engine • Posts • Quests • DMs • Analytics</div>
            <div className="flex items-center gap-5">
              <button onClick={()=>setActiveTab("chat")} className="hover:text-white font-bold transition flex items-center gap-1">Groups & DMs <ArrowUpRight className="w-3 h-3" /></button>
              <button onClick={()=>setActiveTab("quests")} className="hover:text-white font-bold transition flex items-center gap-1">Daily Quests <Target className="w-3 h-3" /></button>
              <button onClick={()=>setActiveTab("leaderboard")} className="hover:text-white font-bold transition flex items-center gap-1">Leaderboard <Trophy className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
