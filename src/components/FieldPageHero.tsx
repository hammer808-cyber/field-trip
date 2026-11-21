import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { FieldHeroTabs } from './FieldHeroTabs';
import { ChevronLeft } from 'lucide-react';
import type { PlayerDepartment } from './player/PlayerPageShell';

export type FieldPageHeroTab = {
  id: string;
  label: React.ReactNode;
  locked?: boolean;
};

export type FieldPageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Optional season countdown line, rendered under the subtitle (Nov 17,
   * 2026: Basecamp shows the active season's countdown here, and nowhere
   * else — the same fact once, not stacked). */
  seasonLine?: string;
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
  variant?: "default" | "editorial";
  /** Tighter hero padding, Basecamp-scoped (Nov 17, 2026): the hero is
   *  shared by a dozen pages, so the trim is a prop, not a global change. */
  compact?: boolean;
  department?: PlayerDepartment;
  tone?: "paper" | "chrome";
  className?: string;
};

export function FieldPageHero({
  eyebrow,
  title,
  subtitle,
  seasonLine,
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
  variant = "default",
  compact = false,
  department,
  tone = "paper",
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

  const chrome = tone === 'chrome';

  if (variant === 'editorial') {
    return (
      <header className={cn(
        'ft-page-hero ft-page-hero--editorial relative overflow-hidden border-b-4 px-4 pt-7 sm:px-6 sm:pt-9',
        chrome
          ? 'border-[var(--skin-secondary)] bg-[#141414] text-white'
          : 'border-[var(--skin-border)] bg-[var(--skin-surface)] text-[var(--skin-text)]',
        department && `ft-page-hero--${department}`,
        className,
      )}>
        <div className="absolute inset-0 pointer-events-none opacity-[var(--skin-texture-opacity)] [background-image:var(--skin-background-texture)]" />
        {backgroundIcon && (
          <div className={cn(
            'absolute -right-8 top-1/2 -translate-y-1/2 rotate-6 pointer-events-none select-none',
            chrome ? 'text-white opacity-[0.08]' : 'text-[var(--skin-text)] opacity-[0.045]',
          )}>
            {React.cloneElement(backgroundIcon as any, {
              className: cn((backgroundIcon as any).props?.className, 'h-48 w-48 sm:h-56 sm:w-56'),
            })}
          </div>
        )}

        <div className="relative mx-auto max-w-6xl">
          <div className={cn(
            'flex min-h-[112px] flex-col justify-end gap-4 sm:min-h-[132px] sm:flex-row sm:items-end sm:justify-between sm:gap-5',
            compact ? 'pb-3 sm:pb-4' : 'pb-5 sm:pb-6',
          )}>
            <div className="min-w-0">
              {backLabel && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={cn(
                    'skin-button mb-4 flex min-h-11 items-center gap-2 border-2 px-4 py-2 font-mono text-xs font-black uppercase tracking-widest shadow-[3px_3px_0_var(--skin-primary)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)]',
                    chrome
                      ? 'border-white bg-white text-[#141414]'
                      : 'border-[var(--skin-border)] bg-[var(--skin-text)] text-[var(--skin-surface)]',
                  )}
                >
                  <ChevronLeft size={17} aria-hidden="true" />
                  {backLabel}
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 shadow-[2px_2px_0_var(--skin-border)]', chrome ? 'bg-brand-lime' : 'bg-[var(--skin-secondary)]')} />
                <p className={cn(
                  'font-mono text-xs font-black uppercase tracking-[0.24em]',
                  chrome ? 'text-white/70' : 'text-[var(--skin-text-muted)]',
                )}>{eyebrow}</p>
              </div>
              <h1 className={cn(
                'mt-2 break-words font-display text-display-hero font-black uppercase italic leading-[0.82] tracking-normal sm:text-[clamp(3.5rem,11vw,6rem)]',
                chrome ? 'text-white' : 'text-[var(--skin-text)]',
              )}>
                {title}
              </h1>
              {subtitle && (
                <p className={cn(
                  'mt-3 max-w-xl border-l-4 pl-3 text-sm leading-snug sm:text-base',
                  chrome ? 'border-brand-lime text-white/75' : 'border-[var(--skin-accent)] italic text-[var(--skin-text-muted)]',
                )}>
                  {subtitle}
                </p>
              )}
              {seasonLine && (
                <p className={cn(
                  'mt-2 font-mono text-xs font-black uppercase tracking-[0.22em]',
                  chrome ? 'text-brand-lime' : 'text-[var(--skin-text)]',
                )}>
                  {seasonLine}
                </p>
              )}
            </div>

            {infoCardLabel && (
              <div className={cn(
                'flex shrink-0 items-center gap-3 self-start border-2 px-3 py-2 shadow-[4px_4px_0_var(--skin-border)] sm:self-end',
                chrome ? 'border-brand-lime bg-black text-white' : 'border-[var(--skin-border)] bg-[var(--skin-surface-muted)]',
              )}>
                <span className={cn('h-3 w-3 border-2 border-[var(--skin-border)]', accentColors[infoCardAccent])} aria-hidden="true" />
                <div>
                  <p className={cn('font-mono text-xs font-black uppercase tracking-[0.2em]', chrome ? 'text-white/60' : 'text-[var(--skin-text-muted)]')}>{infoCardLabel}</p>
                  <div className={cn(
                    'mt-0.5 font-display text-lg font-black uppercase italic leading-none tracking-normal',
                    chrome ? 'text-white' : 'text-[var(--skin-text)]',
                  )}>{infoCardValue}</div>
                  {infoCardSubtext && <p className={cn('mt-1 font-mono text-xs font-bold uppercase tracking-wider', chrome ? 'text-white/55' : 'text-[var(--skin-text-muted)]')}>{infoCardSubtext}</p>}
                </div>
              </div>
            )}
          </div>

          <FieldHeroTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
            variant="editorial"
            chrome={chrome}
            title={title}
          />
        </div>
      </header>
    );
  }

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
                <span className="text-xs font-black uppercase tracking-[0.2em] font-mono">{backLabel}</span>
              </button>
            </div>
          )}

          <div className={cn("space-y-4", backLabel ? "pt-14" : "")}>
            <div className="flex items-center gap-3">
              <div className="h-6 w-1.5 bg-on-surface shadow-[2px_2px_0px_black]" />
              <p className="text-on-surface font-mono text-xs font-black uppercase tracking-[0.4em]">{eyebrow}</p>
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
              {seasonLine && (
                <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-brand-orange">
                  {seasonLine}
                </p>
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
                   <span className="bg-brand-cyan text-on-surface border-2 border-on-surface text-xs font-black px-2.5 py-0.5 uppercase tracking-widest flex items-center gap-1.5 shadow-[2px_2px_0px_black] cursor-default">
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
                   <p className="text-xs font-mono font-black uppercase tracking-widest text-[#4A473E] leading-relaxed">
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
                       <span className="bg-on-surface text-white text-xs font-black px-1.5 py-0.5 uppercase italic tracking-tight rounded-none border border-white/20">
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
      <FieldHeroTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        variant="card"
        title={title}
      />
    </header>
  );
}
