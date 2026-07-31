"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Trophy, X, Zap } from "lucide-react";

export interface RewardToastData {
  id: number;
  pointsAwarded?: number;
  message: string;
  leveledUp?: boolean;
  newLevel?: string;
  type?: "success" | "error" | "info";
}

interface Props {
  toasts: RewardToastData[];
  onDismiss: (id: number) => void;
}

export const triggerConfetti = (leveledUp = false) => {
  if (typeof window !== "undefined") {
    if (leveledUp) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#ec4899", "#8b5cf6", "#3b82f6", "#eab308", "#22c55e"],
      });
    } else {
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.7 },
      });
    }
  }
};

export default function NotificationToast({ toasts, onDismiss }: Props) {
  useEffect(() => {
    if (toasts.length > 0) {
      const latest = toasts[toasts.length - 1];
      if (latest.leveledUp || (latest.pointsAwarded && latest.pointsAwarded >= 100)) {
        triggerConfetti(latest.leveledUp);
      }
      const timer = setTimeout(() => {
        onDismiss(latest.id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[70] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isLevelUp = toast.leveledUp;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.96, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] as any }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] border backdrop-blur-xl ${
                isError
                  ? "bg-rose-950/90 text-rose-100 border-rose-600/50"
                  : isLevelUp
                  ? "bg-gradient-to-br from-indigo-900 via-purple-900 to-rose-900 text-white border-purple-400/50 scale-[1.02]"
                  : "glass-strong text-white border-indigo-500/30"
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isError ? (
                  <div className="w-9 h-9 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                    <X className="w-5 h-5" />
                  </div>
                ) : isLevelUp ? (
                  <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6 }} className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-lg">
                    <Trophy className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-black tracking-wide uppercase">
                    {isError ? "Notice" : isLevelUp ? "🎉 TIER UPGRADE!" : toast.pointsAwarded && toast.pointsAwarded > 0 ? `+${toast.pointsAwarded} POINTS` : "Activity Recorded"}
                  </span>
                  {toast.pointsAwarded && toast.pointsAwarded > 0 && !isLevelUp && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 shadow">
                      <Zap className="w-3 h-3 mr-0.5 fill-current" />+{toast.pointsAwarded}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-200 leading-relaxed font-medium">{toast.message}</p>
                {toast.newLevel && (
                  <div className="mt-2 inline-block px-2.5 py-1 bg-white/15 rounded-lg text-xs font-bold tracking-wider text-amber-300 border border-amber-300/30">
                    New Rank: {toast.newLevel}
                  </div>
                )}
              </div>

              <button onClick={() => onDismiss(toast.id)} className="flex-shrink-0 text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
