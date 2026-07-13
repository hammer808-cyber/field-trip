import React, { useState } from 'react';
import { Check, Eye, Lock, Palette, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { AppSkin } from '../types/skin';
import { cn } from '../lib/utils';

type PreviewStyle = React.CSSProperties & Record<`--preview-${string}`, string>;

function getPreviewStyle(skin: AppSkin): PreviewStyle {
  return {
    '--preview-background': skin.designTokens.background,
    '--preview-surface': skin.designTokens.surface,
    '--preview-text': skin.designTokens.text,
    '--preview-primary': skin.designTokens.primary,
    '--preview-on-primary': skin.designTokens.onPrimary,
    '--preview-secondary': skin.designTokens.secondary,
    '--preview-border': skin.designTokens.border,
    '--preview-radius': skin.shape.cardRadius,
    '--preview-control-radius': skin.shape.controlRadius,
    '--preview-shadow': skin.effects.cardShadow,
    '--preview-heading': skin.typography.heading,
    '--preview-mono': skin.typography.mono,
    '--preview-texture': skin.assets.backgroundTexture || 'none',
  };
}

function SkinPreviewCard({
  candidate,
  isSelected,
  isPreviewing,
  isUnlocked,
  onPreview,
}: {
  candidate: AppSkin;
  isSelected: boolean;
  isPreviewing: boolean;
  isUnlocked: boolean;
  onPreview: () => void;
}) {
  return (
    <article
      className={cn(
        'skin-preview-card flex h-full flex-col text-left transition-transform',
        isPreviewing && 'ring-4 ring-[var(--skin-focus)] ring-offset-2',
        !isUnlocked && 'opacity-85'
      )}
      style={getPreviewStyle(candidate)}
      aria-label={`${candidate.name}${isSelected ? ', selected' : ''}${isUnlocked ? '' : ', locked'}`}
    >
      <div
        className="skin-preview-stage"
        data-preview-navigation={candidate.components.navigation}
        data-preview-mission-card={candidate.components.missionCard}
      >
        <div className="skin-preview-nav" aria-hidden="true">
          <span>Base</span><span>Deck</span><span>Dex</span><span>Vote</span>
        </div>
        <div className="skin-preview-mission" aria-hidden="true">
          <small>{candidate.preview.label}</small>
          <strong>{candidate.preview.sampleMissionTitle}</strong>
        </div>
        <span className="skin-preview-button" aria-hidden="true">{candidate.preview.sampleButtonLabel}</span>
      </div>

      <div className="flex flex-1 flex-col gap-4 border-t-2 border-[var(--preview-border)] bg-[var(--preview-surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-xl font-black leading-none">{candidate.name}</h4>
            <p className="mt-2 text-xs leading-relaxed opacity-70">{candidate.description}</p>
          </div>
          <span className="flex min-h-8 shrink-0 items-center gap-1 border border-current px-2 font-mono text-[8px] font-black uppercase">
            {isSelected ? <Check className="h-3 w-3" /> : isUnlocked ? <ShieldCheck className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {isSelected ? 'Selected' : isUnlocked ? 'Available' : 'Locked'}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="font-mono text-[8px] font-black uppercase opacity-55">{candidate.unlockCondition}</span>
          <button
            type="button"
            onClick={onPreview}
            className="skin-button inline-flex min-h-11 items-center justify-center gap-2 border-2 border-current bg-[var(--preview-primary)] px-4 font-mono text-[9px] font-black uppercase text-[var(--preview-on-primary)] shadow-[2px_2px_0_var(--preview-border)]"
            aria-pressed={isPreviewing}
          >
            <Eye className="h-4 w-4" />
            {isPreviewing ? 'Previewing' : 'Preview'}
          </button>
        </div>
      </div>
    </article>
  );
}

export function SkinSelector() {
  const {
    skin,
    allSkins,
    settings,
    isAdmin,
    selectedSkinId,
    previewSkinId,
    previewSkin,
    applyPreview,
    cancelPreview,
    resetSkin,
    canUseSkin,
    frankieMode,
    setFrankieMode,
  } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const previewedSkin = previewSkinId ? allSkins.find((candidate) => candidate.id === previewSkinId) : null;
  const previewCanApply = previewSkinId ? canUseSkin(previewSkinId) : false;
  const selectionDisabled = settings?.userSkinSelectionEnabled === false;

  const handleApply = async () => {
    try {
      await applyPreview();
      setMessage('Skin applied and saved.');
    } catch (error: any) {
      setMessage(error?.message || 'Skin could not be applied.');
    }
  };

  const handleReset = async () => {
    try {
      await resetSkin();
      setMessage('Default skin restored.');
    } catch (error: any) {
      setMessage(error?.message || 'Default skin could not be restored.');
    }
  };

  return (
    <div className="space-y-8">
      <section className="skin-card border-2 border-on-surface bg-white p-5 shadow-[5px_5px_0px_black]" aria-labelledby="skin-selector-title">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-orange">Application appearance</p>
            <h3 id="skin-selector-title" className="font-display text-3xl font-black leading-none">Choose a Field Kit</h3>
            <p className="mt-2 max-w-lg text-sm text-on-surface/65">
              Preview changes the app temporarily. Apply saves it to your account.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="skin-button inline-flex min-h-11 items-center justify-center gap-2 border-2 border-on-surface bg-white px-4 font-mono text-[9px] font-black uppercase shadow-[3px_3px_0px_black]"
          >
            <RotateCcw className="h-4 w-4" /> Reset Default
          </button>
        </div>
        {selectionDisabled && (
          <p className="mt-4 border-l-4 border-brand-orange bg-brand-orange/10 p-3 font-mono text-[9px] font-black uppercase">
            Skin selection is currently locked by an administrator. Preview remains available.
          </p>
        )}
      </section>

      {previewedSkin && (
        <section className="skin-card sticky top-3 z-30 border-2 border-on-surface bg-white p-4 shadow-[5px_5px_0px_black]" aria-live="polite">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Palette className="h-6 w-6 text-brand-orange" />
              <div>
                <p className="font-mono text-[8px] font-black uppercase tracking-widest">Temporary preview</p>
                <p className="font-display text-xl font-black leading-none">{previewedSkin.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <button
                type="button"
                onClick={cancelPreview}
                className="skin-button inline-flex min-h-11 items-center justify-center gap-2 border-2 border-on-surface bg-white px-4 font-mono text-[9px] font-black uppercase"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!previewCanApply || selectionDisabled}
                className="skin-button inline-flex min-h-11 items-center justify-center gap-2 border-2 border-on-surface bg-brand-orange px-4 font-mono text-[9px] font-black uppercase text-white shadow-[3px_3px_0px_black] disabled:cursor-not-allowed disabled:opacity-45"
                title={!previewCanApply ? 'Unlock this skin before applying it.' : undefined}
              >
                {previewCanApply ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {previewCanApply ? 'Apply' : 'Locked'}
              </button>
            </div>
          </div>
        </section>
      )}

      {message && <p className="skin-state-panel border-l-4 border-brand-cyan bg-white p-3 text-sm" role="status">{message}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {allSkins.filter((candidate) => (
          isAdmin ? candidate.status !== 'archived' : candidate.status === 'active'
        )).map((candidate) => (
          <SkinPreviewCard
            key={candidate.id}
            candidate={candidate}
            isSelected={selectedSkinId === candidate.id}
            isPreviewing={skin.id === candidate.id && previewSkinId === candidate.id}
            isUnlocked={canUseSkin(candidate.id)}
            onPreview={() => {
              previewSkin(candidate.id);
              setMessage(null);
            }}
          />
        ))}
      </div>

      <section className="skin-card border-2 border-on-surface bg-white p-5 shadow-[5px_5px_0px_black]">
        <div className="flex items-center justify-between gap-5">
          <div>
            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-orange">Accessibility</p>
            <h4 className="font-display text-2xl font-black leading-none">Visual Calm</h4>
            <p className="mt-2 text-sm text-on-surface/65">Reduce decorative effects while keeping the selected skin readable.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={frankieMode}
            aria-label="Toggle Visual Calm"
            onClick={() => setFrankieMode(!frankieMode)}
            className={cn(
              'relative h-11 w-20 shrink-0 border-2 border-on-surface p-1 transition-colors',
              frankieMode ? 'bg-brand-lime' : 'bg-on-surface/10'
            )}
          >
            <span className={cn('block h-7 w-7 border-2 border-on-surface bg-white transition-transform', frankieMode && 'translate-x-9')} />
          </button>
        </div>
      </section>
    </div>
  );
}
