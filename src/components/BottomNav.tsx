import { Link, useLocation } from 'react-router-dom';
import { Layers, History, Camera, Trophy, Settings, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export function BottomNav() {
  const location = useLocation();
  const { skin, frankieMode, fc } = useTheme();

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';
  
  const navItems = [
    { icon: Layers, label: fc('DECK', 'DECK'), path: '/deck' },
    { icon: Trophy, label: fc('BIG BOARD', 'SCORES'), path: '/big-board' },
    { icon: Camera, label: fc('PHOTO', 'CAPTURE'), path: '/capture', special: true },
    { icon: Users, label: fc('VOTING', 'VOTE'), path: '/voting' },
    { icon: Settings, label: fc('PROFILE', 'PROFILE'), path: '/profile' }
  ];

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 w-full z-50 px-4 pb-safe h-18 grid grid-cols-5 items-center transition-all md:max-w-xl md:left-1/2 md:-translate-x-1/2 md:bottom-2 md:rounded-2xl md:border-x-4 md:shadow-2xl",
      isBaja ? "bg-white/80 backdrop-blur-md border-t-2 border-baja-pink md:border-b-2" : 
      isDiamond ? "bg-black/80 backdrop-blur-xl border-t border-white/10 md:border-b" :
      isHeat ? "bg-heat-pink/95 backdrop-blur-md border-t-4 border-white md:border-b-4" :
      "bg-white border-t-4 border-on-surface shadow-[0_-8px_0px_rgba(0,0,0,0.01)]"
    )}>
      {/* Scanline overlay for the nav bar */}
      {!isBaja && !isDiamond && !isHeat && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_2px]" />
      )}
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        
        if (item.special) {
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative -translate-y-5 group flex justify-center"
            >
              <div className={cn(
                "w-15 h-15 bg-white border-4 flex items-center justify-center shadow-xl active:scale-95 transition-all group-hover:scale-105",
                isBaja ? "border-baja-pink text-baja-pink rounded-[1.25rem]" : 
                isDiamond ? "border-white text-black rounded-none shadow-[0_0_20px_rgba(255,255,255,0.3)]" :
                isHeat ? "border-white text-heat-pink rounded-full shadow-md" :
                "border-on-surface text-on-surface rounded-none shadow-[6px_6px_0px_0px_var(--color-brand-orange)] active:shadow-none translate-y-0 active:translate-y-1"
              )}>
                <item.icon className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div className={cn(
                "absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 text-[8px] uppercase tracking-[0.2em] shadow-[2px_2px_0px_black] transition-all font-black border-2 border-on-surface",
                isBaja ? "bg-baja-aqua text-white rounded-full font-display" : 
                isDiamond ? "bg-white text-black font-mono skew-x-0" :
                isHeat ? "bg-heat-yellow text-heat-pink rounded-full font-display skew-x-0" :
                "bg-brand-orange text-white italic"
              )}>
                {item.label}
              </div>
            </Link>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center flex-1 transition-all py-1",
              isActive 
                ? (isBaja ? "text-baja-pink scale-105" : isDiamond ? "text-white scale-105" : isHeat ? "text-white scale-105" : "text-on-surface scale-105") 
                : (isBaja ? "text-baja-pink/30 hover:text-baja-pink" : isDiamond ? "text-white/20 hover:text-white" : isHeat ? "text-white/40 hover:text-white" : "text-on-surface/40 hover:text-on-surface")
            )}
          >
            <item.icon className={cn("w-5 h-5 mb-1 transition-transform", isActive ? "stroke-[2.5px] -translate-y-0.5" : "stroke-[2px] opacity-40")} />
            <span className={cn(
              "font-mono text-[9px] uppercase tracking-wider font-bold transition-all",
              isActive && (
                isBaja ? "bg-baja-pink text-white px-2 py-0.5 rounded-full" :
                isDiamond ? "bg-white text-black px-2 py-0.5" :
                isHeat ? "bg-white text-heat-pink px-2 py-0.5 rounded-full" :
                "bg-brand-lime text-black px-2.5 py-0.5 rounded-none border-2 border-on-surface shadow-[2px_2px_0px_black] italic font-black"
              )
            )}>
              {!isActive && item.label.slice(0, 3)}
              {isActive && item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
