import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Card, Sticker } from './UI';
import { cn } from '../lib/utils';
import { Palette, Sparkles, Check, Lock, EyeOff } from 'lucide-react';

export function SkinSelector() {
  const { skin, allSkins, settings, userPrefs, isAdmin, setSkin, frankieMode, setFrankieMode } = useTheme();

  // If forced skin exists, users can't change it unless they are admins (for preview/testing)
  const isLocked = settings?.forcedSkinId && !isAdmin;

  if (isLocked) {
    return (
      <Card className="p-8 border-2 border-error/20 bg-error/5 space-y-4">
        <div className="flex items-center gap-2 text-error">
          <Lock className="w-5 h-5" />
          <h4 className="font-display text-xl uppercase">Theme Calibration Locked</h4>
        </div>
        <p className="font-serif italic text-sm opacity-60">
          The Central Bureau has enforced a global visual override. Personal calibration is currently offline.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Visual Calm Toggle */}
        {settings?.visualCalmAvailable && skin?.visualCalmSupported && (
           <div className={cn(
            "notice-card p-8 flex flex-col justify-between space-y-6 transition-all border-4",
            frankieMode ? "bg-paper border-on-surface shadow-[8px_8px_0px_#2D5A27]" : "bg-paper/50 border-on-surface/10"
          )}>
            <div className="space-y-2">
              <div className="bureau-tag bg-brand-orange text-white text-[10px] w-fit">ACCESSIBILITY_PROTOCOL</div>
              <h4 className="text-3xl font-display uppercase leading-none tracking-tighter">Visual Calm</h4>
              <p className="font-serif text-sm opacity-60 leading-relaxed italic">
                Deactivate high-fidelity environmental filters for immediate visual stabilization.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn(
                "font-mono text-[10px] uppercase tracking-widest",
                frankieMode ? "text-brand-green font-bold" : "opacity-40"
              )}>
                {frankieMode ? "PROTOCOL_HIJK_ACTIVE" : "PROTOCOL_STANDBY"}
              </span>
              <button 
                onClick={() => setFrankieMode(!frankieMode)}
                className={cn(
                  "w-16 h-8 rounded-none transition-all relative p-1 border-2 border-on-surface",
                  frankieMode ? "bg-on-surface text-paper" : "bg-on-surface/10"
                )}
              >
                <div className={cn(
                  "w-6 h-6 bg-paper transition-all",
                  frankieMode ? "translate-x-8" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>
        )}

        {/* Selected Skin Overview */}
        <div className="notice-card p-8 border-4 border-on-surface bg-paper flex flex-col justify-between relative overflow-hidden shadow-[8px_8px_0px_gray]">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <Palette className="w-32 h-32 rotate-12" />
           </div>
           <div className="space-y-2 relative z-10">
              <p className="micro-label opacity-40">ACTIVE_CALIBRATION</p>
              <h4 className="text-huge text-4xl font-display uppercase font-black text-on-surface tracking-tighter">{skin?.name}</h4>
              <div className="h-1 w-12 bg-on-surface mt-2" />
           </div>
           <div className="flex items-center gap-2 mt-4 relative z-10">
              <div className="bureau-tag bg-on-surface text-paper text-[10px]">STRAND_SYNCED</div>
              {skin?.isPublic === false && <div className="bureau-tag bg-brand-orange text-white text-[10px]">EXPERIMENTAL_BUILD</div>}
           </div>
        </div>
      </div>

      {/* Skin Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <p className="micro-label opacity-40">DNA_CATALOG</p>
          <div className="h-px flex-grow bg-on-surface/10" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {allSkins.map((s) => {
            const isActive = skin?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSkin(s.id)}
                className={cn(
                  "relative p-4 aspect-[3/4] border-4 transition-all flex flex-col items-center justify-center text-center group active:scale-95",
                  isActive 
                    ? "bg-on-surface text-paper border-on-surface shadow-xl" 
                    : "bg-paper border-on-surface/10 hover:border-on-surface hover:shadow-md"
                )}
              >
                {!s.isPublic && <Lock className="absolute top-2 right-2 w-3 h-3 opacity-40 shrink-0" />}
                {!s.isActive && <EyeOff className="absolute top-2 left-2 w-3 h-3 opacity-40 shrink-0" />}
                
                <div 
                  className={cn(
                    "w-12 h-12 border-2 border-white/20 mb-4 transition-transform group-hover:scale-110",
                    isActive && "shadow-lg scale-110 border-paper/40"
                  )} 
                  style={{ backgroundColor: s.themeTokens.primaryColor }}
                />
                
                <span className="font-display uppercase text-xs tracking-tighter leading-tight px-2 font-black">
                  {s.name}
                </span>

                {isActive && (
                  <div className="absolute -bottom-2 -right-2">
                    <div className="bg-paper text-on-surface p-1 border-2 border-on-surface">
                      <Check className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
