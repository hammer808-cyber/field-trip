import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Home, Target, LayoutGrid, Lock, Vote, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { canAccessFeature } from '../services/canonicalProgress';
import { usePlayerGuidance } from '../hooks/usePlayerGuidance';
import './BottomNav.css';

export function BottomNav() {
  const location = useLocation();
  const { skin } = useTheme();
  const { isAdmin, canonicalProgress } = useApp();
  const guidance = usePlayerGuidance();

  const [isNavActive, setIsNavActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerTimedActive = () => {
    setIsNavActive(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsNavActive(false);
    }, 2500);
  };

  useEffect(() => {
    triggerTimedActive();
    window.scrollTo(0, 0);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname]);

  const handleInteraction = () => {
    triggerTimedActive();
  };

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';
  const dexUnlocked = canAccessFeature(canonicalProgress, 'memories', { isAdmin });
  const votingUnlocked = canAccessFeature(canonicalProgress, 'voting', { isAdmin });
  const attentionPath = guidance.navigationTarget === 'missions'
    ? '/missions'
    : guidance.navigationTarget === 'voting'
      ? '/voting'
      : guidance.navigationTarget === 'dex'
        ? '/dex'
        : guidance.navigationTarget === 'basecamp'
          ? '/basecamp'
          : null;

  const navItems: Array<{
    icon: LucideIcon;
    label: string;
    path: string;
    special?: boolean;
    locked?: boolean;
  }> = [
    { icon: Home, label: 'BASECAMP', path: '/basecamp' },
    { icon: Target, label: 'MISSIONS', path: '/missions' },
    { icon: LayoutGrid, label: 'DEX', path: '/dex', locked: !dexUnlocked },
    { icon: Vote, label: 'VOTING', path: '/voting', locked: !votingUnlocked },
    { icon: Trophy, label: 'BIG BOARD', path: '/big-board' }
  ];

  return (
    <nav
      onTouchStart={handleInteraction}
      onMouseDown={handleInteraction}
      className={cn(
        "skin-navigation ft-bottom-nav fixed bottom-0 left-0 w-full z-100 px-2 sm:px-3 pb-[env(safe-area-inset-bottom,0px)] h-[calc(84px+env(safe-area-inset-bottom,0px))] grid grid-cols-5 items-center md:max-w-xl md:left-1/2 md:-translate-x-1/2 md:bottom-6 md:rounded-[2.5rem] md:h-22",
        "transition-all duration-300 ease-in-out",
        isNavActive
          ? "opacity-100"
          : "opacity-90 hover:opacity-100 focus-within:opacity-100",
        isBaja ? "bg-white/80 backdrop-blur-md border-t-2 border-baja-pink md:border-b-2 md:shadow-xl" :
        isDiamond ? "bg-black/80 backdrop-blur-xl border-t border-white/10 md:border-b md:shadow-[0_0_30px_rgba(255,255,255,0.15)]" :
        isHeat ? "bg-heat-pink/95 backdrop-blur-md border-t-4 border-white md:border-b-4 md:shadow-lg" :
        "bg-white border-t-[8px] border-on-surface shadow-[0_-12px_32px_rgba(0,0,0,0.15)] md:border-[8px] md:shadow-[14px_14px_0px_rgba(0,0,0,1)] rounded-t-[2.5rem] md:rounded-[2.5rem]"
      )}
    >
      {!isBaja && !isDiamond && !isHeat && (
        <>
          <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] mix-blend-multiply rounded-t-[2.5rem] md:rounded-[2.5rem]" />
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_2px]" />
        </>
      )}
      {navItems.map((item) => {
        const itemPathname = item.path.split('?')[0];
        const isActive = location.pathname === itemPathname || (itemPathname !== '/basecamp' && location.pathname.startsWith(`${itemPathname}/`));
        const isLockedTab = !!item.locked || (itemPathname === '/big-board' && !canAccessFeature(canonicalProgress, 'voting', { isAdmin }));
        const isHighlightedDestination = attentionPath === itemPathname && !isActive && !isLockedTab;
        const showDexSpecial = itemPathname === '/dex' && dexUnlocked && (isActive || isHighlightedDestination);
        let dataOnboarding = undefined;
        if (itemPathname === '/missions') dataOnboarding = 'deck-nav';
        else if (itemPathname === '/big-board') dataOnboarding = 'big-board-nav';
        else if (itemPathname === '/voting') dataOnboarding = 'voting-nav';
        else if (itemPathname === '/profile') dataOnboarding = 'profile-nav';
        else if (itemPathname === '/dex') dataOnboarding = 'dex-nav';

        if (showDexSpecial) {
          return (
            <Link
              key={item.path}
              to={item.path}
              data-onboarding={dataOnboarding}
              data-nav-item={itemPathname}
              data-nav-special="true"
              data-nav-state={isActive ? 'current' : 'attention'}
              data-active={isActive ? 'true' : 'false'}
              aria-label={isActive ? `${item.label}, you are here` : `${item.label}, go here next`}
              className="relative -translate-y-6 group flex justify-center z-40"
            >
              <div className={cn(
                "w-16 h-16 flex items-center justify-center border-4 flex-col shadow-2xl active:scale-90 transition-all group-hover:scale-110",
                isBaja ? "bg-white border-baja-pink text-baja-pink rounded-[1.25rem]" :
                isDiamond ? "bg-black border-white text-white rounded-none shadow-[0_0_20px_rgba(255,255,255,0.3)]" :
                isHeat ? "bg-white border-white text-heat-pink rounded-full shadow-md" :
                "bg-brand-orange text-white border-[4px] border-on-surface rounded-[1.5rem] shadow-[6px_6px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-0.5 hover:rotate-[-2deg]"
              )}>
                <item.icon className={cn("w-8 h-8 stroke-[3]", !isBaja && !isDiamond && !isHeat && "text-white")} />
                {!isBaja && !isDiamond && !isHeat && (
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-xl" />
                )}
              </div>
              <div className={cn(
                "absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] uppercase tracking-[0.2em] shadow-[3px_3px_0px_black] transition-all font-black border-2 border-on-surface whitespace-nowrap",
                isBaja ? "bg-baja-aqua text-white rounded-full font-display" :
                isDiamond ? "bg-white text-black font-mono skew-x-0" :
                isHeat ? "bg-heat-yellow text-heat-pink rounded-full font-display skew-x-0" :
                "bg-brand-cyan text-on-surface italic rotate-[1.5deg]"
              )}>
                {item.label}
              </div>
            </Link>
          );
        }

        const navState = isLockedTab ? 'locked' : isActive ? 'current' : isHighlightedDestination ? 'attention' : 'normal';

        return (
          <Link
            key={item.path}
            to={item.path}
            data-onboarding={dataOnboarding}
            data-nav-item={itemPathname}
            data-active={isActive ? 'true' : 'false'}
            data-nav-locked={isLockedTab ? 'true' : 'false'}
            data-nav-state={navState}
            aria-current={isActive ? 'page' : undefined}
            aria-label={isLockedTab ? `${item.label}, locked` : isHighlightedDestination ? `${item.label}, go here next` : isActive ? `${item.label}, you are here` : item.label}
            data-nav-attention={isHighlightedDestination ? 'true' : 'false'}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 relative select-none min-h-11",
              isActive
                ? (isBaja ? "text-baja-pink scale-105" : isDiamond ? "text-white scale-105" : isHeat ? "text-white scale-105" : "text-on-surface")
                : isLockedTab
                  ? (isBaja ? "text-baja-pink/55" : isDiamond ? "text-white/45" : isHeat ? "text-white/55" : "text-on-surface/55")
                : isHighlightedDestination
                  ? (isBaja ? "text-baja-pink" : isDiamond ? "text-white" : isHeat ? "text-white" : "text-on-surface")
                : (isBaja ? "text-baja-pink/55 hover:text-baja-pink" : isDiamond ? "text-white/45 hover:text-white" : isHeat ? "text-white/55 hover:text-white" : "text-on-surface/60 hover:text-on-surface")
            )}
          >
            {isActive && !isBaja && !isDiamond && !isHeat ? (
              <div
                className={cn(
                  "absolute inset-x-1 sm:inset-x-1.5 py-3 sm:py-4 flex flex-col items-center justify-center border-[4px] border-on-surface shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all",
                  item.path === '/basecamp' ? 'bg-brand-yellow text-on-surface rotate-[2deg]' :
                  item.path === '/missions' ? 'bg-brand-lime text-on-surface rotate-[-2deg]' :
                  item.path === '/big-board' ? 'bg-brand-cyan text-on-surface rotate-[1.5deg]' :
                  item.path === '/voting' ? 'bg-brand-magenta text-white rotate-[-1.5deg]' :
                  'bg-brand-cyan text-on-surface rotate-[2deg]'
                )}
              >
                <item.icon className="w-5 h-5 sm:w-[22px] sm:h-[22px] mb-0.5 stroke-[4px]" />
                <span className="font-display text-[10px] sm:text-[11px] uppercase tracking-tighter font-black italic leading-none truncate">
                  {item.label}
                </span>
                <span className="mt-0.5 font-mono text-[7px] font-black uppercase tracking-widest opacity-70">Here</span>
              </div>
            ) : (
              <>
                <div className="relative">
                  <item.icon className={cn(
                    "w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-transform",
                    isActive ? "stroke-[2.5px]" : isHighlightedDestination ? "stroke-[3px]" : isLockedTab ? "stroke-[2px]" : "stroke-[2px]"
                  )} />
                  {isLockedTab && (
                    <div className="absolute -top-1 -right-1 bg-on-surface text-white rounded-full p-0.5 shadow-md z-40 border border-white/40" aria-hidden="true">
                      <Lock className="w-2.5 h-2.5" />
                    </div>
                  )}
                  {isHighlightedDestination && (
                    <span className="ft-nav-now-dot" aria-hidden="true" />
                  )}
                </div>
                <span className={cn(
                  "font-mono text-[10px] sm:text-[11px] uppercase tracking-tighter font-bold transition-all flex items-center gap-0.5 leading-none",
                  isActive && (
                    isBaja ? "bg-baja-pink text-white px-2 py-0.5 rounded-full" :
                    isDiamond ? "bg-white text-black px-2 py-0.5" :
                    isHeat ? "bg-white text-heat-pink px-2 py-0.5 rounded-full" :
                    ""
                  ),
                  isHighlightedDestination && !isBaja && !isDiamond && !isHeat && "text-on-surface"
                )}>
                  {item.label}
                </span>
                {isHighlightedDestination && (
                  <span className="ft-nav-now-label">Now</span>
                )}
                {isLockedTab && (
                  <span className="mt-0.5 font-mono text-[8px] font-black uppercase tracking-widest opacity-80">Locked</span>
                )}
                {isActive && (isBaja || isDiamond || isHeat) && (
                  <span className="mt-0.5 font-mono text-[8px] font-black uppercase tracking-widest">Here</span>
                )}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
