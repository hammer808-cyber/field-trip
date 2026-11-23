/**
 * Crew Challenges picker - inventory + deck sections (Nov 23, 2026).
 *
 * The picker pulls every playable crew card into one space inside the
 * Crew tab. "Crew card" means two kinds, kept separate so the player
 * is never misled about what pays the crew layer:
 *
 * - Crew proof cards: proofType includes 'group-confirmation'. The crew
 *   layer (+25% of base, submitted as crew) pays on these and only these.
 * - Legacy Crew Challenge cards: category/type 'Crew Challenge' from the
 *   older banks (Heatwave, Jet Setter, Errand). Crew themed, playable
 *   through the same draw and Capture path, but photo proof only, so the
 *   crew layer does not pay on them.
 *
 * Pure, no Firebase. Deck lock verdicts come from the caller's
 * getDeckAccessForPack (the same function the draw and the deck library
 * use), so a locked deck's cards show locked here exactly when the deck
 * is locked everywhere else. A time window is shown when a card carries
 * one; a location tag is shown as a layer note, never as a block.
 */
import { ALL_CHALLENGE_CARDS } from '../data/allChallengeBanks';
import { DECK_PACKS } from '../data/deckPacks';
import type { DeckAccessResult } from './deckAccess';
import { formatTimeWindow } from './timeWindow';
import type { DeckPack } from '../types/deckPacks';
import type { ChallengeCard, ProofType } from '../types/challenges';

export type CrewChallengeCard = Partial<ChallengeCard>;

/** A card whose proof needs the crew in frame. The crew layer pays. */
export function isCrewProofCard(card: CrewChallengeCard): boolean {
  return (card.proofType || []).includes('group-confirmation');
}

/** A legacy 'Crew Challenge' category card. Crew themed, photo only. */
export function isLegacyCrewChallengeCard(card: CrewChallengeCard): boolean {
  return card.category === 'Crew Challenge' || (card as any).type === 'Crew Challenge';
}

/** Either kind of crew card. */
export function isCrewCard(card: CrewChallengeCard): boolean {
  return isCrewProofCard(card) || isLegacyCrewChallengeCard(card);
}

/** Every playable crew card, split by kind. Inactive cards are excluded. */
export function getCrewChallengeCards(
  cards: readonly CrewChallengeCard[] = ALL_CHALLENGE_CARDS,
): { crewProof: CrewChallengeCard[]; legacy: CrewChallengeCard[] } {
  const playable = cards.filter(card => card.active !== false && isCrewCard(card));
  return {
    crewProof: playable.filter(isCrewProofCard),
    legacy: playable.filter(card => !isCrewProofCard(card) && isLegacyCrewChallengeCard(card)),
  };
}

const PROOF_LABELS: Record<ProofType, string> = {
  photo: 'Photo',
  note: 'Field note',
  location: 'Location',
  'group-confirmation': 'Crew in frame',
  audio: 'Voice note',
  video: 'Video',
};

/** Short proof labels for a card, e.g. ['Photo', 'Voice note', 'Crew in frame']. */
export function crewProofLabels(card: CrewChallengeCard): string[] {
  return (card.proofType || []).map(proof => PROOF_LABELS[proof] || proof);
}

/** Plain-English crew-layer line for a card. Never promises what it does not pay. */
export function crewLayerNote(card: CrewChallengeCard): string {
  if (isCrewProofCard(card)) {
    return 'Crew check-in pays +25% of base when submitted as crew.';
  }
  return 'Crew themed card. Photo proof only, so the crew layer does not pay on this one.';
}

export interface CrewChallengeRow {
  id: string;
  deckId: string;
  title: string;
  shortPrompt: string;
  difficulty: string;
  baseXP: number;
  proofLabels: string[];
  isCrewProof: boolean;
  crewLayerNote: string;
  /** Place label when the card carries one, e.g. 'Snow Summit, Big Bear Lake'. */
  locationLabel: string | null;
  /** 'Only open 6 PM-6 AM' when the card carries a time window, else null. */
  timeWindowLabel: string | null;
  /** True when the player already has an approved entry for this card. */
  completed: boolean;
}

export interface CrewChallengeDeckSection {
  deckId: string;
  deckTitle: string;
  deckCode: string;
  locked: boolean;
  /** The deck-access reason when locked, e.g. 'Coming winter 2026'. */
  lockReason: string;
  cards: CrewChallengeRow[];
}

export interface BuildCrewChallengeSectionsInput {
  cards?: readonly CrewChallengeCard[];
  packs?: readonly DeckPack[];
  /** The caller's deck-access verdict per pack (getDeckAccessForPack). */
  getAccess: (pack: DeckPack | null | undefined) => DeckAccessResult;
  /** Approved challenge ids, lowercased (completedChallengeIds). */
  completedIds?: ReadonlySet<string>;
}

/**
 * Crew cards grouped by deck, in deck catalog order. A deck the player
 * cannot see at all (visible false) is left out; a visible but locked
 * deck stays in with its cards marked locked and its access reason.
 */
export function buildCrewChallengeSections(input: BuildCrewChallengeSectionsInput): CrewChallengeDeckSection[] {
  const { cards = ALL_CHALLENGE_CARDS, packs = DECK_PACKS } = input;
  const completedIds = input.completedIds || new Set<string>();
  const { crewProof, legacy } = getCrewChallengeCards(cards);
  const all = [...crewProof, ...legacy];

  const byDeck = new Map<string, CrewChallengeCard[]>();
  for (const card of all) {
    const deckId = String(card.deckId || 'unknown');
    const list = byDeck.get(deckId) || [];
    list.push(card);
    byDeck.set(deckId, list);
  }

  const packOrder = new Map<string, number>();
  packs.forEach((pack, index) => {
    const id = String(pack.packId || pack.id || pack.deckId || '');
    if (id && !packOrder.has(id)) packOrder.set(id, index);
  });
  const deckIds = [...byDeck.keys()].sort((a, b) => {
    const orderA = packOrder.has(a) ? packOrder.get(a)! : Number.MAX_SAFE_INTEGER;
    const orderB = packOrder.has(b) ? packOrder.get(b)! : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  const sections: CrewChallengeDeckSection[] = [];
  for (const deckId of deckIds) {
    const pack = packs.find(p => String(p.packId || p.id || p.deckId || '') === deckId) || null;
    const access = input.getAccess(pack);
    if (!access.visible) continue;
    const deckCards = byDeck.get(deckId) || [];
    const rows: CrewChallengeRow[] = deckCards
      .map(card => {
        const timeWindow = (card.proofRequirements as any)?.timeWindow;
        return {
          id: String(card.id || ''),
          deckId,
          title: String(card.title || card.id || 'Untitled card'),
          shortPrompt: String((card as any).shortPrompt || (card as any).description || ''),
          difficulty: String(card.difficulty || 'easy'),
          baseXP: typeof card.baseXP === 'number' ? card.baseXP : 0,
          proofLabels: crewProofLabels(card),
          isCrewProof: isCrewProofCard(card),
          crewLayerNote: crewLayerNote(card),
          locationLabel: (card.locationTag as any)?.label ? String((card.locationTag as any).label) : null,
          timeWindowLabel: timeWindow ? `Only open ${formatTimeWindow(timeWindow)}` : null,
          completed: completedIds.has(String(card.id || '').toLowerCase()),
        };
      })
      .sort((a, b) => {
        if (a.isCrewProof !== b.isCrewProof) return a.isCrewProof ? -1 : 1;
        return a.id.localeCompare(b.id);
      });
    sections.push({
      deckId,
      deckTitle: String(pack?.title || pack?.packName || deckId),
      deckCode: String((pack as any)?.deckCode || ''),
      locked: !access.playable,
      lockReason: access.reason || 'Locked',
      cards: rows,
    });
  }
  return sections;
}
