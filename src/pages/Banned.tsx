import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Banned() {
  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6 text-white font-mono">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full border-2 border-error p-8 space-y-6 bg-error/5 relative overflow-hidden"
      >
        {/* Background Glitch Effect */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>

        <div className="flex items-center gap-4 text-error relative">
          <div className="w-12 h-12 bg-error/20 flex items-center justify-center rounded-full border border-error/50">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Access_Revoked</h1>
            <p className="text-[10px] font-bold opacity-60 tracking-[0.2em] mt-1">CODE: ACCOUNT_CLOSED_03</p>
          </div>
        </div>

        <div className="space-y-4 relative">
          <div className="bg-black/60 p-6 border-l-4 border-error">
            <p className="text-sm leading-relaxed opacity-90">
              Your invitation has been revoked by Fieldtrip HQ. This usually occurs due to severe safety violations, illegal trespassing, or submission of harmful artifacts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 opacity-40">
                <Mail className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Support_Channel</span>
              </div>
              <p className="text-xs font-bold text-error">support@fieldtrip.zone</p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 opacity-40">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Status</span>
              </div>
              <p className="text-xs font-bold text-white">PERMANENT_SUSPENSION</p>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 relative">
          <button 
            onClick={handleSignOut}
            className="flex-1 bureau-btn bg-error text-white hover:bg-error/90 flex items-center justify-center gap-2 py-4"
          >
            <LogOut className="w-4 h-4" />
            SIGN OUT
          </button>
          <a 
            href="mailto:support@fieldtrip.zone"
            className="flex-1 bureau-btn border-2 border-white/20 text-white hover:bg-white/5 flex items-center justify-center gap-2 py-4"
          >
            SUBMIT_APPEAL
          </a>
        </div>

        <div className="pt-6 border-t border-white/5 flex justify-between items-center opacity-30">
          <span className="text-[8px] font-mono uppercase tracking-widest leading-none">Security_Audit: Fail</span>
          <span className="text-[8px] font-mono leading-none">©2026 Fieldtrip HQ</span>
        </div>
      </motion.div>
    </div>
  );
}
