import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ChevronLeft } from 'lucide-react';

export type FieldPageHeroTab = {
  id: string;
  label: string;
  locked?: boolean;
};

export type FieldPageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backLabel?: string;
  backTo?: string;
  onBack?: () => void;
  backgroundIcon?: React.ReactNode;
  infoCardLabel?: string;
  infoCardValue?: React.ReactNode;
  infoCardSubtext?: string;
  infoCardAccent?: "orange" | "lime" | "pink" | "blue" | "purple";
  infoCardVariant?: "card" | "sticker";
  tabs?: FieldPageHeroTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
};

export function FieldPageHero({
  eyebrow,
  title,
  subtitle,
  backLabel,
  backTo,
  onBack,
  backgroundIcon,
  infoCardLabel,
  infoCardValue,
  infoCardSubtext,
  infoCardAccent = "orange",
  infoCardVariant = "card",
  tabs = [],
  activeTab,
  onTabChange,
  className
}: FieldPageHeroProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo);
    }
  };

  const accentColors = {
    orange: 'bg-brand-orange text-white',
    lime: 'bg-brand-lime text-on-surface',
    pink: 'bg-brand-magenta text-white',
    blue: 'bg-brand-cyan text-on-surface',
    purple: 'bg-brand-purple text-white'
  };

  return (
    <header className={cn(
      "relative overflow-hidden pt-12 md:pt-16 px-6 sm:px-8 border-b-[10px] border-on-surface bg-[#FAF8F5] ft-paper-texture",
      className
    )}>
      {/* Background Wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-cyan/10 to-transparent pointer-events-none" />
      
      {/* Background Icon */}
      {backgroundIcon && (
        <div className="absolute right-[-2rem] top-12 opacity-[0.08] rotate-12 scale-150 pointer-events-none select-none text-on-surface">
           {React.cloneElement(backgroundIcon as any, { 
             className: cn(
               (backgroundIcon as any).props?.className,
               "w-[24rem] h-[24rem]"
             )
           })}
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="min-h-[220px] pb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8 relative">
          
          {/* Back Button */}
          {backLabel && (
            <div className="absolute top-0 left-0">
               <button 
                onClick={handleBack}
                className="group flex items-center gap-2 bg-on-surface text-brand-lime px-5 py-2 rounded-none transition-all border-[3px] border-on-surface hover:bg-brand-orange hover:text-white active:scale-95 shadow-[6px_6px_0px_black]"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform stroke-[3]" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] font-mono">{backLabel}</span>
              </button>
            </div>
          )}

          <div className={cn("space-y-4", backLabel ? "pt-14" : "")}>
            <div className="flex items-center gap-3">
              <div className="h-6 w-1.5 bg-on-surface shadow-[2px_2px_0px_black]" />
              <p className="text-on-surface font-mono text-[10px] font-black uppercase tracking-[0.4em]">{eyebrow}</p>
            </div>
            
            <div className="space-y-4">
              <h1 className="font-display text-[clamp(4rem,15vw,6rem)] md:text-9xl font-black italic uppercase tracking-tighter text-on-surface leading-[0.8] drop-shadow-[8px_8px_0px_white] break-words">
                {title}
              </h1>
              {subtitle && (
                <div className="relative inline-block">
                  <p className="font-serif italic text-xl sm:text-2xl text-on-surface/60 leading-tight max-w-sm relative z-10">
                    “{subtitle}”
                  </p>
                  <div className="absolute -bottom-1 left-0 w-full h-2 bg-brand-cyan/20 -rotate-1 z-0" />
                </div>
              )}
            </div>
          </div>

          {/* Info Card / Sticker */}
          {infoCardLabel && (
            infoCardVariant === 'card' ? (
              <div className={cn(
                "bg-white border-[4px] border-on-surface p-6 shadow-[10px_10px_0px_black] -rotate-2 hover:rotate-0 transition-transform cursor-default min-w-[200px] relative mt-4 md:mt-0 flex flex-col items-start gap-1"
              )}>
                {/* Corner Accent Sticker */}
                <div className={cn(
                  "absolute -top-3 -left-3 w-10 h-10 border-[3.5px] border-on-surface rotate-12 flex items-center justify-center p-1 shadow-[4px_4px_0px_black]",
                  accentColors[infoCardAccent]
                )}>
                   <div className="w-full h-full border-2 border-white/20" />
                </div>

                <div className="flex items-center justify-between w-full mb-2 select-none pointer-events-none">
                   <span className="bg-brand-cyan text-on-surface border-2 border-on-surface text-[9px] font-black px-2.5 py-0.5 uppercase tracking-widest flex items-center gap-1.5 shadow-[2px_2px_0px_black] cursor-default">
                      <span className="w-1.5 h-1.5 bg-on-surface rounded-full block animate-pulse"></span>
                      {infoCardLabel}
                   </span>
                </div>
                
                <div className={cn(
                  (typeof infoCardValue === 'string' || typeof infoCardValue === 'number')
                    ? "text-5xl font-display font-black italic tracking-tighter text-on-surface leading-none mt-1"
                    : "w-full text-left"
                )}>
                  {infoCardValue}
                </div>
                
                <div className="mt-3 pt-3 border-t-[3px] border-dashed border-on-surface/20 w-full text-left">
                   <p className="text-[10px] font-mono font-black uppercase tracking-widest text-[#4A473E] leading-relaxed">
                     {infoCardSubtext}
                   </p>
                </div>
              </div>
            ) : (
              <div className="relative mt-4 md:mt-0 flex flex-col items-center justify-center group shrink-0">
                 {/* Outer Glow / Pulse for discoveries */}
                 <div className="absolute inset-0 bg-brand-orange/20 rounded-full blur-xl animate-pulse group-hover:scale-110 transition-transform" />
                 
                 {/* Main Circular Sticker Badge (80px) */}
                 <div className="w-[85px] h-[85px] rounded-full bg-brand-orange border-[4px] border-on-surface shadow-[8px_8px_0px_black] relative z-10 flex flex-col items-center justify-center overflow-hidden rotate-[-2deg] group-hover:rotate-0 transition-all cursor-default">
                    {/* Inner Paper Texture Ring */}
                    <div className="absolute inset-1.5 rounded-full border-[2.5px] border-dashed border-white/30" />
                    
                    {/* Count Display */}
                    <div className="font-display text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-[2.5px_2.5px_0px_black] z-20 leading-none">
                       {infoCardValue}
                    </div>
                    
                    {/* Label */}
                    <div className="mt-1 z-20">
                       <span className="bg-on-surface text-white text-[7px] font-black px-1.5 py-0.5 uppercase italic tracking-tight rounded-none border border-white/20">
                          {infoCardLabel}
                       </span>
                    </div>
                    
                    {/* Tiny Mono Tag */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 w-full text-center">
                       <p className="text-[5px] font-mono font-black uppercase text-on-surface/60 tracking-tighter leading-none px-2 truncate">
                          {infoCardSubtext}
                       </p>
                    </div>

                    {/* Gloss Reflection */}
                    <div className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] bg-white/25 rotate-[35deg] pointer-events-none" />
                 </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="max-w-6xl mx-auto flex gap-1 pt-px overflow-x-auto no-scrollbar scroll-smooth translate-y-2 relative z-20">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => !tab.locked && onTabChange?.(tab.id)}
              disabled={tab.locked}
              className={cn(
                "px-5 py-4 sm:px-10 sm:py-6 transition-all relative shrink-0 border-t-[4px] border-x-[4px] rounded-t-3xl font-display text-xl sm:text-3xl font-black uppercase italic tracking-tight leading-none cursor-pointer border-on-surface select-none flex items-center gap-2",
                activeTab === tab.id 
                  ? "bg-white text-on-surface z-30 shadow-[0_-8px_0px_white,6px_0px_0px_black]" 
                  : "bg-[#E8E2D2] text-on-surface/40 hover:bg-white/50 hover:text-on-surface/80"
              )}
            >
              {tab.label}
              {tab.locked && <div className="p-0.5 bg-on-surface/10 rounded">🔒</div>}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
