import React from 'react';
import { cn } from '../lib/utils';

// --- Slippery Diamond Assets ---

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0l1 11h11l-11 1-1 12-1-12h-11l11-1z" />
    </svg>
  );
}

export function DiamondStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
      <path d="M50 0L55 45L100 50L55 55L50 100L45 55L0 50L45 45Z" />
    </svg>
  );
}

export function GlossOverlay({ opacity = 0.3 }: { opacity?: number }) {
  return (
    <div 
      className="absolute inset-0 pointer-events-none z-10" 
      style={{ 
        background: `linear-gradient(135deg, rgba(255,255,255,${opacity*1.5}) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,${opacity}) 100%)`,
        mixBlendMode: 'overlay'
      }} 
    />
  );
}

// --- Summer Heatwave Assets ---

export function SunFlare({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-full bg-white blur-[40px] opacity-20", className)} />
  );
}

export function PoolFloat({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 bg-heat-pink rounded-full blur-sm opacity-50" />
      <div className="relative w-full h-full border-[8px] border-heat-pink rounded-full flex items-center justify-center">
        <div className="w-1/2 h-1/2 border-2 border-white/30 rounded-full" />
      </div>
    </div>
  );
}

export function PalmTree({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C12 2 11 5 11 8C11 11 14 13 16 13C17 13 22 10 22 10C22 10 19 13 18 15C17 17 17 22 17 22C17 22 15 19 13 18C11 17 6 17 6 17C6 17 9 16 10 15C11 14 11 9 11 9C11 9 8 11 6 11C4 11 2 10 2 10C2 10 5 9 6 8C7 7 12 2 12 2Z" />
    </svg>
  );
}

export function BeachTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-heat-aqua text-heat-pink px-3 py-1 rounded-full font-display text-[10px] uppercase tracking-widest shadow-sm">
      {children}
    </div>
  );
}
