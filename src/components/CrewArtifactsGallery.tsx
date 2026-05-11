import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CrewArtifact } from '../types/artifacts';
import { Card } from './UI';
import * as LucideIcons from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { X, Calendar, User, Info, Link as LinkIcon, Sparkles } from 'lucide-react';

interface ArtifactGalleryProps {
  artifacts: CrewArtifact[];
}

export const CrewArtifactsGallery: React.FC<ArtifactGalleryProps> = ({ artifacts }) => {
  const { skin } = useTheme();
  const [selectedArtifact, setSelectedArtifact] = useState<CrewArtifact | null>(null);

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="micro-label opacity-40">COLLECTIVE_ARCHIVE</p>
          <h2 className="font-display text-3xl uppercase tracking-tighter">Crew Artifacts</h2>
        </div>
        <div className="text-right">
          <p className="micro-label opacity-40">TOTAL_RELICS</p>
          <p className="font-mono text-xl">{artifacts.length}</p>
        </div>
      </div>

      {artifacts.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 opacity-50 bg-transparent">
          <p className="font-serif italic text-sm">The shelf is empty. No artifacts have been recovered from field activity yet.</p>
          <p className="micro-label mt-4 opacity-40 font-mono">STANDBY FOR NOTABLE MOMENTS</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {artifacts.map((art, index) => {
            const IconComponent = (LucideIcons as any)[art.icon] || LucideIcons.Package;
            return (
              <motion.div
                key={art.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setSelectedArtifact(art)}
                className="cursor-pointer group"
              >
                <div className={cn(
                  "aspect-square flex flex-col items-center justify-center p-4 relative transition-all duration-500",
                  "border-2 border-on-surface/10 bg-on-surface/5 rounded-3xl",
                  isBaja ? "group-hover:border-baja-pink group-hover:shadow-[8px_8px_0px_#ff007f] group-hover:rotate-1" : 
                  isDiamond ? "group-hover:border-white/40 group-hover:bg-white/10" :
                  isHeat ? "group-hover:border-heat-pink group-hover:shadow-[8px_8px_0px_orange]" :
                  "group-hover:border-brand-orange group-hover:bg-brand-orange/5"
                )}>
                  <div className={cn(
                    "p-3 rounded-2xl mb-3",
                    art.rarity === 'legendary' ? "bg-brand-orange text-white" : 
                    art.rarity === 'classified' ? "bg-on-surface text-paper" : 
                    "bg-on-surface/10 text-on-surface/60"
                  )}>
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <p className="font-display text-[10px] uppercase text-center tracking-tighter leading-none px-2 line-clamp-2">
                    {art.title}
                  </p>
                  
                  {art.rarity === 'legendary' && (
                    <Sparkles className="w-3 h-3 text-brand-orange absolute top-3 right-3 animate-pulse" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedArtifact && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "relative w-full max-w-sm p-8 space-y-6 overflow-hidden",
                isBaja ? "bg-white border-4 border-baja-pink rounded-[3rem] shadow-[12px_12px_0px_#40e0d0]" :
                isDiamond ? "bg-white/5 border border-white/20 rounded-none backdrop-blur-2xl" :
                isHeat ? "bg-white border-4 border-heat-pink rounded-[3rem] shadow-[12px_12px_0px_rgba(255,140,0,0.4)]" :
                "bg-paper border-2 border-on-surface shadow-[10px_10px_0px_black]"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="micro-label opacity-40 uppercase">
                    {selectedArtifact.rarity} // {selectedArtifact.artifactType}
                  </p>
                  <h3 className="font-display text-3xl uppercase tracking-tighter leading-tight">
                    {selectedArtifact.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedArtifact(null)}
                  className="p-2 opacity-40 hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={cn(
                "w-full aspect-square flex items-center justify-center rounded-3xl",
                isBaja ? "bg-baja-sand" : "bg-on-surface/5"
              )}>
                {(LucideIcons as any)[selectedArtifact.icon] && React.createElement((LucideIcons as any)[selectedArtifact.icon], {
                  className: cn(
                    "w-24 h-24",
                    isBaja ? "text-baja-pink" : isDiamond ? "text-white" : "text-brand-orange"
                  )
                })}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="micro-label opacity-40">ORIGIN_DATA</p>
                  <p className="text-sm italic font-serif leading-relaxed px-1">
                    "{selectedArtifact.description}"
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="micro-label opacity-40">OBSERVATION</p>
                  <div className="bg-brand-orange/5 border-l-2 border-brand-orange p-3">
                    <p className="text-[11px] font-mono leading-relaxed opacity-80">
                      // {selectedArtifact.flavorCaption}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-on-surface/10 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="micro-label opacity-40 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> RECOVERED
                    </p>
                    <p className="font-mono text-[9px]">
                      {new Date(selectedArtifact.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="micro-label opacity-40 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" /> AGENT
                    </p>
                    <p className="font-mono text-[9px] truncate">
                      {selectedArtifact.earnedByUserName || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedArtifact(null)}
                className={cn(
                  "w-full py-4 font-display uppercase tracking-widest text-sm transition-all active:scale-95",
                  isBaja ? "bg-baja-pink text-white rounded-full shadow-[4px_4px_0px_#40e0d0]" :
                  "bg-on-surface text-paper shadow-[6px_6px_0px_gray]"
                )}
              >
                Close Archive
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
