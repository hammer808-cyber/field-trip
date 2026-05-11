import { useState } from 'react';
import { useDev } from '../context/DevContext';
import { PersonaId, PERSONAS } from '../constants';
import { X, Settings, Calendar, Shield, Zap, User } from 'lucide-react';
import { cn } from '../lib/utils';

export function DevTools() {
  const { overrides, setOverrides, isDevMode } = useDev();
  const [isOpen, setIsOpen] = useState(false);

  if (!isDevMode) return null;

  const updateOverride = (key: string, value: any) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed bottom-20 right-6 z-[9999] pointer-events-none">
      <div className="pointer-events-auto relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-12 h-12 rounded-full bg-brand-orange text-white shadow-xl flex items-center justify-center transition-all hover:scale-110",
            isOpen && "rotate-90 bg-on-surface"
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Settings className="w-6 h-6" />}
        </button>

        {isOpen && (
          <div className="absolute bottom-16 right-0 w-80 bg-paper border-2 border-on-surface p-6 shadow-2xl rounded-2xl space-y-6 max-h-[70vh] overflow-y-auto">
            <h3 className="font-display text-xl uppercase tracking-widest text-brand-orange border-b border-on-surface/10 pb-2">
              BUREAU_DEBUG_PANEL
            </h3>

            {/* Date Simulation */}
            <div className="space-y-2">
              <label className="micro-label flex items-center gap-2">
                <Calendar className="w-3 h-3" /> SIMULATED_DATE
              </label>
              <select 
                className="w-full bg-paper-dark border border-on-surface/20 p-2 text-xs font-mono"
                value={overrides.date || ''}
                onChange={(e) => updateOverride('date', e.target.value || null)}
              >
                <option value="">System Default (Live)</option>
                <option value="2026-05-10T00:00:00Z">Pre-Season (May 10)</option>
                <option value="2026-05-20T00:00:00Z">Staging (May 20)</option>
                <option value="2026-05-26T00:00:00Z">Live Season (May 26)</option>
              </select>
            </div>

            {/* Progression */}
            <div className="space-y-4">
               <div className="space-y-2">
                 <label className="micro-label flex items-center gap-2">
                   <Zap className="w-3 h-3" /> SOLO_MISSIONS_COUNT
                 </label>
                 <input 
                   type="range" min="0" max="10" step="1"
                   className="w-full"
                   value={overrides.soloCount || 0}
                   onChange={(e) => updateOverride('soloCount', parseInt(e.target.value))}
                 />
                 <div className="flex justify-between text-[10px] font-mono opacity-40">
                   <span>0</span>
                   <span className="text-brand-orange font-bold text-xs">{overrides.soloCount || 0}/10</span>
                   <span>10</span>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="micro-label flex items-center gap-2">
                   <Shield className="w-3 h-3" /> POINTS_STANDINGS
                 </label>
                 <input 
                   type="number" 
                   className="w-full bg-paper-dark border border-on-surface/20 p-2 text-xs font-mono"
                   value={overrides.points || 0}
                   onChange={(e) => updateOverride('points', parseInt(e.target.value))}
                 />
               </div>
            </div>

            {/* Persona */}
            <div className="space-y-2">
              <label className="micro-label flex items-center gap-2">
                <User className="w-3 h-3" /> ACTIVE_PERSONA
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(PERSONAS).map(id => (
                  <button 
                    key={id}
                    onClick={() => updateOverride('persona', overrides.persona === id ? null : id)}
                    className={cn(
                      "text-[10px] p-2 border border-on-surface/10 uppercase font-mono text-left",
                      overrides.persona === id ? "bg-brand-orange text-white border-brand-orange" : "hover:bg-on-surface/5"
                    )}
                  >
                    {id.replace('-', '_')}
                  </button>
                ))}
              </div>
            </div>

            {/* Flags */}
            <div className="space-y-2 pt-2 border-t border-on-surface/10">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={overrides.isAdmin || false}
                  onChange={(e) => updateOverride('isAdmin', e.target.checked)}
                />
                <span className="micro-label">FORCE_ADMIN_PRIVILEGES</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={overrides.forceUnlocked}
                  onChange={(e) => updateOverride('forceUnlocked', e.target.checked)}
                />
                <span className="micro-label">BYPASS_LOCAL_LOCKS</span>
              </label>
            </div>

            <button 
              onClick={() => setOverrides({ date: null, points: null, soloCount: null, persona: null, isAdmin: null, forceUnlocked: false })}
              className="w-full py-2 bg-error/10 text-error text-[10px] font-mono uppercase tracking-widest hover:bg-error hover:text-white transition-colors"
            >
              RESET_ALL_OVERRIDES
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
