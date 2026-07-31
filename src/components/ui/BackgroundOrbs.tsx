"use client";
import { motion } from "framer-motion";

export default function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="absolute -top-[280px] -left-[200px] w-[720px] h-[720px] rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgba(99,102,241,0.18), transparent 70%)",
          filter: "blur(12px)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.9, scale: 1 }}
        transition={{ duration: 1.4, delay: 0.2 }}
        className="absolute -top-[220px] -right-[180px] w-[620px] h-[620px] rounded-full animate-floatSlow"
        style={{
          background: "radial-gradient(closest-side, rgba(168,85,247,0.16), transparent 70%)",
          filter: "blur(14px)",
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 1.2, delay: 0.4 }}
        className="absolute top-[48%] -left-[120px] w-[520px] h-[520px] rounded-full animate-float"
        style={{
          background: "radial-gradient(closest-side, rgba(16,185,129,0.10), transparent 70%)",
          filter: "blur(18px)",
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 1.2, delay: 0.5 }}
        className="absolute bottom-[-220px] right-[10%] w-[760px] h-[560px] rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgba(244,63,94,0.12), rgba(99,102,241,0.06) 60%, transparent 78%)",
          filter: "blur(16px)",
        }}
      />
      {/* subtle grid */}
      <div className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
        }}
      />
    </div>
  );
}
