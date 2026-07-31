"use client";
import { motion } from "framer-motion";
import { cardPop } from "./motion";
import { ReactNode } from "react";

export default function GlassCard({
  children,
  className = "",
  hover = true,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      variants={cardPop}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={`glass rounded-3xl shadow-[0_8px_32px_rgba(2,6,23,0.6)] ${hover ? "glow-border" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}
