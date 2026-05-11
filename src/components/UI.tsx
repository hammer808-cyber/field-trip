import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Card({ 
  children, 
  className, 
  title
}: { 
  children: React.ReactNode, 
  className?: string,
  title?: string
}) {
  return (
    <div className="flex flex-col">
      {title && <div className="file-tab">{title}</div>}
      <div className={cn(
        "notice-card p-6",
        className
      )}>
        {children}
      </div>
    </div>
  );
}

export function Sticker({ 
  children, 
  color = 'mustard',
  className 
}: { 
  children: React.ReactNode, 
  color?: 'mustard' | 'orange' | 'green' | 'white' | 'blue' | 'black',
  className?: string
}) {
  const colors = {
    mustard: 'bg-brand-mustard text-on-surface',
    orange: 'bg-brand-orange text-white',
    green: 'bg-brand-green text-white',
    white: 'bg-white text-on-surface border border-on-surface',
    blue: 'bg-brand-blue text-white',
    black: 'bg-on-surface text-paper'
  };

  return (
    <div className={cn(
      "bureau-tag",
      colors[color as keyof typeof colors] || colors.mustard,
      className
    )}>
      {children}
    </div>
  );
}
