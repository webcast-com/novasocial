"use client";
import { motion } from "framer-motion";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-800/60 ${className}`}>
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        }}
      />
    </div>
  );
}

export function PostSkeleton() {
  return (
    <div className="glass rounded-3xl p-6 sm:p-7 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
      <Skeleton className="w-3/4 h-6" />
      <Skeleton className="w-full h-20" />
      <div className="flex gap-2">
        <Skeleton className="w-20 h-8 rounded-xl" />
        <Skeleton className="w-20 h-8 rounded-xl" />
        <Skeleton className="w-20 h-8 rounded-xl" />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {[0,1,2].map(i=>(
        <div key={i} className="glass rounded-3xl p-6">
          <Skeleton className="w-24 h-3 mb-4" />
          <Skeleton className="w-20 h-8" />
        </div>
      ))}
    </div>
  );
}
