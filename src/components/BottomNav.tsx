import { Link, useLocation } from 'react-router-dom';
import { Layers, History, Camera, Trophy, Settings, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export function BottomNav() {
  const location = useLocation();
  const { skin } = useTheme();

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';
  
  const navItems = [
    { icon: Layers, label: 'ORDERS', path: '/deck' },
    { icon: History, label: 'RECORD', path: '/journal' },
    { icon: Camera, label: 'SECURE', path: '/capture', special: true },
    { icon: Users, label: 'CREW', path: '/crew' },
    { icon: Trophy, label: 'BOARD', path: '/frontlines' },
    { icon: Settings, label: 'BIO', path: '/profile' }
  ];

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 w-full z-50 px-4 pb-safe h-24 flex justify-around items-center transition-all",
      isBaja ? "bg-white/80 backdrop-blur-md border-t-2 border-baja-pink" : 
      isDiamond ? "bg-black/60 backdrop-blur-xl border-t border-white/10" :
      isHeat ? "bg-heat-pink/90 backdrop-blur-md border-t-4 border-white" :
      "bg-paper border-t-4 border-on-surface"
    )}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        
        if (item.special) {
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative -translate-y-8 group"
            >
              <div className={cn(
                "w-20 h-20 bg-white border-4 flex items-center justify-center shadow-2xl active:scale-95 transition-all group-hover:rotate-12",
                isBaja ? "border-baja-pink text-baja-pink rounded-[1.5rem]" : 
                isDiamond ? "border-white text-black rounded-none shadow-[0_0_30px_rgba(255,255,255,0.4)]" :
                isHeat ? "border-white text-heat-pink rounded-full shadow-lg" :
                "border-on-surface text-on-surface rounded-none shadow-[8px_8px_0px_black]"
              )}>
                <item.icon className="w-10 h-10" />
              </div>
              <div className={cn(
                "absolute -bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] uppercase tracking-tighter shadow-lg transition-all font-display",
                isBaja ? "bg-baja-aqua text-white rounded-full font-display" : 
                isDiamond ? "bg-white text-black font-mono skew-x-0" :
                isHeat ? "bg-heat-yellow text-heat-pink rounded-full font-display skew-x-0" :
                "bg-brand-orange text-white"
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
                : (isBaja ? "text-baja-pink/30 hover:text-baja-pink" : isDiamond ? "text-white/20 hover:text-white" : isHeat ? "text-white/40 hover:text-white" : "text-on-surface/20 hover:text-on-surface")
            )}
          >
            <item.icon className={cn("w-7 h-7 mb-1", isActive && "stroke-[3px]")} />
            <span className={cn(
              "font-display text-[10px] uppercase tracking-tighter",
              isActive && (
                isBaja ? "bg-baja-pink text-white px-2 py-0.5 rounded-full" :
                isDiamond ? "bg-white text-black px-2 py-0.5" :
                isHeat ? "bg-white text-heat-pink px-2 py-0.5 rounded-full" :
                "bg-on-surface text-paper px-2 py-0.5 rounded-none"
              )
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
