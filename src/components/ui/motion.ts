"use client";

export const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as any }
  }
};

export const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.08 }
  }
};

export const staggerFast = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 }
  }
};

export const cardPop = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.16,1,0.3,1] as any }
  }
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.16,1,0.3,1] as any }
  }
};

export const slideInRight = {
  hidden: { opacity: 0, x: 18 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.38, ease: [0.16,1,0.3,1] as any }
  }
};
