import type { FieldTypeId } from '../../constants/fieldTypes';
import { FIELD_TYPES } from '../../constants/fieldTypes';
import { CompanionAvatar } from '../CompanionAvatar';

interface BasecampCompanionBlockProps {
  fieldType: FieldTypeId | null;
  onOpen: () => void;
}

/**
 * Home-screen presence for the quiz persona (Tier 1 companion, Nov 20,
 * 2026): spotlight avatar with idle bob, persona name + short label, one
 * vibe line. Tap opens the Profile field-type section. Hidden when the
 * player is unclassified.
 */
export function BasecampCompanionBlock({ fieldType, onOpen }: BasecampCompanionBlockProps) {
  const type = fieldType && fieldType !== 'unclassified' ? FIELD_TYPES[fieldType] : null;
  if (!type) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${type.name} — ${type.shortLabel}. Open your explorer type on your profile.`}
      className="flex w-full items-center gap-4 border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-3 text-left shadow-[4px_4px_0_var(--skin-border)] transition-all hover:shadow-[6px_6px_0_var(--skin-border)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)]"
    >
      <CompanionAvatar size="spotlight" mood="idle" fieldType={fieldType} />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">
          {type.name} — {type.shortLabel}
        </span>
        <span className="mt-1 block font-sans text-sm font-bold leading-snug text-[var(--skin-text-muted)]">
          {type.vibe}
        </span>
      </span>
      <span className="shrink-0 font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text)]">
        Profile →
      </span>
    </button>
  );
}
