import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Card({ 
  children, 
  className, 
  title,
  variant = 'default'
}: { 
  children: React.ReactNode, 
  className?: string,
  title?: string,
  variant?: 'default' | 'high-voltage' | 'orange'
}) {
  const variants = {
    default: "shadow-[12px_12px_0px_0px_var(--color-on-surface)] hover:shadow-[16px_16px_0px_0px_var(--color-brand-lime)]",
    'high-voltage': "shadow-[12px_12px_0px_0px_var(--color-brand-lime)] hover:shadow-[16px_16px_0px_0px_var(--color-on-surface)]",
    orange: "shadow-[12px_12px_0px_0px_var(--color-brand-orange)] hover:shadow-[16px_16px_0px_0px_var(--color-on-surface)]"
  };

  return (
    <div className="flex flex-col h-full relative group transition-all duration-300">
      {title && (
        <div className="flex">
          <div className="bg-on-surface text-brand-lime px-6 py-2.5 text-[11px] uppercase font-bold tracking-wider italic border-2 border-on-surface relative z-10 -mb-[2px] ml-4 shadow-[4px_4px_0px_rgba(0,0,0,0.15)]">
            {title}
          </div>
        </div>
      )}
      <div className={cn(
        "bg-white border-2 border-on-surface relative p-8 transition-all duration-300",
        variants[variant],
        className
      )}>
        {/* Decorative corner shimmer */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-brand-lime/5 -skew-x-12 translate-x-8 -translate-y-8 pointer-events-none" />
        {children}
      </div>
    </div>
  );
}

export function Sticker({ 
  children, 
  color = 'lime',
  className 
}: { 
  children: React.ReactNode, 
  color?: 'lime' | 'orange' | 'magenta' | 'cyan' | 'purple' | 'white' | 'black' | 'mustard' | 'green' | 'blue',
  className?: string
}) {
  const colors = {
    lime: 'bg-brand-lime text-black border-2 border-on-surface shadow-[4px_4px_0px_black]',
    orange: 'bg-brand-orange text-white border-2 border-on-surface shadow-[4px_4px_0px_black]',
    magenta: 'bg-brand-magenta text-white border-2 border-on-surface shadow-[4px_4px_0px_black]',
    cyan: 'bg-brand-cyan text-black border-2 border-on-surface shadow-[4px_4px_0px_black]',
    purple: 'bg-brand-purple text-white border-2 border-on-surface shadow-[4px_4px_0px_black]',
    white: 'bg-white text-on-surface border-2 border-on-surface shadow-[4px_4px_0px_black]',
    black: 'bg-on-surface text-white border-2 border-brand-lime shadow-[3px_3px_0px_var(--color-brand-magenta)]',
    // Fallbacks for legacy
    mustard: 'bg-brand-lime text-black border-2 border-on-surface shadow-[4px_4px_0px_black]', 
    green: 'bg-on-surface text-brand-lime border-2 border-on-surface shadow-[4px_4px_0px_black]',
    blue: 'bg-brand-cyan text-black border-2 border-on-surface shadow-[4px_4px_0px_black]'
  };

  return (
    <div className={cn(
      "px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest inline-flex items-center justify-center transition-transform hover:scale-110",
      colors[color as keyof typeof colors] || colors.mustard,
      className
    )}>
      {children}
    </div>
  );
}
