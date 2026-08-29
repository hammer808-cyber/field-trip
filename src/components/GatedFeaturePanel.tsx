import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStarterProgress } from '../services/canonicalProgress';
import { useApp } from '../context/AppContext';

export type GatedFeatureName = 'Voting' | 'Dex' | 'Big Board' | 'Loteria' | 'Crew';

interface GatedFeaturePanelProps {
  featureName: GatedFeatureName;
  primaryHref?: string;
  primaryLabel?: string;
}

export function GatedFeaturePanel({
  featureName,
  primaryHref = '/missions',
  primaryLabel = 'Back to Missions',
}: GatedFeaturePanelProps) {
  const navigate = useNavigate();
  const { canonicalProgress } = useApp();
  const starter = getStarterProgress(canonicalProgress);
  const approved = starter.starterApprovedCount;
  const required = starter.starterRequiredCount;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4" data-testid="gated-feature-panel">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-[8px] border-on-surface bg-white p-6 text-center shadow-[14px_14px_0px_rgba(0,0,0,1)] sm:p-8">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-on-surface bg-brand-magenta text-white shadow-[4px_4px_0px_black]">
          <Lock className="h-10 w-10 stroke-[2.5]" aria-hidden="true" />
        </div>
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-on-surface/45">
          Locked for now
        </p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase italic leading-none tracking-tight">
          Finish Starter Missions to unlock {featureName}
        </h1>
        <p className="mx-auto mt-4 max-w-sm font-serif italic text-on-surface/70">
          {approved} of {required} Starter Signals approved.
        </p>
        <div className="mx-auto mt-5 h-5 w-full max-w-xs overflow-hidden rounded-full border-2 border-on-surface bg-white shadow-[3px_3px_0px_black]">
          <div
            className="h-full bg-brand-lime"
            style={{ width: `${Math.min(100, Math.max(0, (approved / required) * 100))}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => navigate(primaryHref)}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 border-4 border-on-surface bg-brand-lime px-4 py-3 font-display text-lg font-black uppercase italic shadow-[5px_5px_0px_black] active:translate-y-1 active:shadow-none"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
