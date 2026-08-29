import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import {
  buildCrewGraphSnapshot,
  CREW_CONNECTIONS_COLLECTION,
  type CrewConnectionRecord,
  type CrewGraphSnapshot,
  type PublicPlayerIdentity,
} from '../logic/crewGraph';

async function readSocialResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || fallback);
  }
  return payload as T;
}

export async function searchPlayers(q: string): Promise<PublicPlayerIdentity[]> {
  const response = await authenticatedFetch(`/api/social/search-players?q=${encodeURIComponent(q)}`);
  const payload = await readSocialResponse<{ players: PublicPlayerIdentity[] }>(response, `Player search failed with HTTP ${response.status}`);
  return payload.players || [];
}

export async function getCommunitySpotlight(limit = 8): Promise<PublicPlayerIdentity[]> {
  const response = await authenticatedFetch(`/api/community/spotlight?limit=${encodeURIComponent(String(limit))}`);
  const payload = await readSocialResponse<{ players: PublicPlayerIdentity[] }>(response, `Community spotlight failed with HTTP ${response.status}`);
  return payload.players || [];
}

export async function getCommunityStandings(options: { limit?: number; sort?: 'xp' | 'weeklyXp' } = {}): Promise<PublicPlayerIdentity[]> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.sort) params.set('sort', options.sort);
  const response = await authenticatedFetch(`/api/community/standings?${params.toString()}`);
  const payload = await readSocialResponse<{ players: PublicPlayerIdentity[] }>(response, `Community standings failed with HTTP ${response.status}`);
  return payload.players || [];
}

export async function getPlayerPublicProfile(username: string): Promise<{
  player: PublicPlayerIdentity;
  relationship: string;
  canViewCrewActivity: boolean;
}> {
  const response = await authenticatedFetch(`/api/social/players/${encodeURIComponent(username)}`);
  return readSocialResponse(response, `Player profile failed with HTTP ${response.status}`);
}

export async function getCrewGraph(): Promise<CrewGraphSnapshot> {
  const response = await authenticatedFetch('/api/social/crew');
  return readSocialResponse<CrewGraphSnapshot>(response, `Crew graph failed with HTTP ${response.status}`);
}

export async function sendCrewRequest(target: { userId?: string; username?: string }): Promise<{ relationship: string; idempotent?: boolean }> {
  const response = await authenticatedFetch('/api/social/crew/request', {
    method: 'POST',
    body: JSON.stringify(target),
  });
  return readSocialResponse(response, `Crew request failed with HTTP ${response.status}`);
}

export async function acceptCrewRequest(peerUserId: string): Promise<{ relationship: string }> {
  const response = await authenticatedFetch('/api/social/crew/accept', {
    method: 'POST',
    body: JSON.stringify({ userId: peerUserId }),
  });
  return readSocialResponse(response, `Crew accept failed with HTTP ${response.status}`);
}

export async function declineCrewRequest(peerUserId: string): Promise<{ relationship: string }> {
  const response = await authenticatedFetch('/api/social/crew/decline', {
    method: 'POST',
    body: JSON.stringify({ userId: peerUserId }),
  });
  return readSocialResponse(response, `Crew decline failed with HTTP ${response.status}`);
}

export async function removeCrewMemberConnection(peerUserId: string): Promise<{ relationship: string }> {
  const response = await authenticatedFetch('/api/social/crew/remove', {
    method: 'POST',
    body: JSON.stringify({ userId: peerUserId }),
  });
  return readSocialResponse(response, `Crew remove failed with HTTP ${response.status}`);
}

export async function blockPlayer(peerUserId: string): Promise<{ success: boolean }> {
  const response = await authenticatedFetch('/api/social/block', {
    method: 'POST',
    body: JSON.stringify({ userId: peerUserId }),
  });
  return readSocialResponse(response, `Block player failed with HTTP ${response.status}`);
}

export function subscribeToCrewGraph(viewerUserId: string, callback: (snapshot: CrewGraphSnapshot) => void) {
  const q = query(
    collection(db, CREW_CONNECTIONS_COLLECTION),
    where('participants', 'array-contains', viewerUserId),
  );
  return onSnapshot(q, snap => {
    const connections = snap.docs.map(item => ({ id: item.id, ...item.data() } as CrewConnectionRecord));
    callback(buildCrewGraphSnapshot(viewerUserId, connections));
  }, error => {
    console.warn('[CrewGraph] subscription unavailable:', error.message);
    callback(buildCrewGraphSnapshot(viewerUserId, []));
  });
}

export function emptyCrewGraph(viewerUserId = ''): CrewGraphSnapshot {
  return buildCrewGraphSnapshot(viewerUserId, []);
}
