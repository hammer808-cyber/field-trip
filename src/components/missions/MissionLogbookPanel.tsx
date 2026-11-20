import { AlertTriangle, CheckCircle2, ChevronDown, FileText, RotateCcw } from 'lucide-react';
import type { CanonicalProofStatus, ProofLogbookCounts } from '../../logic/proofDistribution';
import { DEFAULT_APP_SKIN } from '../../skins/registry';
import { cn } from '../../lib/utils';

/**
 * P0-2 (audit fix, Nov 19): WCAG contrast helpers. No single text color
 * clears 4.5:1 on every skin's warning/success/error/primary/secondary
 * background (e.g. white on arcade warning #f6ea38 is 1.25:1, black on
 * notebook warning #a7611d is 4.37:1), so the text color is derived from
 * the live background hex instead of hardcoded white. The higher-ratio
 * side of black/white always clears 4.5:1 — the two ratios cross at
 * ~4.58:1 — so picking the max is sufficient.
 */

/** WCAG 2.x relative luminance of a #rrggbb hex color. */
export function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(clean.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two #rrggbb hex colors. */
export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const [lighter, darker] = [relativeLuminance(foregroundHex), relativeLuminance(backgroundHex)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Black or white text on a background hex — whichever clears 4.5:1. */
export function pickTextOnBackground(backgroundHex: string): '#000000' | '#ffffff' {
  return contrastRatio('#000000', backgroundHex) >= contrastRatio('#ffffff', backgroundHex)
    ? '#000000'
    : '#ffffff';
}

/**
 * Read a skin background hex off the live CSS variable ThemeContext sets on
 * <html> (e.g. --skin-warning). Falls back to the classic skin token when
 * the variable is unset (tests, SSR, or no provider yet) — the classic
 * skin is the default, so the fallback pair is itself a passing pair.
 */
export function skinVarHex(varName: string, fallbackHex: string): string {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return fallbackHex;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallbackHex;
}

export interface MissionLogbookItem {
  id: string;
  title: string;
  status: CanonicalProofStatus;
  statusLabel: string;
  filedLabel: string;
  fieldNote: string;
  imageUrl?: string;
  adminNote?: string;
  onRetry?: () => void;
}

interface MissionLogbookPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: ProofLogbookCounts;
  items: MissionLogbookItem[];
  onOpenFullLogbook: () => void;
  className?: string;
}

/** Background class for a proof status. Text color is derived separately (P0-2) — see statusText below. */
function statusClasses(status: CanonicalProofStatus): string {
  if (status === 'approved') return 'bg-[var(--skin-success)]';
  if (status === 'needs_more_proof') return 'bg-[var(--skin-warning)]';
  if (status === 'rejected') return 'bg-[var(--skin-error)]';
  return 'bg-[var(--skin-surface-muted)]';
}

export function MissionLogbookPanel({
  open,
  onOpenChange,
  counts,
  items,
  onOpenFullLogbook,
  className,
}: MissionLogbookPanelProps) {
  const urgentCount = counts.rejectedOrNeedsMoreProof;

  // P0-2: text colors derived from the live skin backgrounds so every
  // status/urgent/retry pair clears 4.5:1 in every skin. pending_review
  // keeps the skin text color on the muted surface (already passing).
  const warningText = pickTextOnBackground(skinVarHex('--skin-warning', DEFAULT_APP_SKIN.designTokens.warning));
  const primaryText = pickTextOnBackground(skinVarHex('--skin-primary', DEFAULT_APP_SKIN.designTokens.primary));
  const statusText: Record<CanonicalProofStatus, string> = {
    approved: pickTextOnBackground(skinVarHex('--skin-success', DEFAULT_APP_SKIN.designTokens.success)),
    needs_more_proof: warningText,
    rejected: pickTextOnBackground(skinVarHex('--skin-error', DEFAULT_APP_SKIN.designTokens.error)),
    pending_review: 'var(--skin-text)',
  };

  return (
    <section className={cn('skin-card border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[var(--skin-card-shadow)]', className)}>
      <details
        id="field-log-details"
        open={open}
        onToggle={(event) => onOpenChange(event.currentTarget.open)}
        className="group"
      >
        <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)]">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[var(--skin-border)] shadow-[3px_3px_0_var(--skin-border)]',
              urgentCount > 0 ? 'bg-[var(--skin-warning)]' : 'bg-[var(--skin-secondary)] text-[var(--skin-on-secondary)]',
            )}
              style={urgentCount > 0 ? { color: warningText } : undefined}
            >
              {urgentCount > 0 ? <AlertTriangle size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[var(--skin-text-muted)]">Proof archive</p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">Logbook</h2>
                {urgentCount > 0 && (
                  <span className="border-2 border-[var(--skin-border)] bg-[var(--skin-warning)] px-2 py-0.5 font-mono text-[7px] font-black uppercase tracking-widest shadow-[2px_2px_0_var(--skin-border)]" style={{ color: warningText }}>
                    {urgentCount} need action
                  </span>
                )}
              </div>
              <p className="mt-1 truncate font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
                {counts.totalSubmitted === 0
                  ? 'No submitted field logs'
                  : `${counts.totalSubmitted} submitted · ${counts.approvedVerified} verified · ${counts.pendingReview} pending`}
              </p>
            </div>
          </div>
          <span className="flex min-h-11 min-w-11 items-center justify-center text-[var(--skin-text-muted)]">
            <ChevronDown className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>

        <div className="border-t-[3px] border-[var(--skin-border)] bg-[var(--skin-surface-muted)] p-4">
          {items.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--skin-border-muted)] bg-[var(--skin-surface)] px-4 py-8 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-[var(--skin-text-muted)]" aria-hidden="true" />
              <p className="font-display text-xl font-black uppercase italic tracking-normal text-[var(--skin-text)]">No field logs yet</p>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-[var(--skin-text-muted)]">Draw a mission and submit its receipt to start the archive.</p>
            </div>
          ) : (
            <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {items.map((item) => {
                const urgent = item.status === 'needs_more_proof' || item.status === 'rejected';
                return (
                  <article key={item.id} className={cn(
                    'grid grid-cols-[58px_minmax(0,1fr)] gap-3 border-2 bg-[var(--skin-surface)] p-2.5',
                    urgent ? 'border-[var(--skin-warning)] shadow-[3px_3px_0_var(--skin-border)]' : 'border-[var(--skin-border-muted)]',
                  )}>
                    <div className="flex h-[58px] w-[58px] items-center justify-center overflow-hidden border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)]">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : item.status === 'approved' ? (
                        <CheckCircle2 className="text-[var(--skin-success)]" aria-hidden="true" />
                      ) : (
                        <FileText className="text-[var(--skin-text-muted)]" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">{item.title}</h3>
                          <p className="mt-1 font-mono text-[7px] font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">{item.filedLabel}</p>
                        </div>
                        <span className={cn('border border-[var(--skin-border)] px-2 py-1 font-mono text-[7px] font-black uppercase tracking-wider', statusClasses(item.status))} style={{ color: statusText[item.status] }}>
                          {item.statusLabel}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs italic leading-snug text-[var(--skin-text-muted)]">“{item.fieldNote}”</p>
                      {item.adminNote && (
                        <p className="mt-2 border-l-4 border-[var(--skin-error)] bg-[var(--skin-surface-muted)] px-2 py-1.5 font-mono text-[8px] leading-relaxed text-[var(--skin-text)]">
                          <strong>Review note:</strong> {item.adminNote}
                        </p>
                      )}
                      {urgent && item.onRetry && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={item.onRetry}
                            className="skin-button flex min-h-11 items-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-primary)] px-3 py-2 font-display text-[10px] font-black uppercase italic tracking-normal shadow-[3px_3px_0_var(--skin-border)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                            style={{ color: primaryText }}
                          >
                            <RotateCcw size={14} aria-hidden="true" />
                            Retry mission
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenFullLogbook}
            className="skin-button mt-4 min-h-11 w-full border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-2.5 font-display text-xs font-black uppercase italic tracking-normal text-[var(--skin-text)] shadow-[3px_3px_0_var(--skin-border)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Open full Logbook
          </button>
        </div>
      </details>
    </section>
  );
}
