/**
 * FIELD TRIP Design System - Shared Class Names
 * Ensure these constants are referenced across components to keep styling consistent,
 * zine-like, bold, playful, with thick black borders and offset shadows.
 */

export const FIELD_SHADOWS = {
  offset: 'shadow-[6px_6px_0px_black]',
  offsetLg: 'shadow-[12px_12px_0px_black]',
  offsetXl: 'shadow-[24px_24px_0px_black]',
  offsetSm: 'shadow-[3px_3px_0px_black]',
  offsetOrange: 'shadow-[6px_6px_0px_var(--color-brand-orange)]',
  offsetLime: 'shadow-[6px_6px_0px_var(--color-brand-lime)]',
  offsetCyan: 'shadow-[6px_6px_0px_var(--color-brand-cyan)]',
  // Layered depth shadows
  layered: 'shadow-[4px_4px_0px_rgba(0,0,0,0.1),8px_8px_0px_black]',
  layeredOrange: 'shadow-[4px_4px_0px_rgba(255,107,0,0.2),8px_8px_0px_var(--color-brand-orange)]',
  layeredLime: 'shadow-[4px_4px_0px_rgba(191,255,0,0.2),8px_8px_0px_var(--color-brand-lime)]',
};

export const FIELD_MATERIALS = {
  paper: 'bg-[url("https://www.transparenttextures.com/patterns/handmade-paper.png")]',
  grid: 'bg-[radial-gradient(var(--color-on-surface)_1px,transparent_0)] bg-[length:24px_24px] opacity-[0.03]',
  sticker: 'relative bg-white border-2 border-on-surface shadow-[4px_4px_0px_black] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:to-transparent before:pointer-events-none',
  stickerRaised: 'shadow-[8px_8px_0px_black] -translate-y-0.5 transition-transform hover:-translate-y-1',
  patch: 'relative bg-brand-orange border-2 border-on-surface shadow-[4px_4px_0px_black] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-black/10 before:pointer-events-none rounded-sm',
  tape: 'h-4 bg-white/20 border-x border-on-surface/10 skew-x-12 relative overflow-hidden before:absolute before:inset-0 before:bg-[url("https://www.transparenttextures.com/patterns/handmade-paper.png")] before:opacity-20',
  stacked: 'relative after:absolute after:inset-0 after:bg-white after:border-b-2 after:border-r-2 after:border-on-surface after:-z-10 after:translate-x-1 after:translate-y-1',
  stackedDouble: 'relative after:absolute after:inset-0 after:bg-white after:border-b-2 after:border-r-2 after:border-on-surface after:-z-10 after:translate-x-1 after:translate-y-1 before:absolute before:inset-0 before:bg-white before:border-b-2 before:border-r-2 before:border-on-surface/50 before:-z-20 before:translate-x-2 before:translate-y-2',
};
export const FIELD_CARDS = {
  base: 'bg-white border-4 border-on-surface p-6 shadow-[6px_6px_0px_black] relative overflow-hidden transition-all duration-300',
  accentOrange: 'bg-white border-4 border-on-surface p-6 shadow-[6px_6px_0px_var(--color-brand-orange)] relative overflow-hidden transition-all duration-300',
  accentLime: 'bg-white border-4 border-on-surface p-6 shadow-[6px_6px_0px_var(--color-brand-lime)] relative overflow-hidden transition-all duration-300',
  accentCyan: 'bg-white border-4 border-on-surface p-6 shadow-[6px_6px_0px_var(--color-brand-cyan)] relative overflow-hidden transition-all duration-300',
  locked: 'bg-neutral-50/50 border-4 border-dashed border-on-surface/30 p-6 opacity-60 select-none relative overflow-hidden transition-all duration-300',
  bannerStripOrange: 'absolute top-0 left-0 right-0 h-1.5 bg-brand-orange',
  bannerStripLime: 'absolute top-0 left-0 right-0 h-1.5 bg-brand-lime',
  bannerStripCyan: 'absolute top-0 left-0 right-0 h-1.5 bg-brand-cyan',
};

export const FIELD_TYPOGRAPHY = {
  sectionHeader: 'font-outfit uppercase tracking-tight italic font-black text-on-surface leading-[0.95]',
  bureauHeader: 'font-display uppercase tracking-tight font-black italic text-4xl sm:text-5xl border-b-4 border-on-surface pb-3 mb-6',
  stickerLabel: 'inline-block bg-on-surface text-brand-lime px-3 py-1.5 border-2 border-on-surface font-black font-sans text-[10px] uppercase tracking-wider italic shadow-[2.5px_2.5px_0px_black]',
  microLabel: 'font-mono text-[9px] uppercase tracking-[0.2em] font-black text-on-surface/50 leading-none',
};
