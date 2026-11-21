import { useMemo, useState } from 'react';
import { getZineSceneStyle, MAX_SCENE_NOTE_CHARS } from '../../logic/zineScenes';
import { resolveMissionById } from '../../logic/missionResolver';
import { getDeckPackById } from '../../data/deckPacks';
import { ProofImage } from '../ProofImage';
import { ZineScenePage } from './ZineScenePage';
import { cn } from '../../lib/utils';
import type { ZinePage, ZineProofSnapshot, ZineSceneItem } from '../../types/zine';

interface ZineSceneEditorProps {
  page: ZinePage;
  candidates: ZineProofSnapshot[];
  busy: boolean;
  onSave: (items: ZineSceneItem[]) => Promise<void>;
}

function proofThumb(snapshot: ZineProofSnapshot) {
  return snapshot.mediaRef.startsWith('http') || snapshot.mediaRef.startsWith('data:')
    ? { id: snapshot.entryId, imageUrl: snapshot.mediaRef, photoUrl: snapshot.mediaRef }
    : { id: snapshot.entryId, storagePath: snapshot.mediaRef };
}

/**
 * Edit mode for a scene page: tap a slot, pick what fills it, save.
 * The layout itself is fixed by the style — only the contents change.
 */
export function ZineSceneEditor({ page, candidates, busy, onSave }: ZineSceneEditorProps) {
  const style = getZineSceneStyle(page.sceneStyleId);
  const [items, setItems] = useState<ZineSceneItem[]>(page.sceneItems || []);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSourceEntryId, setNoteSourceEntryId] = useState<string | null>(null);

  const activeSlot = useMemo(
    () => style?.slots.find(slot => slot.id === activeSlotId) || null,
    [style, activeSlotId]
  );
  const activeFill = useMemo(
    () => items.find(item => item.slotId === activeSlotId) || null,
    [items, activeSlotId]
  );
  const changed = JSON.stringify(items) !== JSON.stringify(page.sceneItems || []);

  const missions = useMemo(() => {
    const seen = new Map<string, { deckId: string; missionId: string; title: string }>();
    for (const candidate of candidates) {
      if (!candidate.missionId || !candidate.deckId) continue;
      const key = `${candidate.deckId}::${candidate.missionId}`;
      if (seen.has(key)) continue;
      seen.set(key, {
        deckId: candidate.deckId,
        missionId: candidate.missionId,
        title: resolveMissionById(candidate.missionId)?.title || candidate.missionTitle,
      });
    }
    return [...seen.values()];
  }, [candidates]);

  const noteSources = useMemo(
    () => candidates.filter(candidate => candidate.fieldNote.trim()),
    [candidates]
  );

  if (!style) return null;

  const assign = (item: ZineSceneItem | null) => {
    if (!activeSlot) return;
    setItems(current => {
      const rest = current.filter(entry => entry.slotId !== activeSlot.id);
      return item ? [...rest, item] : rest;
    });
  };

  const openSlot = (slotId: string) => {
    const slot = style.slots.find(entry => entry.id === slotId);
    if (!slot) return;
    setActiveSlotId(slotId);
    const fill = items.find(entry => entry.slotId === slotId);
    setNoteDraft(fill?.kind === 'note' ? fill.noteText || '' : '');
    setNoteSourceEntryId(fill?.kind === 'note' ? fill.noteSourceEntryId || null : null);
  };

  return (
    <div className="space-y-4">
      <ZineScenePage
        page={{ ...page, sceneItems: items }}
        candidates={candidates}
        onSlotClick={openSlot}
        activeSlotId={activeSlotId}
      />

      {activeSlot && (
        <div className="border-2 border-on-surface bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs font-black uppercase">
              Slot {activeSlot.id} — {activeSlot.kind === 'proof' ? 'photo' : activeSlot.kind}
            </p>
            <button type="button" onClick={() => setActiveSlotId(null)} className="font-mono text-xs font-black uppercase underline">Close</button>
          </div>

          {activeFill && (
            <button
              type="button"
              disabled={busy}
              onClick={() => assign(null)}
              className="border-2 border-on-surface bg-white px-3 py-2 font-mono text-xs font-black uppercase disabled:opacity-40"
            >
              Remove what's here
            </button>
          )}

          {activeSlot.kind === 'proof' && (
            candidates.length === 0 ? (
              <p className="font-serif italic text-sm text-on-surface/60">No approved receipts in this season yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {candidates.map(candidate => (
                  <button
                    key={candidate.entryId}
                    type="button"
                    disabled={busy}
                    onClick={() => assign({ slotId: activeSlot.id, kind: 'proof', proofEntryId: candidate.entryId })}
                    className={cn('border-2 text-left disabled:opacity-40', activeFill?.proofEntryId === candidate.entryId ? 'border-brand-orange' : 'border-on-surface/25')}
                  >
                    <ProofImage entry={proofThumb(candidate)} className="w-full aspect-square" alt={candidate.missionTitle} />
                    <span className="block p-2 font-mono text-xs font-black uppercase truncate">{candidate.missionTitle}</span>
                  </button>
                ))}
              </div>
            )
          )}

          {activeSlot.kind === 'mission' && (
            missions.length === 0 ? (
              <p className="font-serif italic text-sm text-on-surface/60">No missions played in this season yet.</p>
            ) : (
              <div className="space-y-2">
                {missions.map(mission => (
                  <button
                    key={`${mission.deckId}::${mission.missionId}`}
                    type="button"
                    disabled={busy}
                    onClick={() => assign({ slotId: activeSlot.id, kind: 'mission', deckId: mission.deckId, missionId: mission.missionId })}
                    className={cn('w-full border-2 p-3 text-left disabled:opacity-40', activeFill?.missionId === mission.missionId ? 'border-brand-orange' : 'border-on-surface/25')}
                  >
                    <span className="block font-mono text-xs font-black uppercase opacity-60">{getDeckPackById(mission.deckId)?.packName || mission.deckId}</span>
                    <span className="block font-display font-black uppercase italic">{mission.title}</span>
                  </button>
                ))}
              </div>
            )
          )}

          {activeSlot.kind === 'note' && (
            <div className="space-y-3">
              <label className="space-y-1 block">
                <span className="font-mono text-xs font-black uppercase">Write a field note</span>
                <textarea
                  value={noteDraft}
                  onChange={event => { setNoteDraft(event.target.value); setNoteSourceEntryId(null); }}
                  className="w-full min-h-20 border-2 border-on-surface bg-white p-3 font-serif italic text-sm"
                  maxLength={MAX_SCENE_NOTE_CHARS}
                  placeholder="What should this page remember?"
                />
                <span className="font-mono text-xs uppercase opacity-50">{noteDraft.length} / {MAX_SCENE_NOTE_CHARS}</span>
              </label>
              {noteSources.length > 0 && (
                <label className="space-y-1 block">
                  <span className="font-mono text-xs font-black uppercase">Or use a proof's note</span>
                  <select
                    value={noteSourceEntryId || ''}
                    onChange={event => {
                      const source = noteSources.find(entry => entry.entryId === event.target.value);
                      if (source) { setNoteDraft(source.fieldNote.slice(0, MAX_SCENE_NOTE_CHARS)); setNoteSourceEntryId(source.entryId); }
                    }}
                    className="w-full border-2 border-on-surface bg-white p-2 font-mono text-xs"
                  >
                    <option value="">Pick a receipt's note…</option>
                    {noteSources.map(source => (
                      <option key={source.entryId} value={source.entryId}>
                        {source.missionTitle} — {source.fieldNote.slice(0, 60)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                disabled={busy || !noteDraft.trim()}
                onClick={() => assign({ slotId: activeSlot.id, kind: 'note', noteText: noteDraft.trim().slice(0, MAX_SCENE_NOTE_CHARS), noteSourceEntryId })}
                className="border-2 border-on-surface bg-brand-lime px-3 py-2 font-mono text-xs font-black uppercase disabled:opacity-40"
              >
                Place note
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !changed}
          onClick={() => onSave(items)}
          className="border-2 border-on-surface bg-brand-lime px-4 py-2 font-mono text-xs font-black uppercase disabled:opacity-40"
        >
          Save scene
        </button>
        <button
          type="button"
          disabled={busy || !changed}
          onClick={() => { setItems(page.sceneItems || []); setActiveSlotId(null); }}
          className="border-2 border-on-surface bg-white px-4 py-2 font-mono text-xs font-black uppercase disabled:opacity-40"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
