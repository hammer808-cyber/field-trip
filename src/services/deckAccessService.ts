import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import { DeckPack } from '../types/deckPacks';

export type DeckAccessConfig = Partial<DeckPack> & {
  packId: string;
  id?: string;
  updatedAt?: any;
};

export function subscribeToDeckAccessConfigs(callback: (configs: Record<string, DeckAccessConfig>) => void) {
  let cancelled = false;
  authenticatedFetch('/api/decks/access-configs')
    .then(async response => {
      if (!response.ok) throw new Error(`Deck access config fetch failed (${response.status})`);
      return response.json();
    })
    .then(payload => {
      if (cancelled) return;
      const configs: Record<string, DeckAccessConfig> = {};
      (payload.decks || []).forEach((data: DeckAccessConfig) => {
        const id = data.packId || data.deckId || data.id;
        if (id) configs[id] = { ...data, id, packId: id };
      });
      callback(configs);
    })
    .catch(error => {
      if (!cancelled) {
        console.warn('[deckAccessService] Failed to load deck configs:', error);
        callback({});
      }
    });
  return () => {
    cancelled = true;
  };
}

export function mergeDeckAccessConfigs(packs: DeckPack[], configs: Record<string, DeckAccessConfig>): DeckPack[] {
  return packs.map(pack => {
    const config = configs[pack.packId] || configs[pack.id || ''];
    return config ? { ...pack, ...config, packId: pack.packId, id: pack.id || pack.packId } : pack;
  });
}

export async function saveDeckAccessConfig(deckId: string, config: Partial<DeckPack>) {
  const response = await authenticatedFetch(`/api/admin/decks/${encodeURIComponent(deckId)}/access`, {
    method: 'POST',
    body: JSON.stringify(config)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Failed to save deck access config (${response.status})`);
  }
  return response.json();
}

export async function redeemDeckInvite(deckId: string, inviteCode: string) {
  const response = await authenticatedFetch('/api/decks/redeem-invite', {
    method: 'POST',
    body: JSON.stringify({ deckId, inviteCode })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Failed to redeem deck invite (${response.status})`);
  }
  return response.json();
}

export async function seedLocalDeckAccessConfig(deckId: string, config: Partial<DeckPack>) {
  await setDoc(doc(db, 'decks', deckId), {
    ...config,
    id: deckId,
    packId: deckId,
    updatedAt: serverTimestamp()
  }, { merge: true });
}
