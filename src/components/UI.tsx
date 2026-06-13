import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Card({ 
  children, 
  className, 
  title,
  variant = 'default',
  onClick
}: { 
  children: React.ReactNode, 
  className?: string,
  title?: string,
  variant?: 'default' | 'high-voltage' | 'orange' | 'lime' | 'magenta' | 'cyan' | 'purple' | 'yellow' | 'journal' | 'flat' | 'boost' | 'paper' | 'ticket' | 'sticker' | 'id' | 'receipt' | 'photo' | 'admin',
  onClick?: () => void
}) {
  const variants = {
    default: "sticker-card",
    'high-voltage': "sticker-card shadow-[0_8px_0_var(--field-black),0_14px_22px_var(--field-shadow),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-3px_0_rgba(0,0,0,0.08)] bg-brand-lime/10",
    orange: "sticker-card cta-card",
    lime: "sticker-card bg-brand-lime",
    magenta: "sticker-card bg-brand-magenta text-white",
    cyan: "sticker-card bg-brand-cyan",
    purple: "sticker-card pulse-card",
    yellow: "sticker-card bg-brand-yellow",
    boost: "sticker-card boost-card",
    journal: "journal-card rounded-2xl",
    flat: "border-2 border-on-surface bg-white shadow-none",
    paper: "field-card--paper",
    ticket: "field-card--ticket",
    sticker: "field-card--sticker",
    id: "field-card--id",
    receipt: "field-card--receipt",
    photo: "field-card--photo",
    admin: "field-card--admin"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex flex-col h-full relative group transition-all duration-500",
        onClick && "cursor-pointer"
      )}
    >
      {title && (
        <div className="flex">
          <div className="status-chip approved -mb-[12px] ml-6 z-20 relative rotate-[-2deg] shadow-md group-hover:rotate-0 transition-transform">
            {title}
          </div>
        </div>
      )}
      <div className={cn(
        "transition-all duration-300 relative",
        variants[variant as keyof typeof variants] || variants.default,
        className
      )}>
        {/* Subtle inner shadow for depth */}
        <div className="absolute inset-0 shadow-[inset_2px_2px_10px_rgba(0,0,0,0.02)] pointer-events-none" />
        
        <div className={cn(
          "relative z-10",
          variant === 'flat' ? 'p-4' : 'p-6 sm:p-8'
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Sticker component removed - migrated to FieldBadge system

/* ==========================================================================
   FIELDTRIP DESIGN SYSTEM COMPONENT LIBRARY - TACTILE OBJECTS
   ========================================================================== */

export function FieldCard({ 
  children, 
  className, 
  variant = 'paper', 
  onClick,
  id
}: { 
  children: React.ReactNode, 
  className?: string, 
  variant?: 'paper' | 'ticket' | 'sticker' | 'id' | 'receipt' | 'photo' | 'admin' | 'default' | 'urgent' | 'success',
  onClick?: () => void,
  id?: string
}) {
  const classes = {
    default: "field-card",
    paper: "field-card--paper",
    ticket: "field-card--ticket",
    sticker: "field-card--sticker",
    id: "field-card--id",
    receipt: "field-card--receipt pb-0 overflow-visible",
    photo: "field-card--photo",
    admin: "field-card--admin",
    urgent: "field-card--urgent",
    success: "field-card--success"
  };

  return (
    <div 
      id={id}
      onClick={onClick}
      className={cn(
        classes[variant] || classes.paper,
        onClick && "cursor-pointer active:translate-y-[2px] transition-all",
        className
      )}
    >
      {variant === 'id' && (
        <div className="absolute top-0 left-0 right-0 h-4 bg-brand-cyan border-b-[3.5px] border-on-surface z-10" />
      )}
      {children}
      {variant === 'receipt' && <div className="field-card--receipt-jagged absolute bottom-[-11px] left-0 right-0 h-3" />}
    </div>
  );
}

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';
export type BadgeVariant = 'default' | 'glossy' | 'sticker' | 'stamp' | 'tab' | 'label' | 'pill' | 'ticket' | 'seal' | 'starburst' | 'clipped';
export type BadgeColor = 'lime' | 'orange' | 'magenta' | 'cyan' | 'purple' | 'yellow' | 'teal' | 'white' | 'charcoal' | 'paper' | 'blue' | 'black' | 'green' | 'red' | 'pink';

export function FieldBadge({ 
  children, 
  className, 
  variant = 'default',
  size = 'md',
  color = 'lime',
  rotation = 0,
  interactive = false
}: { 
  children: React.ReactNode, 
  className?: string, 
  variant?: BadgeVariant,
  size?: BadgeSize,
  color?: BadgeColor,
  rotation?: number,
  interactive?: boolean
}) {
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[8px] border-[1.5px] shadow-[1.5px_1.5px_0px_black]",
    sm: "px-2.5 py-1 text-[10px] border-[2.5px] shadow-[2.5px_2.5px_0px_black]",
    md: "px-4 py-2 text-xs border-[3.5px] shadow-[4px_4px_0px_black]",
    lg: "px-6 py-3 text-lg border-[4.5px] shadow-[6px_6px_0px_black]"
  };

  const colorClasses = {
    lime: "bg-brand-lime text-on-surface",
    orange: "bg-brand-orange text-white",
    magenta: "bg-brand-magenta text-white",
    cyan: "bg-brand-cyan text-on-surface",
    purple: "bg-brand-purple text-white",
    yellow: "bg-brand-yellow text-on-surface",
    teal: "bg-brand-teal text-white",
    white: "bg-white text-on-surface",
    charcoal: "bg-on-surface text-white",
    paper: "bg-[#F2EEE8] text-on-surface",
    blue: "bg-brand-blue text-white",
    black: "bg-black text-white",
    green: "bg-green-500 text-white",
    red: "bg-red-500 text-white",
    pink: "bg-brand-magenta text-white"
  };

  const variantClasses = {
    default: "field-badge",
    glossy: "field-badge--glossy",
    sticker: "field-card--sticker rounded-sm",
    stamp: "field-stamp rotate-[-4deg]",
    tab: "field-tab clip-path-tab",
    label: "field-label",
    pill: "rounded-full px-4",
    ticket: "field-card--ticket px-2 py-1",
    seal: "rounded-full w-12 h-12 flex items-center justify-center border-4 border-double border-on-surface shadow-[4px_4px_0px_black] text-[8px] font-black text-center p-1",
    starburst: "starburst-clip w-14 h-14 flex items-center justify-center border-2 border-on-surface shadow-[4px_4px_0px_black] text-[9px] font-black text-center p-1",
    clipped: "clip-path-clipped px-3 py-1 border-2 border-on-surface shadow-[3px_3px_0px_black] text-[10px] font-bold uppercase"
  };

  // Custom shadow for charcoal color to use lime shadow
  const isCharcoal = color === 'charcoal';
  const shadowColorClass = isCharcoal ? "shadow-black/20" : ""; // Defaults to black shadow usually

  return (
    <div 
      style={{ transform: `rotate(${rotation}deg)` }}
      className={cn(
        "inline-flex items-center justify-center font-display uppercase tracking-widest font-black select-none transition-all",
        variantClasses[variant],
        sizeClasses[size],
        colorClasses[color],
        interactive && "hover:scale-105 active:scale-95 cursor-pointer",
        isCharcoal && (size === 'xs' ? "shadow-[1.5px_1.5px_0px_var(--color-brand-lime)]" : 
                        size === 'sm' ? "shadow-[2.5px_2.5px_0px_var(--color-brand-lime)]" : 
                        size === 'md' ? "shadow-[4px_4px_0px_var(--color-brand-lime)]" : 
                        "shadow-[6px_6px_0px_var(--color-brand-lime)]"),
        className
      )}
    >
      {variant === 'glossy' && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/45 to-transparent pointer-events-none" />
      )}
      {variant === 'sticker' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
          <div className={cn(
            "absolute inset-y-0 left-[-100%] w-1/3 bg-white/20 skew-x-[-20deg] transition-all duration-700 pointer-events-none",
            interactive && "group-hover:left-[150%]"
          )} />
        </>
      )}
      <span className="relative z-10">{children}</span>
    </div>
  );
}

export function FieldLabel({ 
  children, 
  className 
}: { 
  children: React.ReactNode, 
  className?: string 
}) {
  return (
    <span className={cn("field-label", className)}>
      {children}
    </span>
  );
}

export function FieldTape({ 
  className,
  rotation = -6 
}: { 
  className?: string,
  rotation?: number
}) {
  return (
    <div 
      style={{ transform: `rotate(${rotation}deg)` }}
      className={cn("field-tape", className)} 
    />
  );
}

export function FieldStamp({ 
  children, 
  className,
  colorClass = 'border-brand-orange text-brand-orange'
}: { 
  children: React.ReactNode, 
  className?: string,
  colorClass?: string
}) {
  return (
    <div className={cn("field-stamp bg-white/95 rotate-[-5deg]", colorClass, className)}>
      {children}
    </div>
  );
}

export function FieldTab({ 
  children, 
  isActive, 
  className,
  onClick 
}: { 
  children: React.ReactNode, 
  isActive: boolean, 
  className?: string,
  onClick?: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "field-tab",
        isActive && "field-tab--active",
        className
      )}
    >
      {children}
    </button>
  );
}

export function FieldCTA({ 
  children, 
  className,
  onClick,
  disabled
}: { 
  children: React.ReactNode, 
  className?: string,
  onClick?: () => void,
  disabled?: boolean
}) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "field-cta w-full",
        disabled && "opacity-50 grayscale cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

