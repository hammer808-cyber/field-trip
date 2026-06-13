import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Card } from './UI';
import { cn } from '../lib/utils';
import { Palette, Sparkles, Check, Lock, EyeOff } from 'lucide-react';

export function SkinSelector() {
  const { skin, allSkins, setSkin, frankieMode, setFrankieMode } = useTheme();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6">
        {/* Visual Calm Toggle */}
        <div className={cn(
          "notice-card p-8 flex flex-col justify-between space-y-6 transition-all border-4",
          frankieMode ? "bg-white border-on-surface shadow-[8px_8px_0px_#2D5A27]" : "bg-white/50 border-on-surface/10 shadow-none border-dashed"
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
              "font-mono text-[10px] uppercase tracking-widest leading-none",
              frankieMode ? "text-brand-green font-black" : "opacity-40"
            )}>
              {frankieMode ? "PROTOCOL_HIJK_ACTIVE" : "PROTOCOL_STANDBY"}
            </span>
            <button 
              onClick={() => setFrankieMode(!frankieMode)}
              className={cn(
                "w-16 h-8 rounded-full transition-all relative p-1 border-2 border-on-surface",
                frankieMode ? "bg-on-surface text-white" : "bg-on-surface/10"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full bg-white transition-all shadow-sm",
                frankieMode ? "translate-x-8" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>

        {/* Selected Skin Overview */}
        <div 
          className="notice-card p-8 border-4 border-on-surface flex flex-col justify-between relative overflow-hidden shadow-[8px_8px_0px_black]"
          style={{ backgroundColor: skin?.themeTokens.backgroundColor }}
        >
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Palette className="w-32 h-32 rotate-12" />
           </div>
           <div className="space-y-2 relative z-10">
              <p className="micro-label opacity-40">ACTIVE_VISUAL_KIT</p>
              <h4 className="text-huge text-5xl font-display uppercase font-black text-on-surface tracking-tighter leading-none">{skin?.name}</h4>
              <p className="text-xs font-serif italic text-on-surface/60 max-w-[200px] mt-2">{skin?.description}</p>
           </div>
           <div className="flex items-center gap-2 mt-6 relative z-10">
              <div className="bureau-tag bg-on-surface text-white text-[10px]">VERIFIED_BUILD</div>
              <button 
                onClick={() => window.location.href = '/collection'} 
                className="text-[10px] font-black uppercase tracking-widest text-brand-orange hover:underline ml-auto"
              >
                View Collection
              </button>
           </div>
        </div>

        {/* Kits Shelf */}
        <div className="space-y-4">
          <h5 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-on-surface/30 px-2 italic">Available Kits</h5>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {allSkins.map((s) => (
              <button
                key={s.id}
                onClick={() => setSkin(s.id)}
                className={cn(
                  "p-4 border-4 transition-all relative overflow-hidden group text-left h-full flex flex-col justify-between",
                  skin?.id === s.id 
                    ? "border-on-surface bg-white shadow-[4px_4px_0px_black] -translate-y-1" 
                    : "border-on-surface/10 bg-white/50 hover:border-on-surface/30 shadow-none grayscale opacity-60"
                )}
              >
                <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Palette className="w-8 h-8 rotate-12" />
                </div>
                
                <div className="space-y-1 relative z-10">
                  <div className="flex gap-1">
                    {s.previewColors?.map((c, i) => (
                      <div key={i} className="w-2 h-2 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="text-[10px] sm:text-xs font-display font-black uppercase leading-tight truncate">{s.name}</p>
                </div>

                <div className="flex items-center justify-between mt-4 relative z-10">
                   <span className="text-[7px] font-mono font-black uppercase tracking-tighter opacity-40">{s.rarity}</span>
                   {skin?.id === s.id && <Check className="w-3 h-3 text-brand-lime" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
