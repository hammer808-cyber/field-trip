import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronUp, FilePlus2, Loader2, Lock, Printer, RefreshCw, Sparkles, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { ProofImage } from './ProofImage';
import type { ZineEdition, ZineKind, ZinePage, ZineProofSnapshot } from '../types/zine';
import {
  addOptionalZinePage,
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

interface ZineWorkspaceProps {
  initialKind?: ZineKind;
  showScopeSwitch?: boolean;
}

export function ZineWorkspace({ initialKind = 'personal', showScopeSwitch = true }: ZineWorkspaceProps) {
  const { profile } = useApp();
  const [kind, setKind] = useState<ZineKind>(initialKind);
  const [workspace, setWorkspace] = useState<any>(null);
  const [zine, setZine] = useState<ZineEdition | null>(null);
  const [candidates, setCandidates] = useState<ZineProofSnapshot[]>([]);
  const [permissions, setPermissions] = useState({ canEdit: false, canFinalize: false, canNominate: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const earnedStickerIds = useMemo(() => Array.from(new Set<string>([
    ...(((profile as any)?.unlockedRewards?.stickers || []) as string[]),
    ...((((profile as any)?.earnedStickers || []) as any[]).map(item => String(item.id || item))),
  ])).slice(0, 40), [profile]);

  const load = async (preferredKind = kind) => {
    setLoading(true);
    setError(null);
    try {
      const nextWorkspace = await getCurrentZines();
      setWorkspace(nextWorkspace);
      const shell = preferredKind === 'personal' ? nextWorkspace.personal : nextWorkspace.crew;
      if (!shell) {
        setZine(null);
        setCandidates([]);
        setPermissions({ canEdit: false, canFinalize: false, canNominate: false });
        return;
      }
      const detail = await getZine(shell.id);
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

  return (
    <section className="skin-zine space-y-8" aria-label="Fieldtrip zine workspace">
      <header className="border-b-4 border-on-surface pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div className="space-y-2">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-brand-orange">Season edition / {workspace?.seasonId || 'active season'}</p>
          <h2 className="font-display text-4xl sm:text-5xl font-black uppercase italic tracking-tight leading-none">
            {kind === 'personal' ? 'My Zine' : 'Crew Zine'}
          </h2>
          <p className="font-serif italic text-sm text-on-surface/65 max-w-2xl">
            Approved receipts become a structured draft. Choose moments, tighten captions, add earned stickers, then lock the edition.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showScopeSwitch && (
            <div className="inline-flex border-2 border-on-surface bg-white p-1" role="tablist" aria-label="Zine type">
              {(['personal', 'crew'] as ZineKind[]).map(item => (
                <button key={item} role="tab" aria-selected={kind === item} onClick={() => setKind(item)} className={cn('px-4 py-2 font-mono text-[10px] font-black uppercase', kind === item ? 'bg-brand-lime' : 'text-on-surface/50')}>
                  {item}
                </button>
              ))}
            </div>
          )}
          <span className="border-2 border-on-surface px-3 py-2 bg-white font-mono text-[9px] font-black uppercase">{shellStatus.replace(/_/g, ' ')}</span>
          <button type="button" title="Refresh zine" onClick={() => load(kind)} className="w-10 h-10 border-2 border-on-surface bg-white grid place-items-center"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </header>

      {error && <div className="border-2 border-red-500 bg-red-50 p-4 font-mono text-xs font-black text-red-700 uppercase">{error}</div>}

      {!zine && (
        <div className="border-4 border-dashed border-on-surface/25 bg-white min-h-[260px] flex flex-col items-center justify-center text-center p-8 gap-4">
          <Lock className="w-10 h-10 text-on-surface/30" />
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

      {zine && ['shell', 'generation_failed'].includes(zine.status) && (
        <div className="border-4 border-on-surface bg-[#FFFCEB] p-7 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-[8px_8px_0px_black]">
          <div className="space-y-2">
            <p className="font-mono text-[9px] uppercase tracking-widest opacity-55">Automatic archive ready</p>
            <h3 className="font-display text-3xl font-black uppercase italic">Generate the first draft</h3>
            <p className="font-serif italic text-sm opacity-65">{candidates.length} approved receipt{candidates.length === 1 ? '' : 's'} currently qualify. Sparse seasons still produce a usable draft.</p>
          </div>
          <button disabled={busy || !permissions.canEdit} onClick={() => run(() => generateZineDraft(zine.id))} className="bureau-btn bg-brand-lime text-on-surface disabled:opacity-40">
            <Sparkles className="w-4 h-4" /> Generate Draft
          </button>
        </div>
      )}

      {zine && displayedPages.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-y-2 border-on-surface/15 py-4">
            <div className="font-mono text-[10px] font-black uppercase">{displayedPages.length} pages / {candidates.length} eligible receipts</div>
            <div className="flex flex-wrap gap-2">
              {permissions.canEdit && zine.optionalPageCount < 2 && zine.status !== 'ready_for_review' && (
                <button disabled={busy} onClick={() => run(() => addOptionalZinePage(zine.id))} className="bureau-btn bg-white text-on-surface text-[10px]"><FilePlus2 className="w-4 h-4" /> Add Page</button>
              )}
              <button onClick={() => setPreview(value => !value)} className="bureau-btn bg-white text-on-surface text-[10px]"><BookOpen className="w-4 h-4" /> {preview ? 'Edit View' : 'Full Preview'}</button>
              <button onClick={() => window.print()} className="bureau-btn bg-white text-on-surface text-[10px]"><Printer className="w-4 h-4" /> Print / Save PDF</button>
            </div>
          </div>

          {zine.coverChoices?.length > 0 && permissions.canEdit && !preview && zine.status !== 'ready_for_review' && (
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
                earnedStickerIds={earnedStickerIds}
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
                    <p className="font-mono text-[9px] uppercase opacity-50">{zine.nominatedProofIds?.includes(candidate.entryId) ? 'Nominated' : 'Nominate moment'}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <footer className="border-4 border-on-surface bg-black text-white p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 print:hidden">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-brand-lime">Edition control</p>
              <p className="font-serif italic text-sm text-white/65">Finalization freezes proof snapshots, captions, stickers, order, and cover.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {permissions.canEdit && ['draft', 'curating'].includes(zine.status) && <button disabled={busy} onClick={() => run(() => markZineReady(zine.id))} className="bureau-btn bg-brand-cyan text-on-surface">Ready for Review</button>}
              {permissions.canFinalize && <button disabled={busy} onClick={() => run(() => finalizeZine(zine.id))} className="bureau-btn bg-brand-lime text-on-surface">Finalize Edition</button>}
              {zine.status === 'ready_for_review' && !permissions.canFinalize && <span className="font-mono text-[10px] uppercase text-white/60">Waiting for authorized curator</span>}
              {zine.status === 'finalized' && <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase text-brand-lime"><Check className="w-4 h-4" /> Edition finalized</span>}
            </div>
          </footer>
        </>
      )}
    </section>
  );
}

function ZinePagePanel({ zine, page, candidates, earnedStickerIds, canEdit, compact, busy, onRun }: {
  zine: ZineEdition;
  page: ZinePage;
  candidates: ZineProofSnapshot[];
  earnedStickerIds: string[];
  canEdit: boolean;
  compact: boolean;
  busy: boolean;
  onRun: (action: () => Promise<any>) => Promise<void>;
}) {
  const selected = page.proofSnapshots?.[0] || null;
  const imageEntry = proofImageEntry(selected);
  return (
    <article className={cn('skin-card skin-zine-page relative border-4 border-on-surface bg-[#FFFDF6] overflow-hidden', compact ? 'min-h-[480px] shadow-[8px_8px_0px_black]' : 'grid md:grid-cols-[240px_1fr]')}>
      <div className={cn('relative bg-neutral-900', compact ? 'h-72' : 'min-h-64 md:min-h-full')}>
        {imageEntry ? <ProofImage entry={imageEntry} className="absolute inset-0 w-full h-full" alt={selected?.missionTitle || page.title} /> : <div className="absolute inset-0 grid place-items-center text-center p-6 text-white/40 font-mono text-[10px] uppercase">Page waiting for a receipt</div>}
        <span className="absolute top-3 left-3 bg-brand-lime border-2 border-on-surface px-2 py-1 font-mono text-[8px] font-black uppercase">{page.order + 1} / {page.role.replace(/_/g, ' ')}</span>
      </div>
      <div className="p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="font-display text-2xl sm:text-3xl font-black uppercase italic leading-none">{page.title}</h3>
          {selected && <p className="font-mono text-[9px] uppercase opacity-45 mt-2">{selected.missionTitle} / {selected.ownerDisplayName}</p>}
        </div>
        <p className="font-serif italic text-sm text-on-surface/70 min-h-10">{page.caption || 'No caption yet.'}</p>
        {page.stickerIds.length > 0 && <div className="flex flex-wrap gap-2">{page.stickerIds.map(id => <span key={id} className="bg-brand-orange text-white border border-on-surface px-2 py-1 font-mono text-[8px] uppercase">{id}</span>)}</div>}
        {canEdit && (
          <div className="border-t-2 border-on-surface/15 pt-4 grid sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="font-mono text-[8px] font-black uppercase">Receipt</span>
              <select value={page.proofIds[0] || ''} onChange={event => onRun(() => updateZinePage(zine.id, page.id, { proofIds: event.target.value ? [event.target.value] : [] }))} className="w-full border-2 border-on-surface bg-white p-2 font-mono text-[10px]">
                <option value="">No receipt</option>
                {candidates.map(candidate => <option key={candidate.entryId} value={candidate.entryId}>{candidate.missionTitle} / {candidate.ownerDisplayName}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-mono text-[8px] font-black uppercase">Layout</span>
              <select value={page.layoutId} onChange={event => onRun(() => updateZinePage(zine.id, page.id, { layoutId: event.target.value as any }))} className="w-full border-2 border-on-surface bg-white p-2 font-mono text-[10px]">
                {LAYOUT_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <label className="sm:col-span-2 space-y-1">
              <span className="font-mono text-[8px] font-black uppercase">Caption</span>
              <textarea key={`${page.id}_${page.caption}`} defaultValue={page.caption} onBlur={event => event.target.value !== page.caption && onRun(() => updateZinePage(zine.id, page.id, { caption: event.target.value }))} className="w-full min-h-20 border-2 border-on-surface bg-white p-3 font-serif italic text-sm" maxLength={600} />
            </label>
            {earnedStickerIds.length > 0 && (
              <label className="space-y-1">
                <span className="font-mono text-[8px] font-black uppercase">Add sticker</span>
                <select defaultValue="" onChange={event => event.target.value && onRun(() => updateZinePage(zine.id, page.id, { stickerIds: Array.from(new Set([...page.stickerIds, event.target.value])) }))} className="w-full border-2 border-on-surface bg-white p-2 font-mono text-[10px]">
                  <option value="">Choose earned sticker</option>
                  {earnedStickerIds.filter(id => !page.stickerIds.includes(id)).map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </label>
            )}
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
