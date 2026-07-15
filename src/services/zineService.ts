import { authenticatedFetch } from '../lib/api';
import { auth } from '../lib/firebase';
import type { ZineEdition, ZineLayoutId, ZineProofSnapshot, ZineStickerPlacement, ZineWorkspaceState } from '../types/zine';
import { getZinePageStickerPlacements } from '../logic/zineStickerPlacements';
import {
  runStickerAwardNonBlocking,
  STICKER_EVENT_AWARD_IDS,
  unlockStickerForUser,
} from './stickerService';

function awardCurrentUserZineSticker(source: string): void {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  runStickerAwardNonBlocking('zine_page_added', () =>
    unlockStickerForUser(
      userId,
      STICKER_EVENT_AWARD_IDS.zinePageAdded,
      source,
      'zine_page_added'
    )
  );
}

async function readZineResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || fallback);
  return payload as T;
}

export async function getCurrentZines(): Promise<ZineWorkspaceState> {
  const response = await authenticatedFetch('/api/zines/current');
  return readZineResponse<ZineWorkspaceState>(response, `Zine lookup failed with HTTP ${response.status}`);
}

export async function getZine(zineId: string): Promise<{
  zine: ZineEdition;
  candidates: ZineProofSnapshot[];
  permissions: { canEdit: boolean; canFinalize: boolean; canNominate: boolean };
}> {
  const response = await authenticatedFetch(`/api/zines/${encodeURIComponent(zineId)}`);
  const payload = await readZineResponse<{
    zine: ZineEdition;
    candidates: ZineProofSnapshot[];
    permissions: { canEdit: boolean; canFinalize: boolean; canNominate: boolean };
  }>(response, `Zine load failed with HTTP ${response.status}`);
  return {
    ...payload,
    zine: {
      ...payload.zine,
      pages: (payload.zine.pages || []).map(page => ({
        ...page,
        stickers: getZinePageStickerPlacements(page)
      })),
      finalizedPages: payload.zine.finalizedPages?.map(page => ({
        ...page,
        stickers: getZinePageStickerPlacements(page)
      }))
    }
  };
}

export async function generateZineDraft(zineId: string): Promise<ZineEdition> {
  const response = await authenticatedFetch(`/api/zines/${encodeURIComponent(zineId)}/generate`, { method: 'POST' });
  const payload = await readZineResponse<{ zine: ZineEdition }>(response, `Zine generation failed with HTTP ${response.status}`);
  return payload.zine;
}

export async function updateZinePage(zineId: string, pageId: string, update: {
  proofIds?: string[];
  layoutId?: ZineLayoutId;
  title?: string;
  caption?: string;
  stickers?: ZineStickerPlacement[];
}): Promise<void> {
  const response = await authenticatedFetch(`/api/zines/${encodeURIComponent(zineId)}/pages/${encodeURIComponent(pageId)}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
  await readZineResponse(response, `Zine page update failed with HTTP ${response.status}`);
  const contributedContent = Boolean(
    update.proofIds?.length ||
    update.stickers?.length ||
    update.title?.trim() ||
    update.caption?.trim()
  );
  if (contributedContent) {
    // Only successful content contributions qualify; layout-only edits do not.
    awardCurrentUserZineSticker(`zine_page:${zineId}:${pageId}`);
  }
}

export async function reorderZinePage(zineId: string, pageId: string, direction: -1 | 1): Promise<void> {
  const response = await authenticatedFetch(`/api/zines/${encodeURIComponent(zineId)}/pages/reorder`, {
    method: 'POST',
    body: JSON.stringify({ pageId, direction }),
  });
  await readZineResponse(response, `Zine page reorder failed with HTTP ${response.status}`);
}

export async function addOptionalZinePage(zineId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/zines/${encodeURIComponent(zineId)}/pages/optional`, { method: 'POST' });
  await readZineResponse(response, `Optional page failed with HTTP ${response.status}`);
  // Page creation is committed before the non-blocking sticker attempt begins.
  awardCurrentUserZineSticker(`zine_page:${zineId}:optional`);
}

export async function selectZineCover(zineId: string, coverId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/zines/${encodeURIComponent(zineId)}/cover`, {
    method: 'POST',
    body: JSON.stringify({ coverId }),
  });
  await readZineResponse(response, `Cover selection failed with HTTP ${response.status}`);
}

export async function nominateCrewZineProof(zineId: string, proofId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/zines/${encodeURIComponent(zineId)}/nominate`, {
    method: 'POST',
    body: JSON.stringify({ proofId }),
  });
  await readZineResponse(response, `Zine nomination failed with HTTP ${response.status}`);
}

export async function markZineReady(zineId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/zines/${encodeURIComponent(zineId)}/ready`, { method: 'POST' });
  await readZineResponse(response, `Zine review handoff failed with HTTP ${response.status}`);
}

export async function finalizeZine(zineId: string): Promise<{ alreadyFinalized: boolean }> {
  const response = await authenticatedFetch(`/api/zines/${encodeURIComponent(zineId)}/finalize`, { method: 'POST' });
  return readZineResponse(response, `Zine finalization failed with HTTP ${response.status}`);
}
