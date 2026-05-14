import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export function SignalLossBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsReconnecting(true);
      setTimeout(() => {
        setIsOnline(true);
        setIsReconnecting(false);
      }, 2000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(!isOnline || isReconnecting) && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-[9999] p-2 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-widest",
            isReconnecting ? "bg-brand-orange text-white" : "bg-error text-white"
          )}
        >
          {isReconnecting ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Restoring Bureau Uplink...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Signal Loss Mode: Your entry is saved on this device and will submit when your connection comes back.</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
