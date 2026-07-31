"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  Shield,
  Gift,
  LogIn,
  UserPlus,
  ArrowRight,
  Loader2,
  Lock,
  AtSign,
  UserCircle2,
  Ticket,
} from "lucide-react";
import type { User } from "@/types";

interface Props {
  onAuthenticated: (user: User) => void;
  defaultReferralCode?: string;
}

export default function AuthGate({ onAuthenticated, defaultReferralCode = "" }: Props) {
  const [mode, setMode] = useState<"login" | "register">(defaultReferralCode ? "register" : "login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(defaultReferralCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { username: username.trim(), password }
          : {
              name: name.trim(),
              username: username.trim(),
              password,
              referralCode: referralCode.trim() || undefined,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Authentication failed. Please try again.");
        return;
      }
      onAuthenticated(data.user);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-slate-950 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all";

  return (
    <div className="flex items-center justify-center py-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass-strong rounded-3xl p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.45)] relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-56 h-56 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6 relative">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 18 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 text-white font-black text-2xl mx-auto flex items-center justify-center shadow-xl shadow-rose-500/25 mb-3"
          >
            VP
          </motion.div>
          <h2 className="text-[22px] font-black text-white tracking-tight">
            {mode === "login" ? "Welcome back to VibePulse" : "Claim your VibePulse account"}
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            {mode === "login"
              ? "Sign in to earn points, streaks and rewards"
              : "Real accounts, real points — the leaderboard is waiting"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-950/70 border border-slate-800 mb-5 relative">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`relative py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                mode === m ? "text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {mode === m && (
                <motion.span
                  layoutId="authgate-tab"
                  className="absolute inset-0 bg-indigo-600/90 rounded-xl shadow-[0_4px_16px_rgba(99,102,241,0.35)]"
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                {m === "login" ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {m === "login" ? "Sign In" : "Join"}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {mode === "register" && referralCode.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mb-4 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 rounded-2xl p-3.5 text-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950 shadow mb-1">
                  <Gift className="w-3 h-3 stroke-[3]" /> Invitation Recognized
                </span>
                <p className="text-xs text-indigo-200 font-bold mt-1">
                  Code <strong className="text-amber-300 font-mono">{referralCode.trim()}</strong> — your friend
                  earns <strong>+200 pts</strong> and you get a <strong>+50 pts</strong> welcome bonus!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-3.5 relative">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-rose-950/90 border border-rose-600/70 text-rose-200 text-xs font-semibold"
            >
              ⚠️ {error}
            </motion.div>
          )}

          {mode === "register" && (
            <div className="relative">
              <UserCircle2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name (e.g. Alex Mercer)"
                maxLength={80}
                className={inputCls}
              />
            </div>
          )}

          <div className="relative">
            <AtSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              maxLength={20}
              className={inputCls}
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Password (min 8 characters)" : "Password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 8 : 1}
              className={inputCls}
            />
          </div>

          {mode === "register" && (
            <div className="relative">
              <Ticket className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Referral code (optional)"
                maxLength={32}
                className={inputCls}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-rose-500 hover:opacity-95 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === "login" ? "Sign In & Resume Streak" : "Create Account & Start Earning"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800/80 relative">
          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            Demo accounts after seeding: <code className="text-indigo-300">elena_tech</code> •{" "}
            <code className="text-indigo-300">marcus_dev</code> • <code className="text-rose-300">admin_maya</code>{" "}
            — password <code className="text-amber-300">password123</code>
          </p>
          <p className="text-[10px] text-slate-600 text-center mt-2 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" /> Earn points for posts, comments, reactions, quests & referrals
          </p>
        </div>
      </motion.div>
    </div>
  );
}
