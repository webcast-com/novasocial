"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift, ArrowRight, Lock } from "lucide-react";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password) {
      setError("Please fill out all required fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Register a REAL account: password is hashed server-side, a session
      // cookie is issued, and the referral bounty is attributed atomically.
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password,
          referralCode: refCode || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 1600);
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-indigo-600 selection:text-white font-sans">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 text-white font-black text-2xl mx-auto flex items-center justify-center shadow-xl shadow-rose-500/20 mb-3">
            VP
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Join VibePulse Community</h1>
          <p className="text-xs text-slate-400 mt-1">Gamified Loyalty & Activity Tracking Platform</p>
        </div>

        {refCode && (
          <div className="mb-6 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 rounded-2xl p-4 text-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950 shadow mb-1">
              <Gift className="w-3.5 h-3.5 stroke-[3]" /> Invitation Recognized
            </span>
            <p className="text-sm text-indigo-200 font-bold mt-1">
              You were invited with code: <strong className="text-amber-300 underline font-mono">{refCode}</strong>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Joining awards your friend <strong>+200 loyalty points</strong> — and you start with a <strong className="text-emerald-300">+50 pts welcome bonus</strong>!
            </p>
          </div>
        )}

        {success ? (
          <div className="text-center py-8 space-y-3 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto">
              🎉
            </div>
            <h3 className="text-xl font-black text-white">Welcome to VibePulse!</h3>
            <p className="text-xs text-slate-300">Account created & secured{refCode ? ", referral bounty attributed" : ""}. Signing you in...</p>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-600 text-rose-200 text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Your Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Mercer"
                maxLength={80}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Choose Username / Handle</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 font-bold text-sm">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_dev"
                  maxLength={20}
                  autoComplete="username"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Create Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Stored as a salted scrypt hash — never in plain text.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-rose-500 hover:opacity-95 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{loading ? "Creating Account..." : "Accept Invite & Launch App"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-800 text-center space-y-2">
          <p className="text-[11px] text-slate-500">Already have an account? You can sign in on the dashboard.</p>
          <button
            onClick={() => router.push("/")}
            className="text-xs text-slate-400 hover:text-white font-bold underline transition-colors"
          >
            Return to main dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Loading invitation...</div>}>
      <JoinContent />
    </Suspense>
  );
}
