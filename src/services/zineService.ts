import { authenticatedFetch } from '../lib/api';
import type { ZineEdition, ZineLayoutId, ZineProofSnapshot, ZineWorkspaceState } from '../types/zine';

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
  return readZineResponse(response, `Zine load failed with HTTP ${response.status}`);
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
  stickerIds?: string[];
}): Promise<void> {
  const response = await authenticatedFetch(`/api/zines/${encodeURIComponent(zineId)}/pages/${encodeURIComponent(pageId)}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
  await readZineResponse(response, `Zine page update failed with HTTP ${response.status}`);
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

