import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { HelpCircle, ChevronRight, Info, Home, Target, History, Compass, ArrowRight, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface DisplayPanelProps {
  title: string;
  value: string | number;
  label?: string;
  icon?: React.ElementType;
  className?: string;
  helpText?: string;
}

export function DisplayPanel({ title, value, label, icon: Icon, className, helpText }: DisplayPanelProps) {
  const { showHelpToast } = useApp();

  return (
    <div 
      onClick={() => helpText && showHelpToast(helpText)}
      className={cn(
        "sticker-card stat-card p-5 relative overflow-hidden select-none cursor-pointer group hover:-translate-y-1 active:translate-y-1 transition-all",
        !helpText && "pointer-events-none",
        className
      )}
    >
      <div className="relative z-10 flex justify-between items-start mb-1.5">
        <p className="text-[10px] font-mono font-black uppercase text-on-surface/40 tracking-widest">{title}</p>
        <div className="flex gap-1 opacity-20">
           <div className="w-1.5 h-1.5 rounded-full bg-on-surface" />
           <div className="w-1.5 h-1.5 rounded-full bg-on-surface" />
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-3">
        <div className="p-2 bg-white border-2 border-on-surface/10 rounded-xl shadow-sm rotate-[-3deg] group-hover:rotate-0 transition-transform">
           {Icon && <Icon className="w-5 h-5 text-on-surface shrink-0" />}
        </div>
        <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-on-surface mt-0.5 leading-none">
          {value}
        </h3>
      </div>
      {label && (
        <span className="relative z-10 inline-block mt-3 px-2.5 py-1 bg-on-surface text-white border-2 border-on-surface rounded-lg text-[9px] font-mono font-black uppercase tracking-wider leading-none shadow-[2px_2px_0px_rgba(0,0,0,0.15)]">
          {label}
        </span>
      )}
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'recovery';
  icon?: React.ElementType;
  className?: string;
  disabled?: boolean;
}

export function ActionButton({ label, onClick, variant = 'primary', icon: Icon, className, disabled }: ActionButtonProps) {
  const baseStyles = "relative w-full py-5 px-6 font-display text-xl sm:text-2xl font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-none flex items-center justify-center gap-3 scroll-smooth select-none cursor-pointer active:translate-y-1 active:translate-x-0.5";
  
  const variants = {
    primary: "sticker-card cta-card hover:-translate-y-0.5",
    secondary: "sticker-card bg-white text-on-surface hover:-translate-y-0.5",
    recovery: "sticker-card bg-brand-lime text-on-surface hover:-translate-y-0.5"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], className)}
    >
      <div className="absolute inset-x-0 top-0 h-[38%] bg-white/20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.4),transparent_40%)] pointer-events-none" />
      {Icon && <Icon className="w-6.5 h-6.5 stroke-[3] shrink-0" />}
      <span className="leading-none mt-0.5">{label}</span>
      <ArrowRight className="w-5.5 h-5.5 ml-auto opacity-50 shrink-0" />
    </button>
  );
}

export function RecoveryScreen({ message = "It looks like we took a wrong turn.", onAction }: { message?: string, onAction?: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md bg-white border-4 border-on-surface rounded-3xl shadow-[12px_12px_0px_black] p-8 text-center space-y-8">
        <div className="w-24 h-24 bg-brand-yellow border-4 border-on-surface rounded-full flex items-center justify-center mx-auto animate-bounce">
          <HelpCircle className="w-12 h-12 text-on-surface" />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-display font-black uppercase tracking-tight text-on-surface leading-tight">SYSTEM_RECOVERY</h2>
          <p className="font-serif italic text-lg text-on-surface/60 leading-relaxed">
            "{message}"
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <ActionButton 
            label="Back to Missions" 
            onClick={() => navigate('/deck')}
            variant="primary"
            icon={Target}
          />
          <ActionButton 
            label="Return Home" 
            onClick={() => navigate('/basecamp')}
            variant="secondary"
            icon={Home}
          />
          <ActionButton 
            label="Check Logbook" 
            onClick={() => navigate('/profile')}
            variant="secondary"
            icon={History}
          />
        </div>

        {onAction && (
          <button 
            onClick={onAction}
            className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-on-surface/40 hover:text-on-surface transition-colors"
          >
            Report Problem to Bureau
          </button>
        )}
      </div>
    </div>
  );
}
