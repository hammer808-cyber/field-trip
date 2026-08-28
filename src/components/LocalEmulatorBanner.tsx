import { shouldUseClientFirebaseEmulators } from '../lib/firebaseEmulators';

export function LocalEmulatorBanner() {
  const enabled = shouldUseClientFirebaseEmulators({
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    MODE: import.meta.env.MODE,
    VITE_USE_FIREBASE_EMULATORS: import.meta.env.VITE_USE_FIREBASE_EMULATORS,
  });
  if (!enabled) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none flex justify-center"
      aria-live="polite"
    >
      <div className="mt-2 px-3 py-1 bg-brand-orange text-white text-[10px] font-mono font-black uppercase tracking-[0.2em] border-2 border-on-surface shadow-[3px_3px_0px_black]">
        Local emulator
      </div>
    </div>
  );
}
