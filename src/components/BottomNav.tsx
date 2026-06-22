import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Users, Home, Target, LayoutGrid, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { canAccessFeature } from '../services/canonicalProgress';

export function BottomNav() {
  const location = useLocation();
  const { skin } = useTheme();
  const { isAdmin, canonicalProgress } = useApp();

  const [isNavActive, setIsNavActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    // Briefly light up the nav bar on route changes to guide user focus
    triggerTimedActive();
    window.scrollTo(0, 0); // Ensure scroll reset on every route change
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
  
  const navItems = [
    { icon: Home, label: 'BASECAMP', path: '/basecamp' },
    { icon: Target, label: 'MISSIONS', path: '/deck' },
    { icon: LayoutGrid, label: 'MEMORIES', path: '/collection?tab=crew_memories', special: true },
    { icon: Users, label: 'CREW', path: '/crew' },
    { icon: Trophy, label: 'STANDINGS', path: '/big-board' }
  ];

  return (
    <nav 
      onTouchStart={handleInteraction}
      onMouseDown={handleInteraction}
      className={cn(
        "fixed bottom-0 left-0 w-full z-100 px-3 pb-[env(safe-area-inset-bottom,0px)] h-[calc(80px+env(safe-area-inset-bottom,0px))] grid grid-cols-5 items-center md:max-w-xl md:left-1/2 md:-translate-x-1/2 md:bottom-6 md:rounded-[2.5rem] md:h-22",
        // Soft opacity transition with automatic full interaction overrides
        "transition-all duration-300 ease-in-out",
        isNavActive 
          ? "opacity-100" 
          : "opacity-85 hover:opacity-100 focus-within:opacity-100",
        isBaja ? "bg-white/80 backdrop-blur-md border-t-2 border-baja-pink md:border-b-2 md:shadow-xl" : 
        isDiamond ? "bg-black/80 backdrop-blur-xl border-t border-white/10 md:border-b md:shadow-[0_0_30px_rgba(255,255,255,0.15)]" :
        isHeat ? "bg-heat-pink/95 backdrop-blur-md border-t-4 border-white md:border-b-4 md:shadow-lg" :
        "bg-white border-t-[8px] border-on-surface shadow-[0_-12px_32px_rgba(0,0,0,0.15)] md:border-[8px] md:shadow-[14px_14px_0px_rgba(0,0,0,1)] rounded-t-[2.5rem] md:rounded-[2.5rem]"
      )}
    >
      {/* Scanline overlay & Paper Grain texture for the nav bar */}
      {!isBaja && !isDiamond && !isHeat && (
        <>
          <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] mix-blend-multiply rounded-t-[2.5rem] md:rounded-[2.5rem]" />
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_2px]" />
        </>
      )}
      {navItems.map((item) => {
        const itemPathname = item.path.split('?')[0];
        const isActive = location.pathname === itemPathname;
        let dataOnboarding = undefined;
        if (itemPathname === '/deck') dataOnboarding = 'deck-nav';
        else if (itemPathname === '/big-board') dataOnboarding = 'big-board-nav';
        else if (itemPathname === '/profile') dataOnboarding = 'profile-nav';
        else if (itemPathname === '/collection') dataOnboarding = 'dex-nav';
        
        if (item.special) {
          return (
            <Link
              key={item.path}
              to={item.path}
              data-onboarding={dataOnboarding}
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
                {/* Vintage stamp highlight shine */}
                {!isBaja && !isDiamond && !isHeat && (
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-xl" />
                )}
              </div>
              <div className={cn(
                "absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[9px] uppercase tracking-[0.2em] shadow-[3px_3px_0px_black] transition-all font-black border-2 border-on-surface whitespace-nowrap",
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

        const isLockedTab = (
          (itemPathname === '/crew' && !canAccessFeature(canonicalProgress, 'crew', { isAdmin })) ||
          (itemPathname === '/big-board' && !canAccessFeature(canonicalProgress, 'voting', { isAdmin }))
        );

        return (
          <Link
            key={item.path}
            to={item.path}
            data-onboarding={dataOnboarding}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 relative select-none",
              isActive 
                ? (isBaja ? "text-baja-pink scale-105" : isDiamond ? "text-white scale-105" : isHeat ? "text-white scale-105" : "text-on-surface") 
                : (isBaja ? "text-baja-pink/40 hover:text-baja-pink" : isDiamond ? "text-white/25 hover:text-white" : isHeat ? "text-white/40 hover:text-white" : "text-on-surface/50 hover:text-on-surface")
            )}
          >
            {isActive && !isBaja && !isDiamond && !isHeat ? (
              <div 
                className={cn(
                  "absolute inset-x-1 sm:inset-x-1.5 py-4 sm:py-5 flex flex-col items-center justify-center border-[4px] border-on-surface shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all",
                  item.path === '/basecamp' ? 'bg-brand-yellow text-on-surface rotate-[2deg]' :
                  item.path === '/deck' ? 'bg-brand-lime text-on-surface rotate-[-2deg]' :
                  item.path === '/big-board' ? 'bg-brand-cyan text-on-surface rotate-[1.5deg]' :
                  item.path === '/voting' ? 'bg-brand-magenta text-white rotate-[-1.5deg]' :
                  'bg-brand-cyan text-on-surface rotate-[2deg]'
                )}
              >
                <item.icon className="w-5 h-5 sm:w-[22px] sm:h-[22px] mb-0.5 stroke-[4px]" />
                <span className="font-display text-[7px] sm:text-[9px] uppercase tracking-tighter font-black italic leading-none truncate font-semibold">
                  {item.label}
                </span>
              </div>
            ) : (
              <>
                <div className="relative">
                  <item.icon className={cn(
                    "w-5 h-5 sm:w-6 sm:h-6 mb-1 transition-transform", 
                    isActive ? "stroke-[2.5px]" : "stroke-[2px] opacity-40 hover:scale-110"
                  )} />
                  {isLockedTab && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md z-40">
                      <Lock className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <span className={cn(
                  "font-mono text-[8px] sm:text-[10px] uppercase tracking-tighter font-bold transition-all flex items-center gap-0.5",
                  isActive && (
                    isBaja ? "bg-baja-pink text-white px-2 py-0.5 rounded-full" :
                    isDiamond ? "bg-white text-black px-2 py-0.5" :
                    isHeat ? "bg-white text-heat-pink px-2 py-0.5 rounded-full" :
                    ""
                  )
                )}>
                  {item.label}
                </span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
