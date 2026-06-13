import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Bug, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';

export function AppCheckDiagnosticBanner() {
  const { isAdmin } = useApp();
  const [initError, setInitError] = useState<string | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check global variables set during firebase initialization
    const global = window as any;
    if (global.FIREBASE_APPCHECK_INIT_ERROR) {
      setInitError(global.FIREBASE_APPCHECK_INIT_ERROR);
    }
    
    // Check if debug mode was active
    if (global.FIREBASE_APPCHECK_DEBUG_TOKEN) {
      setIsDebugMode(true);
    } else if (import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG === 'true') {
        setIsDebugMode(true);
    }
  }, []);

  // Normal users must never see App Check debug status.
  // Gate it behind import.meta.env.DEV && isAdmin.
  const isDev = import.meta.env.DEV || import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG === 'true';
  const shouldShow = isDev && isAdmin && (initError || isDebugMode) && isVisible;

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-[9998] md:left-auto md:right-4 md:w-80"
      >
        <div className={cn(
          "p-4 border-2 shadow-[4px_4px_0px_black] rounded-xl flex flex-col gap-3",
          initError ? "bg-error/10 border-error text-error" : "bg-brand-lime border-on-surface text-on-surface"
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {initError ? <ShieldAlert className="w-5 h-5" /> : (isDebugMode ? <Bug className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />)}
              <h4 className="font-display font-black uppercase italic tracking-tighter text-sm">
                App_Check_Diagnostics
              </h4>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-[10px] font-mono hover:underline"
            >
              [DISMISS]
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-mono leading-tight">
              {initError ? (
                <>
                  <span className="font-black">INITIALIZATION_ERROR:</span> {initError}
                  <br />
                  <span className="opacity-70 mt-1 block italic">Check your VITE_RECAPTCHA_SITE_KEY or Firestore Security Rules.</span>
                </>
              ) : (
                <>
                  <span className="font-black">STATUS:</span> Running in DEBUG mode. 
                  <br />
                  <span className="opacity-70 mt-1 block italic">Firebase requests are being authorized with a local debug token. Enforcement is likely BYPASSED in dev.</span>
                </>
              )}
            </p>

            <div className="pt-2 border-t border-current/10 flex flex-wrap gap-2">
              <a 
                href="https://console.firebase.google.com/" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 bg-white/20 border border-current/20 rounded text-[8px] font-black uppercase hover:bg-white/40 transition-colors"
              >
                Firebase Console <ExternalLink className="w-2 h-2" />
              </a>
              {initError && (
                 <button 
                   onClick={() => window.location.reload()}
                   className="px-2 py-1 bg-current text-white border border-current rounded text-[8px] font-black uppercase"
                 >
                   Retry Handshake
                 </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
