import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper relative overflow-hidden">
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.03)_50%)] bg-[length:100%_2px] opacity-20" />
      
      <div className="flex flex-col items-center gap-8 relative z-10">
        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-on-surface/5 border-t-brand-orange rounded-full" 
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-brand-orange/10 rounded-full animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-2 text-center px-6">
          <div className="flex items-center gap-2 justify-center">
             <div className="w-1.5 h-1.5 bg-brand-orange animate-pulse rounded-full" />
             <p className="font-mono text-[10px] font-black tracking-[0.3em] uppercase text-on-surface">Initializing Systems</p>
             <div className="w-1.5 h-1.5 bg-brand-orange animate-pulse rounded-full" />
          </div>
          <p className="font-serif italic text-xs tracking-widest opacity-40">Connecting to secure field proxy...</p>
        </div>
        
        {/* HUD Corner Accents */}
        <div className="absolute -top-12 -left-12 w-6 h-6 border-t-2 border-l-2 border-on-surface/10" />
        <div className="absolute -bottom-12 -right-12 w-6 h-6 border-b-2 border-r-2 border-on-surface/10" />
      </div>
    </div>
  );
}
