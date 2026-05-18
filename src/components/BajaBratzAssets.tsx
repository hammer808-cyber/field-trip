import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const Hibiscus = ({ className }: { className?: string }) => (
  <motion.div 
    initial={{ rotate: 0 }}
    animate={{ rotate: 360 }}
    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    className={cn("w-12 h-12 text-baja-pink opacity-30 pointer-events-none", className)}
  >
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,2L13.5,6.5L18,6L15.3,10.2L19.5,12.5L15.3,14.8L18,19L13.5,18.5L12,23L10.5,18.5L6,19L8.7,14.8L4.5,12.5L8.7,10.2L6,6L10.5,6.5L12,2Z" />
    </svg>
  </motion.div>
);

export const ChromeStar = ({ className }: { className?: string }) => (
  <motion.div
    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
    transition={{ duration: 3, repeat: Infinity }}
    className={cn("w-6 h-6 text-baja-chrome drop-shadow-lg", className)}
  >
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" />
    </svg>
  </motion.div>
);

export const GlossOverlay = ({ opacity = 0.5 }: { opacity?: number }) => (
  <div className="absolute inset-0 pointer-events-none baja-gloss" style={{ opacity }} />
);

export const BeachTag = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("inline-flex items-center gap-1 bg-white/80 border-2 border-baja-pink/30 px-3 py-1 rounded-full text-[10px] font-display text-baja-pink rotate-[-2deg]", className)}>
    <span className="w-1.5 h-1.5 rounded-full bg-baja-pink" />
    {children}
  </div>
);
