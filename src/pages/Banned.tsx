import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { FieldButton, PlayerPageBody, PlayerPageShell } from '../components/player';

export default function Banned() {
  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  return (
    <PlayerPageShell department="utility" className="min-h-screen bg-paper">
      <PlayerPageBody className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl border-4 border-on-surface bg-white p-6 shadow-[8px_8px_0px_#c52233] sm:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center border-4 border-on-surface bg-error text-white shadow-[4px_4px_0px_black]">
              <ShieldAlert className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-on-surface/45">Account closed</p>
              <h1 className="mt-1 font-display text-4xl font-black uppercase italic leading-none">Access revoked</h1>
            </div>
          </div>

          <p className="mt-5 font-sans text-sm font-bold leading-relaxed text-on-surface/80">
            Fieldtrip HQ closed this invitation. That usually happens after a serious safety issue, illegal trespassing, or harmful submissions.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="border-2 border-on-surface/15 bg-paper p-4">
              <p className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/45">
                <Mail className="h-4 w-4" aria-hidden="true" /> Support
              </p>
              <p className="mt-1 text-sm font-bold">support@fieldtrip.zone</p>
            </div>
            <div className="border-2 border-on-surface/15 bg-paper p-4">
              <p className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/45">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Status
              </p>
              <p className="mt-1 text-sm font-bold">Permanent suspension</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <FieldButton variant="destructive" className="flex-1" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </FieldButton>
            <a
              href="mailto:support@fieldtrip.zone"
              className="inline-flex min-h-11 flex-1 items-center justify-center border-2 border-on-surface bg-white px-4 font-display text-sm font-black uppercase italic shadow-[3px_3px_0_black]"
            >
              Email support
            </a>
          </div>
        </motion.div>
      </PlayerPageBody>
    </PlayerPageShell>
  );
}
