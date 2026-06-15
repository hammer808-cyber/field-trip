import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface DevelopingPolaroidProps {
  imageUrl: string;
  isDeveloping?: boolean;
  onRetake?: () => void;
  statusText?: string;
  subText?: string;
}

export const DevelopingPolaroid: React.FC<DevelopingPolaroidProps> = ({ 
  imageUrl, 
  isDeveloping = true,
  onRetake,
  statusText = "Capturing Evidence...",
  subText = "Chemical stabilization in progress."
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="flex flex-col items-center gap-6"
    >
      <div className="bg-white p-4 pb-12 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-black/5 rotate-[-2deg] relative">
        <div className="w-72 h-72 bg-[#1a1a1a] relative overflow-hidden">
          {imageUrl && (
            <motion.img 
              src={imageUrl} 
              alt="Developing..." 
              initial={isDeveloping ? { filter: 'brightness(2) contrast(0.5) blur(10px)', opacity: 0 } : {}}
              animate={isDeveloping ? { filter: 'brightness(1) contrast(1) blur(0px)', opacity: 1 } : {}}
              transition={{ duration: 4, ease: "easeOut" }}
              className="w-full h-full object-contain"
            />
          )}
          {/* Chemical Shimmer Overlay */}
          {isDeveloping && (
            <motion.div 
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 3.5, delay: 0.5 }}
              className="absolute inset-0 bg-white"
            />
          )}
        </div>
        <div className="mt-4 font-mono text-[10px] font-black uppercase tracking-[0.2em] opacity-20 text-center animate-pulse">
          {isDeveloping ? "UPLINK_DEVELOPING..." : "SIGNAL_READY"}
        </div>
        
        {onRetake && (
          <button 
            onClick={onRetake}
            className="absolute -top-3 -right-3 bg-white text-on-surface w-8 h-8 rounded-full border-2 border-on-surface flex items-center justify-center shadow-[4px_4px_0px_black] hover:bg-brand-orange transition-colors z-10"
            title="Retake"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
      
      <div className="text-center space-y-2">
        <h2 className="font-display text-2xl font-black uppercase italic tracking-tight text-on-surface">
          {statusText}
        </h2>
        <p className="text-xs font-serif italic text-on-surface/40">
          {subText}
        </p>
      </div>
    </motion.div>
  );
};
