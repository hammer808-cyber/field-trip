import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronUp, FilePlus2, Loader2, Lock, Plus, Printer, RefreshCw, Sparkles, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StarterGate } from './StarterGate';
import { cn } from '../lib/utils';
import { ProofImage } from './ProofImage';
import { ZineStickerLayer } from './zine/ZineStickerLayer';
import { ZineStickerPicker } from './zine/ZineStickerPicker';
import { ZineScenePage } from './zine/ZineScenePage';
import { ZineSceneEditor } from './zine/ZineSceneEditor';
import { ZINE_SCENE_STYLES } from '../logic/zineScenes';
import { getEventById, getSeasonById, type SeasonId } from '../data/seasons';
import { getStickerById, type StickerDefinition } from '../data/stickers';
import { getZinePageStickerPlacements } from '../logic/zineStickerPlacements';
import type { ZineEdition, ZineKind, ZinePage, ZineProofSnapshot } from '../types/zine';
import { getUserUnlockedStickers } from '../services/stickerService';
import {
  addOptionalZinePage,
  addScenePage,
  finalizeZine,
  generateZineDraft,
  getCurrentZines,
  getZine,
  markZineReady,
  nominateCrewZineProof,
  reorderZinePage,
  selectZineCover,
  updateZinePage,
} from '../services/zineService';

const LAYOUT_OPTIONS = [
  ['single_receipt', 'Single receipt'],
  ['split_receipts', 'Split receipts'],
  ['timeline_strip', 'Timeline strip'],
  ['sticker_sheet', 'Sticker sheet'],
  ['quote_page', 'Field note'],
  ['closing_card', 'Closing card'],
] as const;

function proofImageEntry(snapshot?: ZineProofSnapshot | null) {
  if (!snapshot) return null;
  return snapshot.mediaRef.startsWith('http') || snapshot.mediaRef.startsWith('data:')
    ? { id: snapshot.entryId, imageUrl: snapshot.mediaRef, photoUrl: snapshot.mediaRef }
    : { id: snapshot.entryId, storagePath: snapshot.mediaRef };
}

function seasonDisplayName(seasonId: string): string {
  const event = getEventById(seasonId);
  if (event) return event.name;
  if (['spring', 'summer', 'fall', 'winter'].includes(seasonId)) return getSeasonById(seasonId as SeasonId).name;
  return seasonId.replace(/-/g, ' ');
}

function formatOpenDate(iso: string | null): string {
  if (!iso) return 'soon';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });
}

interface ZineWorkspaceProps {
  initialKind?: ZineKind;
  showScopeSwitch?: boolean;
}

function ZineWorkspaceInner({ initialKind = 'personal', showScopeSwitch = true }: ZineWorkspaceProps) {
  const { user } = useApp();
  const [kind, setKind] = useState<ZineKind>(initialKind);
  const [workspace, setWorkspace] = useState<any>(null);
  const [zine, setZine] = useState<ZineEdition | null>(null);
  const [candidates, setCandidates] = useState<ZineProofSnapshot[]>([]);
  const [permissions, setPermissions] = useState({ canEdit: false, canFinalize: false, canNominate: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [unlockedStickers, setUnlockedStickers] = useState<StickerDefinition[]>([]);
  const [viewingPastId, setViewingPastId] = useState<string | null>(null);
  const [sceneStyleChoice, setSceneStyleChoice] = useState('vintage_nostalgia');

  useEffect(() => {
    let isCurrent = true;
    if (!user?.uid) {
      setUnlockedStickers([]);
      return () => {
        isCurrent = false;
      };
    }
    void getUserUnlockedStickers(user.uid).then(records => {
      if (!isCurrent) return;
      setUnlockedStickers(records
        .map(record => getStickerById(record.stickerId))
        .filter((sticker): sticker is StickerDefinition => Boolean(sticker)));
    });
    return () => {
      isCurrent = false;
    };
  }, [user?.uid]);

  const load = async (preferredKind = kind, pastId: string | null = viewingPastId) => {
    setLoading(true);
    setError(null);
    try {
      const nextWorkspace = await getCurrentZines();
      setWorkspace(nextWorkspace);
      const shell = pastId ? null : (preferredKind === 'personal' ? nextWorkspace.personal : nextWorkspace.crew);
      if (!shell && !pastId) {
        setZine(null);
        setCandidates([]);
        setPermissions({ canEdit: false, canFinalize: false, canNominate: false });
        return;
      }
      const detail = await getZine(pastId || shell!.id);
      setZine(detail.zine);
      setCandidates(detail.candidates);
      setPermissions(detail.permissions);
    } catch (err: any) {
      setError(err?.message || 'Zine workspace could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(kind);
  }, [kind]);

  const run = async (action: () => Promise<any>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load(kind);
    } catch (err: any) {
      setError(err?.message || 'Zine update failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="min-h-[320px] flex items-center justify-center gap-3 font-mono text-xs uppercase"><Loader2 className="w-5 h-5 animate-spin" /> Assembling edition</div>;
  }

  const shellStatus = zine?.status || 'unavailable';
  const displayedPages = zine?.status === 'finalized' && zine.finalizedPages?.length ? zine.finalizedPages : zine?.pages || [];
  // Season-end gate (Nov 21, 2026): the active season's zine stays
  // locked until the season ends; admins preview early. Past seasons
  // are already ended, so a past zine is always editable.
  const seasonLocked = !!workspace?.season && !workspace.season.ended && !workspace.isAdmin && !viewingPastId;
  const canMutate = permissions.canEdit && !seasonLocked;
  const availableSceneStyles = ZINE_SCENE_STYLES.filter(style =>
    !displayedPages.some(page => page.role === 'scene' && page.sceneStyleId === style.id)
  );
  const effectiveSceneChoice = availableSceneStyles.some(style => style.id === sceneStyleChoice)
    ? sceneStyleChoice
    : availableSceneStyles[0]?.id || '';

  return (
    <section className="skin-zine space-y-8" aria-label="Fieldtrip zine workspace">
      <header className="border-b-4 border-on-surface pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div className="space-y-2">
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Season edition / {viewingPastId ? seasonDisplayName(zine?.seasonId || workspace?.seasonId || 'active season') : seasonDisplayName(workspace?.seasonId || 'active season')}</p>
          <h2 className="font-display text-4xl sm:text-5xl font-black uppercase italic tracking-tight leading-none">
            {viewingPastId ? (zine?.kind === 'crew' ? 'Crew Zine' : 'My Zine') : (kind === 'personal' ? 'My Zine' : 'Crew Zine')}
          </h2>
          <p className="font-serif italic text-sm text-on-surface/65 max-w-2xl">
            Approved receipts become a structured draft. Build scenes, choose moments, tighten captions, add earned stickers, then lock the edition.
          </p>
          {viewingPastId && (
            <button type="button" onClick={() => { setViewingPastId(null); load(kind, null); }} className="font-mono text-xs font-black uppercase underline">← Back to current season</button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showScopeSwitch && !viewingPastId && (
            <div className="inline-flex border-2 border-on-surface bg-white p-1" role="tablist" aria-label="Zine type">
              {(['personal', 'crew'] as ZineKind[]).map(item => (
                <button key={item} role="tab" aria-selected={kind === item} onClick={() => setKind(item)} className={cn('px-4 py-2 font-mono text-xs font-black uppercase', kind === item ? 'bg-brand-lime' : 'text-on-surface/60')}>
                  {item}
                </button>
              ))}
            </div>
          )}
          <span className="border-2 border-on-surface px-3 py-2 bg-white font-mono text-xs font-black uppercase">{shellStatus.replace(/_/g, ' ')}</span>
          <button type="button" title="Refresh zine" onClick={() => load(kind)} className="w-10 h-10 border-2 border-on-surface bg-white grid place-items-center"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </header>

      {error && <div className="border-2 border-red-500 bg-red-50 p-4 font-mono text-xs font-black text-red-700 uppercase">{error}</div>}

      {workspace?.season && !workspace.season.ended && workspace.isAdmin && !viewingPastId && (
        <div className="border-2 border-on-surface bg-brand-yellow p-4 font-mono text-xs font-black uppercase">
          Admin preview — the {seasonDisplayName(workspace.seasonId)} zine opens {formatOpenDate(workspace.season.opensAt)}. You're editing early.
        </div>
      )}

      {zine && seasonLocked && (
        <div className="border-4 border-on-surface bg-[#FFFCEB] p-7 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-[8px_8px_0px_black]">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest opacity-55">Season edition locked</p>
            <h3 className="font-display text-3xl font-black uppercase italic">The {seasonDisplayName(workspace?.seasonId || '')} zine opens {formatOpenDate(workspace?.season?.opensAt || null)}</h3>
            <p className="font-serif italic text-sm opacity-65">Keep playing the season — every deck you finish and every receipt you earn will be waiting in the book when it opens.</p>
          </div>
          <Lock className="w-10 h-10 text-on-surface/60 shrink-0" />
        </div>
      )}

      {workspace?.pastZines?.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-2xl font-black uppercase italic">Past seasons</h3>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {workspace.pastZines.map((past: any) => (
              <button
                key={past.zineId}
                type="button"
                onClick={() => { setViewingPastId(past.zineId); load(kind, past.zineId); }}
                className={cn('shrink-0 border-2 border-on-surface bg-white p-3 text-left', viewingPastId === past.zineId && 'bg-brand-lime')}
              >
                <p className="font-display font-black uppercase italic">{seasonDisplayName(past.seasonId)}</p>
                <p className="font-mono text-xs uppercase opacity-50">{past.kind} / {String(past.status).replace(/_/g, ' ')}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {!zine && (
        <div className="border-4 border-dashed border-on-surface/25 bg-white min-h-[260px] flex flex-col items-center justify-center text-center p-8 gap-4">
          <Lock className="w-10 h-10 text-on-surface/60" />
          <h3 className="font-display text-3xl font-black uppercase italic">
            {kind === 'crew' ? 'Crew zine not eligible yet' : 'Personal zine not eligible yet'}
          </h3>
          <p className="font-serif italic text-sm text-on-surface/60 max-w-md">
            {kind === 'crew'
              ? 'Join an active Crew and complete Starter Signals. The first eligible member creates the seasonal shell automatically.'
              : 'Complete all three Starter Signals. Your personal seasonal shell is created automatically.'}
          </p>
        </div>
      )}

      {zine && !seasonLocked && ['shell', 'generation_failed'].includes(zine.status) && (
        <div className="border-4 border-on-surface bg-[#FFFCEB] p-7 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-[8px_8px_0px_black]">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest opacity-55">Automatic archive ready</p>
            <h3 className="font-display text-3xl font-black uppercase italic">Generate the first draft</h3>
            <p className="font-serif italic text-sm opacity-65">{candidates.length} approved receipt{candidates.length === 1 ? '' : 's'} currently qualify. Sparse seasons still produce a usable draft.</p>
          </div>
          <button disabled={busy || !permissions.canEdit} onClick={() => run(() => generateZineDraft(zine.id))} className="bureau-btn bg-brand-lime text-on-surface disabled:opacity-40">
            <Sparkles className="w-4 h-4" /> Generate Draft
          </button>
        </div>
      )}

      {zine && !seasonLocked && displayedPages.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-y-2 border-on-surface/15 py-4">
            <div className="font-mono text-xs font-black uppercase">{displayedPages.length} pages / {candidates.length} eligible receipts</div>
            <div className="flex flex-wrap gap-2">
              {canMutate && zine.optionalPageCount < 2 && zine.status !== 'ready_for_review' && (
                <button disabled={busy} onClick={() => run(() => addOptionalZinePage(zine.id))} className="bureau-btn bg-white text-on-surface text-xs"><FilePlus2 className="w-4 h-4" /> Add Page</button>
              )}
              {canMutate && availableSceneStyles.length > 0 && zine.status !== 'ready_for_review' && (
                <span className="inline-flex gap-2">
                  <select
                    value={effectiveSceneChoice}
                    onChange={event => setSceneStyleChoice(event.target.value)}
                    className="border-2 border-on-surface bg-white p-2 font-mono text-xs"
                    aria-label="Scene style"
                  >
                    {availableSceneStyles.map(style => <option key={style.id} value={style.id}>{style.name}</option>)}
                  </select>
                  <button disabled={busy || !effectiveSceneChoice} onClick={() => run(() => addScenePage(zine.id, effectiveSceneChoice as any))} className="bureau-btn bg-white text-on-surface text-xs"><Plus className="w-4 h-4" /> Add Scene</button>
                </span>
              )}
              <button onClick={() => setPreview(value => !value)} className="bureau-btn bg-white text-on-surface text-xs"><BookOpen className="w-4 h-4" /> {preview ? 'Edit View' : 'Full Preview'}</button>
              <button onClick={() => window.print()} className="bureau-btn bg-white text-on-surface text-xs"><Printer className="w-4 h-4" /> Print / Save PDF</button>
            </div>
          </div>

          {zine.coverChoices?.length > 0 && canMutate && !preview && zine.status !== 'ready_for_review' && (
            <section className="space-y-3">
              <h3 className="font-display text-2xl font-black uppercase italic">Cover</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {zine.coverChoices.map(choice => (
                  <button key={choice.id} onClick={() => run(() => selectZineCover(zine.id, choice.id))} className={cn('relative min-h-44 border-4 overflow-hidden text-left', zine.selectedCoverId === choice.id ? 'border-brand-orange shadow-[6px_6px_0px_black]' : 'border-on-surface/25')}>
                    {choice.mediaRef && <ProofImage entry={proofImageEntry({ entryId: choice.proofId || choice.id, mediaRef: choice.mediaRef } as ZineProofSnapshot)} className="absolute inset-0 w-full h-full" alt="Zine cover choice" />}
                    <span className="absolute inset-x-0 bottom-0 bg-black/80 text-white p-3 font-display font-black uppercase italic">{choice.title}</span>
                    {zine.selectedCoverId === choice.id && <span className="absolute top-2 right-2 w-8 h-8 bg-brand-lime border-2 border-on-surface grid place-items-center"><Check className="w-4 h-4" /></span>}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className={cn('grid gap-6', preview ? 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2' : 'grid-cols-1')}>
            {displayedPages.map(page => (
              <ZinePagePanel
                key={page.id}
                zine={zine}
                page={page}
                candidates={candidates}
                unlockedStickers={unlockedStickers}
                canEdit={permissions.canEdit && !preview && !['ready_for_review', 'finalized', 'archived'].includes(zine.status)}
                compact={preview}
                busy={busy}
                onRun={run}
              />
            ))}
          </div>

          {kind === 'crew' && permissions.canNominate && candidates.length > 0 && !['finalized', 'archived'].includes(zine.status) && (
            <section className="border-t-4 border-on-surface pt-6 space-y-4">
              <h3 className="font-display text-2xl font-black uppercase italic">Crew nominations</h3>
              <div className="flex gap-3 overflow-x-auto pb-3">
                {candidates.map(candidate => (
                  <button key={candidate.entryId} disabled={busy || zine.nominatedProofIds?.includes(candidate.entryId)} onClick={() => run(() => nominateCrewZineProof(zine.id, candidate.entryId))} className="shrink-0 w-48 border-2 border-on-surface bg-white p-3 text-left disabled:opacity-45">
                    <Star className="w-4 h-4 mb-2 text-brand-orange" />
                    <p className="font-display font-black uppercase truncate">{candidate.missionTitle}</p>
                    <p className="font-mono text-xs uppercase opacity-50">{zine.nominatedProofIds?.includes(candidate.entryId) ? 'Nominated' : 'Nominate moment'}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <footer className="border-4 border-on-surface bg-black text-white p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 print:hidden">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-brand-lime">Edition control</p>
              <p className="font-serif italic text-sm text-white/65">Finalization freezes proof snapshots, captions, stickers, scenes, order, and cover.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {permissions.canEdit && ['draft', 'curating'].includes(zine.status) && <button disabled={busy} onClick={() => run(() => markZineReady(zine.id))} className="bureau-btn bg-brand-cyan text-on-surface">Ready for Review</button>}
              {permissions.canFinalize && <button disabled={busy} onClick={() => run(() => finalizeZine(zine.id))} className="bureau-btn bg-brand-lime text-on-surface">Finalize Edition</button>}
              {zine.status === 'ready_for_review' && !permissions.canFinalize && <span className="font-mono text-xs uppercase text-white/60">Waiting for authorized curator</span>}
              {zine.status === 'finalized' && <span className="inline-flex items-center gap-2 font-mono text-xs uppercase text-brand-lime"><Check className="w-4 h-4" /> Edition finalized</span>}
            </div>
          </footer>
        </>
      )}
    </section>
  );
}

function ZinePagePanel({ zine, page, candidates, unlockedStickers, canEdit, compact, busy, onRun }: {
  zine: ZineEdition;
  page: ZinePage;
  candidates: ZineProofSnapshot[];
  unlockedStickers: StickerDefinition[];
  canEdit: boolean;
  compact: boolean;
  busy: boolean;
  onRun: (action: () => Promise<any>) => Promise<void>;
}) {
  const selected = page.proofSnapshots?.[0] || null;
  const imageEntry = proofImageEntry(selected);
  const stickerPlacements = useMemo(() => getZinePageStickerPlacements(page), [page]);
  if (page.role === 'scene') {
    return (
      <article className="skin-card skin-zine-page relative border-4 border-on-surface bg-[#FFFDF6] overflow-hidden">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="bg-brand-lime border-2 border-on-surface px-2 py-1 font-mono text-xs font-black uppercase">{page.order + 1} / Scene</span>
              <h3 className="font-display text-2xl sm:text-3xl font-black uppercase italic leading-none mt-2">{page.title}</h3>
              <p className="font-serif italic text-sm text-on-surface/70 mt-1">{page.caption || 'A scene you built.'}</p>
            </div>
            {canEdit && page.isFlexible && (
              <div className="flex gap-2 shrink-0">
                <button disabled={busy} title="Move page earlier" onClick={() => onRun(() => reorderZinePage(zine.id, page.id, -1))} className="w-10 h-10 border-2 border-on-surface bg-white grid place-items-center"><ChevronUp className="w-4 h-4" /></button>
                <button disabled={busy} title="Move page later" onClick={() => onRun(() => reorderZinePage(zine.id, page.id, 1))} className="w-10 h-10 border-2 border-on-surface bg-white grid place-items-center"><ChevronDown className="w-4 h-4" /></button>
              </div>
            )}
          </div>
          {canEdit ? (
            <ZineSceneEditor page={page} candidates={candidates} busy={busy} onSave={items => onRun(() => updateZinePage(zine.id, page.id, { sceneItems: items }))} />
          ) : (
            <ZineScenePage page={page} candidates={candidates} />
          )}
          {canEdit && (
            <div className="border-t-2 border-on-surface/15 pt-4">
              <ZineStickerPicker
                unlockedStickers={unlockedStickers}
                placements={stickerPlacements}
                disabled={busy}
                onChange={stickers => onRun(() => updateZinePage(zine.id, page.id, { stickers }))}
              />
            </div>
          )}
        </div>
      </article>
    );
  }
  return (
    <article className={cn('skin-card skin-zine-page relative border-4 border-on-surface bg-[#FFFDF6] overflow-hidden', compact ? 'min-h-[480px] shadow-[8px_8px_0px_black]' : 'grid md:grid-cols-[240px_1fr]')}>
      <div className={cn('relative bg-neutral-900', compact ? 'h-72' : 'min-h-64 md:min-h-full')}>
        {imageEntry ? <ProofImage entry={imageEntry} className="absolute inset-0 w-full h-full" alt={selected?.missionTitle || page.title} /> : <div className="absolute inset-0 grid place-items-center text-center p-6 text-white/40 font-mono text-xs uppercase">Page waiting for a receipt</div>}
        <ZineStickerLayer page={page} />
        <span className="absolute z-10 top-3 left-3 bg-brand-lime border-2 border-on-surface px-2 py-1 font-mono text-xs font-black uppercase">{page.order + 1} / {page.role.replace(/_/g, ' ')}</span>
      </div>
      <div className="p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="font-display text-2xl sm:text-3xl font-black uppercase italic leading-none">{page.title}</h3>
          {selected && <p className="font-mono text-xs uppercase opacity-45 mt-2">{selected.missionTitle} / {selected.ownerDisplayName}</p>}
        </div>
        <p className="font-serif italic text-sm text-on-surface/70 min-h-10">{page.caption || 'No caption yet.'}</p>
        {canEdit && (
          <div className="border-t-2 border-on-surface/15 pt-4 grid sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="font-mono text-xs font-black uppercase">Receipt</span>
              <select value={page.proofIds[0] || ''} onChange={event => onRun(() => updateZinePage(zine.id, page.id, { proofIds: event.target.value ? [event.target.value] : [] }))} className="w-full border-2 border-on-surface bg-white p-2 font-mono text-xs">
                <option value="">No receipt</option>
                {candidates.map(candidate => <option key={candidate.entryId} value={candidate.entryId}>{candidate.missionTitle} / {candidate.ownerDisplayName}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-mono text-xs font-black uppercase">Layout</span>
              <select value={page.layoutId} onChange={event => onRun(() => updateZinePage(zine.id, page.id, { layoutId: event.target.value as any }))} className="w-full border-2 border-on-surface bg-white p-2 font-mono text-xs">
                {LAYOUT_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <label className="sm:col-span-2 space-y-1">
              <span className="font-mono text-xs font-black uppercase">Caption</span>
              <textarea key={`${page.id}_${page.caption}`} defaultValue={page.caption} onBlur={event => event.target.value !== page.caption && onRun(() => updateZinePage(zine.id, page.id, { caption: event.target.value }))} className="w-full min-h-20 border-2 border-on-surface bg-white p-3 font-serif italic text-sm" maxLength={600} />
            </label>
            <ZineStickerPicker
              unlockedStickers={unlockedStickers}
              placements={stickerPlacements}
              disabled={busy}
              onChange={stickers => onRun(() => updateZinePage(zine.id, page.id, { stickers }))}
            />
            {page.isFlexible && (
              <div className="flex items-end gap-2 sm:justify-end">
                <button disabled={busy} title="Move page earlier" onClick={() => onRun(() => reorderZinePage(zine.id, page.id, -1))} className="w-10 h-10 border-2 border-on-surface bg-white grid place-items-center"><ChevronUp className="w-4 h-4" /></button>
                <button disabled={busy} title="Move page later" onClick={() => onRun(() => reorderZinePage(zine.id, page.id, 1))} className="w-10 h-10 border-2 border-on-surface bg-white grid place-items-center"><ChevronDown className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// Nov 21, 2026: Zines is live (ZINES_ENABLED = true). The kill switch
// is gone — the lock now lives per season inside the workspace: a
// season's zine opens the morning after the season ends. Admins pass
// through the gate and preview early, same as before.
export function ZineWorkspace(props: ZineWorkspaceProps) {
  return (
    <StarterGate requiredFeature="zines">
      <ZineWorkspaceInner {...props} />
    </StarterGate>
  );
}
