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
      "fixed bottom-0 left-0 w-full z-50 px-4 pb-safe h-24 grid grid-cols-5 items-center transition-all",
      isBaja ? "bg-white/80 backdrop-blur-md border-t-2 border-baja-pink" : 
      isDiamond ? "bg-black/60 backdrop-blur-xl border-t border-white/10" :
      isHeat ? "bg-heat-pink/90 backdrop-blur-md border-t-4 border-white" :
      "bg-white border-t-4 border-on-surface shadow-[0_-8px_0px_rgba(0,0,0,0.02)]"
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
              className="relative -translate-y-8 group flex justify-center"
            >
              <div className={cn(
                "w-20 h-20 bg-white border-4 flex items-center justify-center shadow-2xl active:scale-95 transition-all group-hover:scale-105",
                isBaja ? "border-baja-pink text-baja-pink rounded-[1.5rem]" : 
                isDiamond ? "border-white text-black rounded-none shadow-[0_0_30px_rgba(255,255,255,0.4)]" :
                isHeat ? "border-white text-heat-pink rounded-full shadow-lg" :
                "border-on-surface text-on-surface rounded-none shadow-[12px_12px_0px_0px_var(--color-brand-orange)] active:shadow-none translate-y-0 active:translate-y-1"
              )}>
                <item.icon className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className={cn(
                "absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] shadow-[4px_4px_0px_black] transition-all font-black border-2 border-on-surface",
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
              "flex flex-col items-center justify-center flex-1 transition-all",
              isActive 
                ? (isBaja ? "text-baja-pink scale-110" : isDiamond ? "text-white scale-110" : isHeat ? "text-white scale-110" : "text-on-surface scale-110") 
                : (isBaja ? "text-baja-pink/30 hover:text-baja-pink" : isDiamond ? "text-white/20 hover:text-white" : isHeat ? "text-white/40 hover:text-white" : "text-black/30 hover:text-black")
            )}
          >
            <item.icon className={cn("w-7 h-7 mb-1 transition-transform", isActive ? "stroke-[3px] -translate-y-1" : "stroke-[2px] opacity-40")} />
            <span className={cn(
              "font-mono text-[10px] uppercase tracking-wider font-bold transition-all",
              isActive && (
                isBaja ? "bg-baja-pink text-white px-2.5 py-1 rounded-full" :
                isDiamond ? "bg-white text-black px-2.5 py-1" :
                isHeat ? "bg-white text-heat-pink px-2.5 py-1 rounded-full" :
                "bg-brand-lime text-black px-4 py-1.5 rounded-none border-2 border-on-surface shadow-[4px_4px_0px_black] italic font-black"
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
